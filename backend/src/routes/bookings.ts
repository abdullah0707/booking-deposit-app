import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { getTheBusiness } from "../lib/business.js";
import { computeAvailableSlots, type WorkingHourInput } from "../lib/availability.js";
import { getPaymentProviderByType } from "../lib/payments/index.js";
import { issueInvoiceForBooking } from "../lib/invoices.js";
import { upload } from "./uploads.js";
import { asyncHandler } from "../lib/asyncHandler.js";

export const bookingsRouter = Router();

const WEEKDAY_BY_INDEX = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
const HELD_STATUSES = ["PENDING_PAYMENT", "AWAITING_MANUAL_VERIFICATION", "CONFIRMED"] as const;

const createBookingSchema = z.object({
  serviceId: z.string().uuid(),
  paymentMethodId: z.string().uuid(),
  startsAt: z.coerce.date(),
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  customerLat: z.number().optional(),
  customerLng: z.number().optional(),
});

// Public — a customer creating a booking has no account/session.
bookingsRouter.post(
  "/bookings",
  asyncHandler(async (req, res) => {
    const parsed = createBookingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const {
      serviceId,
      paymentMethodId,
      startsAt,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      customerLat,
      customerLng,
    } = parsed.data;

    const business = await getTheBusiness();
    const service = await prisma.service.findFirst({
      where: { id: serviceId, businessId: business.id, active: true },
    });
    if (!service) return res.status(404).json({ error: "Service not found" });

    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: { id: paymentMethodId, businessId: business.id, enabled: true },
    });
    if (!paymentMethod) return res.status(400).json({ error: "Payment method not available" });

    // Only the address text is required — lat/lng are an enhancement from
    // the Maps picker when a buyer has configured GOOGLE_MAPS_API_KEY, not
    // a hard requirement. A booking-critical flow shouldn't be fully
    // blocked by an unconfigured third-party API key; the picker falls
    // back to a plain text field when no key is present, and that must
    // still be able to complete a booking.
    if (service.locationType === "CUSTOMER_ADDRESS" && !customerAddress) {
      return res.status(400).json({ error: "This service requires your address" });
    }

    const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60_000);

    // Re-validate against the availability algorithm at write time — the
    // client's slot list may be stale. The Postgres exclusion constraint on
    // Booking is still the final backstop against a race between two
    // simultaneous requests for the exact same slot.
    const date = startsAt.toISOString().slice(0, 10);
    const weekday = WEEKDAY_BY_INDEX[startsAt.getUTCDay()];
    const workingHour = await prisma.workingHour.findUnique({
      where: { businessId_weekday: { businessId: business.id, weekday } },
    });
    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59.999`);
    const [existingBookings, blockedTimes] = await Promise.all([
      prisma.booking.findMany({
        where: {
          businessId: business.id,
          status: { in: [...HELD_STATUSES] },
          startsAt: { lt: dayEnd },
          endsAt: { gt: dayStart },
        },
        select: { startsAt: true, endsAt: true },
      }),
      prisma.blockedTime.findMany({
        where: { businessId: business.id, startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } },
        select: { startsAt: true, endsAt: true },
      }),
    ]);
    const workingHourInput: WorkingHourInput | null = workingHour
      ? { startTime: workingHour.startTime, endTime: workingHour.endTime }
      : null;
    const validSlots = computeAvailableSlots({
      date,
      timezone: business.timezone,
      workingHours: workingHourInput,
      slotDurationMinutes: service.durationMinutes,
      existingBookings,
      blockedTimes,
    });
    const slotStillAvailable = validSlots.some((s) => s.startsAt.getTime() === startsAt.getTime());
    if (!slotStillAvailable) {
      return res.status(409).json({ error: "This slot is no longer available" });
    }

    let booking;
    try {
      booking = await prisma.booking.create({
        data: {
          businessId: business.id,
          serviceId: service.id,
          customerName,
          customerEmail,
          customerPhone,
          customerAddress,
          customerLat,
          customerLng,
          startsAt,
          endsAt,
          depositAmount: service.depositAmount,
          status: "PENDING_PAYMENT",
        },
      });
    } catch (err: unknown) {
      // Postgres exclusion-constraint violation — someone else took this
      // slot between our availability check and the insert.
      if (err instanceof Error && err.message.includes("no_overlap_per_business")) {
        return res.status(409).json({ error: "This slot is no longer available" });
      }
      throw err;
    }

    // MANUAL methods skip charge creation entirely — no external API call
    // can fail here, so just move the booking straight to "awaiting the
    // owner's manual confirmation" and hand back the customer-facing
    // instructions instead of a checkoutUrl.
    if (paymentMethod.type === "MANUAL") {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: "AWAITING_MANUAL_VERIFICATION",
          paymentProvider: "manual",
          paymentMethodId: paymentMethod.id,
        },
      });
      return res.status(201).json({ bookingId: booking.id, instructions: paymentMethod.config });
    }

    let checkoutUrl: string;
    try {
      const paymentProvider = getPaymentProviderByType(paymentMethod.type);
      const payment = await paymentProvider.createDepositCharge({
        bookingId: booking.id,
        amount: Number(service.depositAmount),
        currency: process.env.CURRENCY ?? "usd",
        customerEmail,
        customerName,
        customerPhone,
      });
      checkoutUrl = payment.checkoutUrl;

      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          paymentProvider: paymentProvider.name,
          paymentRef: payment.paymentRef,
          paymentMethodId: paymentMethod.id,
        },
      });
    } catch (err) {
      // The slot hold (PENDING_PAYMENT row) is still released by the
      // expiry sweep job even if payment setup fails here, so we don't
      // leave the slot stuck — just surface a clean error to the client.
      await prisma.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } });
      throw err;
    }

    res.status(201).json({ bookingId: booking.id, checkoutUrl });
  }),
);

// Public — the confirmation page polls this after the customer returns
// from the payment provider's checkout page.
bookingsRouter.get(
  "/bookings/:id",
  asyncHandler(async (req, res) => {
    const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    res.json(booking);
  }),
);

// Owner dashboard — the booking calendar/list view. Includes payment
// proofs so the manual-verification review UI can show what the customer
// submitted without a second request.
bookingsRouter.get(
  "/admin/bookings",
  requireAuth,
  asyncHandler(async (req, res) => {
    const bookings = await prisma.booking.findMany({
      where: { businessId: req.auth!.businessId },
      include: { service: true, paymentProofs: { orderBy: { submittedAt: "desc" } } },
      orderBy: { startsAt: "asc" },
    });
    res.json(bookings);
  }),
);

// Public — a customer paying via a MANUAL method submits their transfer
// screenshot (+ optional reference number) here. Reuses the same
// multer/local-disk upload plumbing as /admin/uploads. Does not itself
// change the booking's status — only the owner's confirm/reject below does,
// so "customer submitted proof" and "owner verified it" stay distinct,
// auditable steps.
bookingsRouter.post(
  "/bookings/:id/payment-proof",
  asyncHandler(async (req, res) => {
    const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.status !== "AWAITING_MANUAL_VERIFICATION") {
      return res.status(400).json({ error: "This booking is not awaiting manual payment verification" });
    }

    upload.single("file")(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const backendUrl = process.env.BACKEND_URL ?? "http://localhost:4000";
      const referenceNumber =
        typeof req.body.referenceNumber === "string" ? req.body.referenceNumber : undefined;

      const proof = await prisma.paymentProof.create({
        data: {
          bookingId: booking.id,
          imageUrl: `${backendUrl}/uploads/${req.file.filename}`,
          referenceNumber,
        },
      });
      res.status(201).json(proof);
    });
  }),
);

// Owner confirms a manual transfer after checking their bank/wallet —
// status -> CONFIRMED and invoice issuance happen in one transaction via
// the shared issueInvoiceForBooking helper (the same one the automated
// webhook appliers use), so there's exactly one place deciding "CONFIRMED
// means an invoice exists."
bookingsRouter.post(
  "/admin/bookings/:id/confirm-payment",
  requireAuth,
  asyncHandler(async (req, res) => {
    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id, businessId: req.auth!.businessId, status: "AWAITING_MANUAL_VERIFICATION" },
    });
    if (!booking) return res.status(404).json({ error: "Booking not found or not awaiting verification" });

    await prisma.$transaction(async (tx) => {
      const updated = await tx.booking.updateMany({
        where: { id: booking.id, status: "AWAITING_MANUAL_VERIFICATION" },
        data: { status: "CONFIRMED" },
      });
      if (updated.count === 1) {
        await issueInvoiceForBooking(booking.id, booking.businessId, tx);
      }
    });

    res.json({ ok: true });
  }),
);

bookingsRouter.post(
  "/admin/bookings/:id/reject-payment",
  requireAuth,
  asyncHandler(async (req, res) => {
    const reason = typeof req.body?.reason === "string" ? req.body.reason : undefined;
    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id, businessId: req.auth!.businessId, status: "AWAITING_MANUAL_VERIFICATION" },
    });
    if (!booking) return res.status(404).json({ error: "Booking not found or not awaiting verification" });

    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED", cancellationReason: reason },
    });

    res.json({ ok: true });
  }),
);

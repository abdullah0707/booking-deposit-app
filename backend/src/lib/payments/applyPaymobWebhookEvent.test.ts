import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../prisma.js";
import { applyPaymobWebhookEvent, type PaymobTransactionObj } from "./applyPaymobWebhookEvent.js";

// Same rationale as applyStripeWebhookEvent.test.ts: this exercises the
// interaction with the database's unique constraint on
// (provider, eventId), so it runs against the real local dev Postgres.

let businessId: string;
let serviceId: string;
let bookingId: string;

beforeAll(async () => {
  const business = await prisma.business.create({
    data: { name: "Paymob Webhook Test Business" },
  });
  businessId = business.id;

  const service = await prisma.service.create({
    data: {
      businessId,
      name: "Test service",
      durationMinutes: 60,
      price: 100,
      depositAmount: 20,
    },
  });
  serviceId = service.id;

  const booking = await prisma.booking.create({
    data: {
      businessId,
      serviceId,
      customerName: "Test Customer",
      customerEmail: "customer@example.com",
      startsAt: new Date("2026-09-02T09:00:00Z"),
      endsAt: new Date("2026-09-02T10:00:00Z"),
      depositAmount: 20,
      status: "PENDING_PAYMENT",
    },
  });
  bookingId = booking.id;
});

afterAll(async () => {
  await prisma.paymentWebhookEvent.deleteMany({ where: { eventId: { startsWith: "pmb_test_" } } });
  await prisma.invoice.deleteMany({ where: { businessId } });
  await prisma.booking.deleteMany({ where: { businessId } });
  await prisma.service.deleteMany({ where: { businessId } });
  await prisma.business.delete({ where: { id: businessId } });
});

function fakeSuccessfulTransaction(eventId: string): PaymobTransactionObj {
  return {
    id: eventId,
    success: true,
    amount_cents: 2000,
    extras: { bookingId },
  };
}

describe("applyPaymobWebhookEvent", () => {
  it("confirms the booking and issues invoice #1 on first delivery", async () => {
    const result = await applyPaymobWebhookEvent(fakeSuccessfulTransaction("pmb_test_1"));
    expect(result.duplicate).toBe(false);

    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(booking.status).toBe("CONFIRMED");

    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { bookingId } });
    expect(invoice.number).toBe(1);
  });

  it("is a no-op on a retried delivery of the same transaction id", async () => {
    const result = await applyPaymobWebhookEvent(fakeSuccessfulTransaction("pmb_test_1"));
    expect(result.duplicate).toBe(true);

    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(booking.status).toBe("CONFIRMED");
  });

  it("treats a different transaction id as a new delivery", async () => {
    const result = await applyPaymobWebhookEvent(fakeSuccessfulTransaction("pmb_test_2"));
    expect(result.duplicate).toBe(false);
  });

  it("does not confirm the booking when the transaction failed", async () => {
    const failedBooking = await prisma.booking.create({
      data: {
        businessId,
        serviceId,
        customerName: "Test Customer 2",
        customerEmail: "customer2@example.com",
        startsAt: new Date("2026-09-02T11:00:00Z"),
        endsAt: new Date("2026-09-02T12:00:00Z"),
        depositAmount: 20,
        status: "PENDING_PAYMENT",
      },
    });

    await applyPaymobWebhookEvent({
      id: "pmb_test_3",
      success: false,
      extras: { bookingId: failedBooking.id },
    });

    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: failedBooking.id } });
    expect(booking.status).toBe("PENDING_PAYMENT");

    const invoice = await prisma.invoice.findUnique({ where: { bookingId: failedBooking.id } });
    expect(invoice).toBeNull();
  });

  it("falls back to special_reference when extras.bookingId is absent", async () => {
    const fallbackBooking = await prisma.booking.create({
      data: {
        businessId,
        serviceId,
        customerName: "Test Customer 3",
        customerEmail: "customer3@example.com",
        startsAt: new Date("2026-09-02T13:00:00Z"),
        endsAt: new Date("2026-09-02T14:00:00Z"),
        depositAmount: 20,
        status: "PENDING_PAYMENT",
      },
    });

    await applyPaymobWebhookEvent({
      id: "pmb_test_4",
      success: true,
      special_reference: fallbackBooking.id,
    });

    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: fallbackBooking.id } });
    expect(booking.status).toBe("CONFIRMED");

    // Second invoice issued for this business — confirms the counter is
    // shared and sequential across bookings, not reset per booking.
    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { bookingId: fallbackBooking.id } });
    expect(invoice.number).toBe(2);
  });
});

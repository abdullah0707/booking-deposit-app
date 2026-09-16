import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { getTheBusiness } from "../lib/business.js";
import { computeAvailableSlots, type WorkingHourInput } from "../lib/availability.js";
import { asyncHandler } from "../lib/asyncHandler.js";

export const availabilityRouter = Router();

const WEEKDAY_BY_INDEX = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

const querySchema = z.object({
  serviceId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

availabilityRouter.get(
  "/availability",
  asyncHandler(async (req, res) => {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { serviceId, date } = parsed.data;

    const business = await getTheBusiness();
    const service = await prisma.service.findFirst({
      where: { id: serviceId, businessId: business.id, active: true },
    });
    if (!service) return res.status(404).json({ error: "Service not found" });

    const weekday = WEEKDAY_BY_INDEX[new Date(`${date}T00:00:00Z`).getUTCDay()];
    const workingHour = await prisma.workingHour.findUnique({
      where: { businessId_weekday: { businessId: business.id, weekday } },
    });

    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59.999`);

    const [existingBookings, blockedTimes] = await Promise.all([
      prisma.booking.findMany({
        where: {
          businessId: business.id,
          status: { in: ["PENDING_PAYMENT", "CONFIRMED"] },
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

    const slots = computeAvailableSlots({
      date,
      timezone: business.timezone,
      workingHours: workingHourInput,
      slotDurationMinutes: service.durationMinutes,
      existingBookings,
      blockedTimes,
    });

    res.json(slots);
  }),
);

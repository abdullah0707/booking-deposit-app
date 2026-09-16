import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { getTheBusiness } from "../lib/business.js";
import { asyncHandler } from "../lib/asyncHandler.js";

export const workingHoursRouter = Router();

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

// Public — the availability algorithm and the booking calendar UI both need this.
workingHoursRouter.get(
  "/working-hours",
  asyncHandler(async (_req, res) => {
    const business = await getTheBusiness();
    const hours = await prisma.workingHour.findMany({ where: { businessId: business.id } });
    res.json(hours);
  }),
);

const setWorkingHoursSchema = z.object({
  hours: z.array(
    z.object({
      weekday: z.enum(WEEKDAYS),
      startTime: z.string().regex(/^\d{2}:\d{2}$/),
      endTime: z.string().regex(/^\d{2}:\d{2}$/),
    }),
  ),
});

// Replaces the full week in one call — simpler for the settings screen
// than per-day endpoints, and a business's hours are edited as a whole.
workingHoursRouter.put(
  "/admin/working-hours",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = setWorkingHoursSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const businessId = req.auth!.businessId;

    await prisma.$transaction([
      prisma.workingHour.deleteMany({ where: { businessId } }),
      prisma.workingHour.createMany({
        data: parsed.data.hours.map((h) => ({ ...h, businessId })),
      }),
    ]);

    const hours = await prisma.workingHour.findMany({ where: { businessId } });
    res.json(hours);
  }),
);

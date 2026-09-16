import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { getTheBusiness } from "../lib/business.js";
import { asyncHandler } from "../lib/asyncHandler.js";

export const blockedTimesRouter = Router();

// Public — needed by the availability algorithm on the storefront/app.
blockedTimesRouter.get(
  "/blocked-times",
  asyncHandler(async (req, res) => {
    const business = await getTheBusiness();
    const { from, to } = req.query;

    const blockedTimes = await prisma.blockedTime.findMany({
      where: {
        businessId: business.id,
        ...(typeof from === "string" && typeof to === "string"
          ? { startsAt: { lt: new Date(to) }, endsAt: { gt: new Date(from) } }
          : {}),
      },
    });
    res.json(blockedTimes);
  }),
);

const blockedTimeSchema = z.object({
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  reason: z.string().optional(),
});

blockedTimesRouter.post(
  "/admin/blocked-times",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = blockedTimeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    if (parsed.data.endsAt <= parsed.data.startsAt) {
      return res.status(400).json({ error: "endsAt must be after startsAt" });
    }

    const blockedTime = await prisma.blockedTime.create({
      data: { ...parsed.data, businessId: req.auth!.businessId },
    });
    res.status(201).json(blockedTime);
  }),
);

blockedTimesRouter.delete(
  "/admin/blocked-times/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const existing = await prisma.blockedTime.findFirst({
      where: { id: req.params.id, businessId: req.auth!.businessId },
    });
    if (!existing) return res.status(404).json({ error: "Blocked time not found" });

    await prisma.blockedTime.delete({ where: { id: existing.id } });
    res.status(204).send();
  }),
);

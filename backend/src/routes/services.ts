import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { getTheBusiness } from "../lib/business.js";
import { asyncHandler } from "../lib/asyncHandler.js";

export const servicesRouter = Router();

// Public — the storefront and mobile app list active services to book.
servicesRouter.get(
  "/services",
  asyncHandler(async (_req, res) => {
    const business = await getTheBusiness();
    const services = await prisma.service.findMany({
      where: { businessId: business.id, active: true },
      orderBy: { createdAt: "asc" },
    });
    res.json(services);
  }),
);

const serviceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  durationMinutes: z.number().int().positive(),
  price: z.number().nonnegative(),
  depositAmount: z.number().nonnegative(),
  imageUrl: z.string().url().nullable().optional(),
  locationType: z.enum(["ON_SITE", "CUSTOMER_ADDRESS", "EITHER"]).optional(),
  active: z.boolean().optional(),
});

servicesRouter.post(
  "/admin/services",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = serviceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const service = await prisma.service.create({
      data: { ...parsed.data, businessId: req.auth!.businessId },
    });
    res.status(201).json(service);
  }),
);

servicesRouter.patch(
  "/admin/services/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = serviceSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const existing = await prisma.service.findFirst({
      where: { id: req.params.id, businessId: req.auth!.businessId },
    });
    if (!existing) return res.status(404).json({ error: "Service not found" });

    const service = await prisma.service.update({
      where: { id: existing.id },
      data: parsed.data,
    });
    res.json(service);
  }),
);

servicesRouter.delete(
  "/admin/services/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const existing = await prisma.service.findFirst({
      where: { id: req.params.id, businessId: req.auth!.businessId },
    });
    if (!existing) return res.status(404).json({ error: "Service not found" });

    await prisma.service.update({ where: { id: existing.id }, data: { active: false } });
    res.status(204).send();
  }),
);

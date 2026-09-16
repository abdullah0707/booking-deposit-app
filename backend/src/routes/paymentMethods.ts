import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { isProviderConfigured } from "../lib/payments/index.js";

export const paymentMethodsRouter = Router();

// Public — the checkout flow needs the enabled methods and (for MANUAL
// ones) their customer-facing instructions, without a logged-in session.
paymentMethodsRouter.get(
  "/payment-methods",
  asyncHandler(async (_req, res) => {
    const methods = await prisma.paymentMethod.findMany({
      where: { enabled: true },
      orderBy: { sortOrder: "asc" },
    });
    res.json(methods);
  }),
);

paymentMethodsRouter.get(
  "/admin/payment-methods",
  requireAuth,
  asyncHandler(async (req, res) => {
    const methods = await prisma.paymentMethod.findMany({
      where: { businessId: req.auth!.businessId },
      orderBy: { sortOrder: "asc" },
    });
    res.json(methods);
  }),
);

const createSchema = z.object({
  type: z.enum(["STRIPE", "PAYMOB", "MANUAL"]),
  label: z.string().min(1),
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

paymentMethodsRouter.post(
  "/admin/payment-methods",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { type, enabled } = parsed.data;

    // At most one STRIPE row and one PAYMOB row per business — both are
    // singly-configured via one set of env vars each. Unlimited MANUAL rows.
    if (type !== "MANUAL") {
      const existing = await prisma.paymentMethod.findFirst({
        where: { businessId: req.auth!.businessId, type },
      });
      if (existing) {
        return res.status(409).json({ error: `A ${type} payment method already exists` });
      }
      if (enabled && !isProviderConfigured(type)) {
        return res.status(400).json({ error: `Set the ${type} environment variables first` });
      }
    }

    const method = await prisma.paymentMethod.create({
      data: {
        ...parsed.data,
        businessId: req.auth!.businessId,
        config: parsed.data.config as Prisma.InputJsonValue | undefined,
      },
    });
    res.status(201).json(method);
  }),
);

const updateSchema = z.object({
  label: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

paymentMethodsRouter.patch(
  "/admin/payment-methods/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const existing = await prisma.paymentMethod.findFirst({
      where: { id: req.params.id, businessId: req.auth!.businessId },
    });
    if (!existing) return res.status(404).json({ error: "Payment method not found" });

    if (parsed.data.enabled && existing.type !== "MANUAL" && !isProviderConfigured(existing.type)) {
      return res.status(400).json({ error: `Set the ${existing.type} environment variables first` });
    }

    const method = await prisma.paymentMethod.update({
      where: { id: existing.id },
      data: { ...parsed.data, config: parsed.data.config as Prisma.InputJsonValue | undefined },
    });
    res.json(method);
  }),
);

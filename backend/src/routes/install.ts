import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { hashPassword, signToken } from "../lib/auth.js";
import { asyncHandler } from "../lib/asyncHandler.js";

export const installRouter = Router();

// Public — lets the web app know whether to show the install wizard or
// the normal app (no auth exists yet before this returns installed=true).
installRouter.get(
  "/install/status",
  asyncHandler(async (_req, res) => {
    const business = await prisma.business.findFirst();
    res.json({ installed: Boolean(business) });
  }),
);

const installSchema = z.object({
  businessName: z.string().min(1),
  defaultLanguage: z.enum(["en", "ar"]),
  timezone: z.string().min(1),
  ownerEmail: z.string().email(),
  ownerPassword: z.string().min(8),
});

// Plan §2.6 — creates the business + owner account and seeds a working
// default "home" page so the storefront isn't blank before the owner
// customizes anything. Guarded so it can only ever run once: this
// deliberately does not become a general "create another business"
// endpoint (this is a single-tenant deployment).
installRouter.post(
  "/install",
  asyncHandler(async (req, res) => {
    const alreadyInstalled = await prisma.business.findFirst();
    if (alreadyInstalled) {
      return res.status(409).json({ error: "This instance is already set up." });
    }

    const parsed = installSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { businessName, defaultLanguage, timezone, ownerEmail, ownerPassword } = parsed.data;

    const business = await prisma.business.create({
      data: { name: businessName, defaultLanguage, timezone },
    });

    const user = await prisma.user.create({
      data: {
        businessId: business.id,
        email: ownerEmail,
        passwordHash: await hashPassword(ownerPassword),
        role: "OWNER",
      },
    });

    const homePage = await prisma.page.create({
      data: { businessId: business.id, slug: "home", title: "Home" },
    });
    await prisma.section.createMany({
      data: [
        {
          pageId: homePage.id,
          type: "HERO",
          order: 0,
          contentJson: {
            title: `Book with ${businessName}`,
            subtitle: "Pick a service, choose a time, and secure it with a deposit.",
            ctaLabel: "Book now",
          },
        },
        { pageId: homePage.id, type: "CALENDAR", order: 1, contentJson: {} },
      ],
    });

    const token = signToken({ userId: user.id, businessId: business.id, role: "OWNER" });
    res.status(201).json({ token, user: { id: user.id, email: user.email, role: user.role } });
  }),
);

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { getTheBusiness } from "../lib/business.js";
import { asyncHandler } from "../lib/asyncHandler.js";

export const businessRouter = Router();

// Public — the storefront (and mobile app) need branding (name, logo,
// accent color) without a logged-in session, same rationale as the
// public GET /pages/:slug.
businessRouter.get(
  "/business",
  asyncHandler(async (_req, res) => {
    const business = await getTheBusiness();
    res.json({
      name: business.name,
      logoUrl: business.logoUrl,
      primaryColor: business.primaryColor,
    });
  }),
);

businessRouter.get(
  "/admin/business",
  requireAuth,
  asyncHandler(async (req, res) => {
    const business = await prisma.business.findUniqueOrThrow({
      where: { id: req.auth!.businessId },
    });
    res.json(business);
  }),
);

const updateBusinessSchema = z.object({
  name: z.string().min(1).optional(),
  logoUrl: z.string().url().nullable().optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex color like #C0684B")
    .nullable()
    .optional(),
});

businessRouter.patch(
  "/admin/business",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = updateBusinessSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const businessId = req.auth!.businessId;
    const previous = await prisma.business.findUniqueOrThrow({ where: { id: businessId } });

    const business = await prisma.business.update({
      where: { id: businessId },
      data: parsed.data,
    });

    // The install wizard seeds the homepage Hero with `Book with
    // ${businessName}` (in both locales — see install.ts). If the owner
    // renames the business before ever touching that Hero text
    // themselves, silently leaving the old name on their live storefront
    // is confusing — but once they've edited a language's text to
    // something else, that's their content and must not be overwritten.
    // So: only refresh the languages that still match the exact
    // auto-generated string for the old name, independently per language.
    if (parsed.data.name && parsed.data.name !== previous.name) {
      const homePage = await prisma.page.findFirst({
        where: { businessId, slug: "home", deletedAt: null },
      });
      if (homePage) {
        const hero = await prisma.section.findFirst({
          where: { pageId: homePage.id, type: "HERO", deletedAt: null },
        });
        const content = hero?.contentJson as { title?: unknown } | undefined;
        const title = content?.title;
        if (hero && title && typeof title === "object") {
          const localized = title as { en?: string; ar?: string };
          const oldDefault = `Book with ${previous.name}`;
          const newDefault = `Book with ${parsed.data.name}`;
          const nextTitle = {
            en: localized.en === oldDefault ? newDefault : localized.en,
            ar: localized.ar === oldDefault ? newDefault : localized.ar,
          };
          if (nextTitle.en !== localized.en || nextTitle.ar !== localized.ar) {
            await prisma.section.update({
              where: { id: hero.id },
              data: { contentJson: { ...content, title: nextTitle } },
            });
          }
        }
      }
    }

    res.json(business);
  }),
);

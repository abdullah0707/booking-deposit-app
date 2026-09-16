import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { asyncHandler } from "../lib/asyncHandler.js";

export const trashRouter = Router();

// Unified trash view (plan §2.4): every soft-deleted page and section,
// with how many days remain before the nightly job hard-deletes it.
trashRouter.get(
  "/admin/trash",
  requireAuth,
  asyncHandler(async (req, res) => {
    const businessId = req.auth!.businessId;

    const [pages, sections] = await Promise.all([
      prisma.page.findMany({
        where: { businessId, deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" },
      }),
      prisma.section.findMany({
        where: { page: { businessId }, deletedAt: { not: null } },
        include: { page: { select: { title: true } } },
        orderBy: { deletedAt: "desc" },
      }),
    ]);

    const daysLeft = (deletedAt: Date) => {
      const expiresAt = new Date(deletedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
      return Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
    };

    res.json({
      pages: pages.map((p) => ({ ...p, daysUntilPermanentDelete: daysLeft(p.deletedAt!) })),
      sections: sections.map((s) => ({ ...s, daysUntilPermanentDelete: daysLeft(s.deletedAt!) })),
    });
  }),
);

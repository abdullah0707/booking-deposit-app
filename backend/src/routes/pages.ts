import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { getTheBusiness } from "../lib/business.js";
import { asyncHandler } from "../lib/asyncHandler.js";

export const pagesRouter = Router();

// Public — the storefront/app fetch a page by slug to render its sections.
pagesRouter.get(
  "/pages/:slug",
  asyncHandler(async (req, res) => {
    const business = await getTheBusiness();
    const page = await prisma.page.findFirst({
      where: { businessId: business.id, slug: req.params.slug, deletedAt: null },
      include: {
        sections: {
          where: { deletedAt: null },
          orderBy: { order: "asc" },
        },
      },
    });
    if (!page) return res.status(404).json({ error: "Page not found" });
    res.json(page);
  }),
);

// Owner dashboard — the content management screen's page list (excludes trash).
pagesRouter.get(
  "/admin/pages",
  requireAuth,
  asyncHandler(async (req, res) => {
    const pages = await prisma.page.findMany({
      where: { businessId: req.auth!.businessId, deletedAt: null },
      orderBy: { order: "asc" },
      include: { _count: { select: { sections: { where: { deletedAt: null } } } } },
    });
    res.json(pages);
  }),
);

const pageSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only"),
  title: z.string().min(1),
  order: z.number().int().optional(),
});

pagesRouter.post(
  "/admin/pages",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = pageSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const existing = await prisma.page.findUnique({
      where: { businessId_slug: { businessId: req.auth!.businessId, slug: parsed.data.slug } },
    });
    if (existing && !existing.deletedAt) {
      return res.status(409).json({ error: "A page with this slug already exists" });
    }

    const page = await prisma.page.create({
      data: { ...parsed.data, businessId: req.auth!.businessId },
    });
    res.status(201).json(page);
  }),
);

pagesRouter.patch(
  "/admin/pages/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = pageSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const existing = await prisma.page.findFirst({
      where: { id: req.params.id, businessId: req.auth!.businessId },
    });
    if (!existing) return res.status(404).json({ error: "Page not found" });

    const page = await prisma.page.update({ where: { id: existing.id }, data: parsed.data });
    res.json(page);
  }),
);

// Soft delete — goes to the 30-day trash, not gone immediately. Cascades
// to the page's own sections (same timestamp) so they expire together —
// otherwise a purge 30 days later could try to hard-delete the page while
// still-active sections reference it via a foreign key.
pagesRouter.delete(
  "/admin/pages/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const existing = await prisma.page.findFirst({
      where: { id: req.params.id, businessId: req.auth!.businessId, deletedAt: null },
    });
    if (!existing) return res.status(404).json({ error: "Page not found" });

    const deletedAt = new Date();
    await prisma.$transaction([
      prisma.page.update({ where: { id: existing.id }, data: { deletedAt } }),
      prisma.section.updateMany({
        where: { pageId: existing.id, deletedAt: null },
        data: { deletedAt },
      }),
    ]);
    res.status(204).send();
  }),
);

// Restores the page and any sections that were trashed alongside it in
// the same delete (matched by identical deletedAt) — not sections the
// owner had already trashed independently beforehand, which stay in trash.
pagesRouter.post(
  "/admin/pages/:id/restore",
  requireAuth,
  asyncHandler(async (req, res) => {
    const existing = await prisma.page.findFirst({
      where: { id: req.params.id, businessId: req.auth!.businessId },
    });
    if (!existing || !existing.deletedAt) {
      return res.status(404).json({ error: "Page not found in trash" });
    }

    const [page] = await prisma.$transaction([
      prisma.page.update({ where: { id: existing.id }, data: { deletedAt: null } }),
      prisma.section.updateMany({
        where: { pageId: existing.id, deletedAt: existing.deletedAt },
        data: { deletedAt: null },
      }),
    ]);
    res.json(page);
  }),
);

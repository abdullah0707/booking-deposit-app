import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { SECTION_TYPES, validateSectionContent } from "../lib/sectionSchemas.js";

export const sectionsRouter = Router();

async function findOwnedPage(pageId: string, businessId: string) {
  return prisma.page.findFirst({ where: { id: pageId, businessId } });
}

async function findOwnedSection(sectionId: string, businessId: string) {
  return prisma.section.findFirst({
    where: { id: sectionId, page: { businessId } },
    include: { page: true },
  });
}

const createSectionSchema = z.object({
  pageId: z.string().uuid(),
  type: z.enum(SECTION_TYPES as [string, ...string[]]),
  contentJson: z.unknown(),
  order: z.number().int().optional(),
});

sectionsRouter.post(
  "/admin/sections",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = createSectionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const page = await findOwnedPage(parsed.data.pageId, req.auth!.businessId);
    if (!page) return res.status(404).json({ error: "Page not found" });

    let content;
    try {
      content = validateSectionContent(parsed.data.type, parsed.data.contentJson);
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message });
    }

    const maxOrder = await prisma.section.aggregate({
      where: { pageId: page.id, deletedAt: null },
      _max: { order: true },
    });

    const section = await prisma.section.create({
      data: {
        pageId: page.id,
        type: parsed.data.type as never,
        contentJson: content,
        order: parsed.data.order ?? (maxOrder._max.order ?? -1) + 1,
      },
    });
    res.status(201).json(section);
  }),
);

const updateSectionSchema = z.object({
  contentJson: z.unknown().optional(),
  order: z.number().int().optional(),
});

sectionsRouter.patch(
  "/admin/sections/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = updateSectionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const existing = await findOwnedSection(req.params.id, req.auth!.businessId);
    if (!existing) return res.status(404).json({ error: "Section not found" });

    let content = existing.contentJson;
    if (parsed.data.contentJson !== undefined) {
      try {
        content = validateSectionContent(existing.type, parsed.data.contentJson);
      } catch (err) {
        return res.status(400).json({ error: (err as Error).message });
      }
    }

    const section = await prisma.section.update({
      where: { id: existing.id },
      data: {
        contentJson: content as never,
        order: parsed.data.order ?? existing.order,
      },
    });
    res.json(section);
  }),
);

sectionsRouter.delete(
  "/admin/sections/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const existing = await findOwnedSection(req.params.id, req.auth!.businessId);
    if (!existing || existing.deletedAt) return res.status(404).json({ error: "Section not found" });

    await prisma.section.update({ where: { id: existing.id }, data: { deletedAt: new Date() } });
    res.status(204).send();
  }),
);

sectionsRouter.post(
  "/admin/sections/:id/restore",
  requireAuth,
  asyncHandler(async (req, res) => {
    const existing = await findOwnedSection(req.params.id, req.auth!.businessId);
    if (!existing || !existing.deletedAt) {
      return res.status(404).json({ error: "Section not found in trash" });
    }

    const section = await prisma.section.update({
      where: { id: existing.id },
      data: { deletedAt: null },
    });
    res.json(section);
  }),
);

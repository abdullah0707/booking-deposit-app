import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../lib/prisma.js";
import { purgeTrash } from "./purgeTrash.js";

let businessId: string;

beforeAll(async () => {
  const business = await prisma.business.create({ data: { name: "Purge Test Business" } });
  businessId = business.id;
});

afterAll(async () => {
  await prisma.section.deleteMany({ where: { page: { businessId } } });
  await prisma.page.deleteMany({ where: { businessId } });
  await prisma.business.delete({ where: { id: businessId } });
});

async function backdate(table: "Page" | "Section", id: string, daysAgo: number) {
  await prisma.$executeRawUnsafe(
    `UPDATE "${table}" SET "deletedAt" = NOW() - INTERVAL '${daysAgo} days' WHERE id = $1`,
    id,
  );
}

describe("purgeTrash", () => {
  it("permanently deletes a page (and its cascaded sections) past 30 days, leaves a recent one alone", async () => {
    const oldPage = await prisma.page.create({
      data: { businessId, slug: "old-page", title: "Old", deletedAt: new Date() },
    });
    const oldSection = await prisma.section.create({
      data: { pageId: oldPage.id, type: "HERO", contentJson: { title: "x" }, deletedAt: new Date() },
    });
    await backdate("Section", oldSection.id, 31);
    await backdate("Page", oldPage.id, 31);

    const recentPage = await prisma.page.create({
      data: { businessId, slug: "recent-page", title: "Recent", deletedAt: new Date() },
    });

    const result = await purgeTrash();
    expect(result.pages).toBeGreaterThanOrEqual(1);
    expect(result.sections).toBeGreaterThanOrEqual(1);

    const oldPageAfter = await prisma.page.findUnique({ where: { id: oldPage.id } });
    const oldSectionAfter = await prisma.section.findUnique({ where: { id: oldSection.id } });
    const recentPageAfter = await prisma.page.findUnique({ where: { id: recentPage.id } });

    expect(oldPageAfter).toBeNull();
    expect(oldSectionAfter).toBeNull();
    expect(recentPageAfter).not.toBeNull();
  });

  it("does not touch a page that hasn't been deleted at all", async () => {
    const activePage = await prisma.page.create({
      data: { businessId, slug: "active-page", title: "Active" },
    });

    await purgeTrash();

    const stillThere = await prisma.page.findUnique({ where: { id: activePage.id } });
    expect(stillThere).not.toBeNull();
  });
});

import { prisma } from "../lib/prisma.js";

const RETENTION_DAYS = 30;

/**
 * Permanently deletes pages/sections that have been in the trash past the
 * 30-day retention window (plan §2.4). Runs nightly — this is the only
 * thing that makes a soft-delete irreversible.
 */
export async function purgeTrash(): Promise<{ pages: number; sections: number }> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  // Sections first — a page delete would cascade-fail on foreign keys
  // otherwise if a not-yet-purged section still points at it.
  const sections = await prisma.section.deleteMany({
    where: { deletedAt: { lt: cutoff } },
  });
  const pages = await prisma.page.deleteMany({
    where: { deletedAt: { lt: cutoff } },
  });

  return { pages: pages.count, sections: sections.count };
}

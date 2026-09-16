import { z } from "zod";

/**
 * Per-section-type content schema — the bounded section library from the
 * plan (§2.4). Content is validated server-side against these before
 * save, so the dashboard can't write malformed/arbitrary JSON even
 * though each type's shape is different.
 */
export const sectionContentSchemas = {
  HERO: z.object({
    title: z.string().min(1),
    subtitle: z.string().optional(),
    ctaLabel: z.string().optional(),
  }),
  SERVICE_LIST: z.object({
    title: z.string().optional(),
  }),
  CALENDAR: z.object({}),
  CONTACT_FORM: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
  }),
  GALLERY: z.object({
    imageUrls: z.array(z.string().url()).max(20),
  }),
  PRICING: z.object({
    title: z.string().optional(),
  }),
} as const;

export type SectionType = keyof typeof sectionContentSchemas;

export const SECTION_TYPES = Object.keys(sectionContentSchemas) as SectionType[];

export function validateSectionContent(type: string, content: unknown) {
  const schema = sectionContentSchemas[type as SectionType];
  if (!schema) {
    throw new Error(`Unknown section type: ${type}`);
  }
  return schema.parse(content);
}

import { z } from "zod";

/**
 * A buyer-authored text field, kept per-locale (EN/AR) rather than a
 * single string — the admin Content editor shows both languages side by
 * side (with an optional auto-translate assist), and the public routes
 * resolve this down to one string for the requesting locale. Content
 * saved before this existed is a plain string, not one of these objects —
 * `resolveLocalizedContent` in this file is what upgrades it on read, so
 * this schema only has to describe the current write shape.
 */
const localizedText = z.object({ en: z.string().optional(), ar: z.string().optional() });
const requiredLocalizedText = z.object({ en: z.string(), ar: z.string() }).partial().refine(
  (v) => Boolean(v.en || v.ar),
  { message: "Provide at least one language" },
);

/**
 * Per-section-type content schema — the bounded section library from the
 * plan (§2.4). Content is validated server-side against these before
 * save, so the dashboard can't write malformed/arbitrary JSON even
 * though each type's shape is different.
 */
export const sectionContentSchemas = {
  HERO: z.object({
    title: requiredLocalizedText,
    subtitle: localizedText.optional(),
    ctaLabel: localizedText.optional(),
  }),
  SERVICE_LIST: z.object({
    title: localizedText.optional(),
  }),
  CALENDAR: z.object({}),
  CONTACT_FORM: z.object({
    title: localizedText.optional(),
    description: localizedText.optional(),
  }),
  GALLERY: z.object({
    imageUrls: z.array(z.string().url()).max(20),
  }),
  PRICING: z.object({
    title: localizedText.optional(),
  }),
} as const;

/** Which fields of each section type are localized text (vs. plain data
 * like Gallery's imageUrls) — used by resolveLocalizedContent below. */
const LOCALIZED_FIELDS: Record<string, string[]> = {
  HERO: ["title", "subtitle", "ctaLabel"],
  SERVICE_LIST: ["title"],
  CALENDAR: [],
  CONTACT_FORM: ["title", "description"],
  GALLERY: [],
  PRICING: ["title"],
};

/**
 * Public routes call this to collapse a section's per-locale fields down
 * to plain strings for the requested locale, so every rendering
 * component (web and mobile alike) only ever deals with the plain-string
 * shape this app has always used — the bilingual storage is an
 * admin-editor/backend concern only. Falls back to whichever locale IS
 * populated if the requested one is empty, and passes plain strings
 * (content saved before this feature existed) through unchanged.
 */
export function resolveLocalizedContent(
  type: string,
  content: Record<string, unknown>,
  locale: string,
): Record<string, unknown> {
  const fields = LOCALIZED_FIELDS[type] ?? [];
  if (fields.length === 0) return content;

  const resolved = { ...content };
  for (const field of fields) {
    const value = content[field];
    if (value && typeof value === "object") {
      const localized = value as { en?: string; ar?: string };
      resolved[field] = localized[locale as "en" | "ar"] || localized.en || localized.ar || "";
    }
    // else: already a plain string (legacy content) or missing — leave as-is
  }
  return resolved;
}

export type SectionType = keyof typeof sectionContentSchemas;

export const SECTION_TYPES = Object.keys(sectionContentSchemas) as SectionType[];

export function validateSectionContent(type: string, content: unknown) {
  const schema = sectionContentSchemas[type as SectionType];
  if (!schema) {
    throw new Error(`Unknown section type: ${type}`);
  }
  return schema.parse(content);
}

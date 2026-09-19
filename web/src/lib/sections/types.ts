export const SECTION_TYPES = [
  "HERO",
  "SERVICE_LIST",
  "CALENDAR",
  "CONTACT_FORM",
  "GALLERY",
  "PRICING",
] as const;

export type SectionType = (typeof SECTION_TYPES)[number];

export interface Section {
  id: string;
  pageId: string;
  type: SectionType;
  order: number;
  contentJson: Record<string, unknown>;
  deletedAt: string | null;
}

export interface Page {
  id: string;
  slug: string;
  title: string;
  order: number;
  deletedAt: string | null;
  sections?: Section[];
  _count?: { sections: number };
}

/** The bounded section library (plan §2.4) — this fixed set is the whole
 * point of the v1 approach: compose from known types, not an open-ended
 * page builder. */
const emptyLocalizedText = { en: "", ar: "" };

export const SECTION_LIBRARY: Record<SectionType, { defaultContent: Record<string, unknown> }> = {
  // HERO's title is the one required field across all section types (see
  // backend/src/lib/sectionSchemas.ts) — a real placeholder here means
  // "+ Hero" adds something valid and visible immediately, which the
  // owner then edits, rather than failing validation on an empty section.
  HERO: {
    defaultContent: {
      title: { en: "Welcome", ar: "أهلاً بيك" },
      subtitle: emptyLocalizedText,
      ctaLabel: emptyLocalizedText,
    },
  },
  SERVICE_LIST: { defaultContent: { title: emptyLocalizedText } },
  CALENDAR: { defaultContent: {} },
  CONTACT_FORM: { defaultContent: { title: emptyLocalizedText, description: emptyLocalizedText } },
  GALLERY: { defaultContent: { imageUrls: [] } },
  PRICING: { defaultContent: { title: emptyLocalizedText } },
};

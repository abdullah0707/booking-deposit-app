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
export const SECTION_LIBRARY: Record<SectionType, { defaultContent: Record<string, unknown> }> = {
  HERO: { defaultContent: { title: "", subtitle: "", ctaLabel: "" } },
  SERVICE_LIST: { defaultContent: { title: "" } },
  CALENDAR: { defaultContent: {} },
  CONTACT_FORM: { defaultContent: { title: "", description: "" } },
  GALLERY: { defaultContent: { imageUrls: [] } },
  PRICING: { defaultContent: { title: "" } },
};

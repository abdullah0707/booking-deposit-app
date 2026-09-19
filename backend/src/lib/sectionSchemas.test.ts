import { describe, expect, it } from "vitest";
import { resolveLocalizedContent, validateSectionContent } from "./sectionSchemas.js";

describe("validateSectionContent", () => {
  it("accepts valid HERO content and rejects a missing required field", () => {
    expect(validateSectionContent("HERO", { title: { en: "Welcome" } })).toEqual({
      title: { en: "Welcome" },
    });
    expect(() => validateSectionContent("HERO", {})).toThrow();
    expect(() => validateSectionContent("HERO", { title: {} })).toThrow();
  });

  it("accepts an empty object for CALENDAR (no configurable fields)", () => {
    expect(validateSectionContent("CALENDAR", {})).toEqual({});
  });

  it("rejects a GALLERY with a non-URL image entry", () => {
    expect(() => validateSectionContent("GALLERY", { imageUrls: ["not-a-url"] })).toThrow();
  });

  it("rejects an unknown section type", () => {
    expect(() => validateSectionContent("NOT_A_REAL_TYPE", {})).toThrow(/Unknown section type/);
  });
});

describe("resolveLocalizedContent", () => {
  it("picks the requested locale, falling back to whichever is populated", () => {
    const content = { title: { en: "Welcome", ar: "أهلاً" }, ctaLabel: { en: "Book now" } };
    expect(resolveLocalizedContent("HERO", content, "ar")).toEqual({
      title: "أهلاً",
      ctaLabel: "Book now",
    });
    expect(resolveLocalizedContent("HERO", content, "en")).toEqual({
      title: "Welcome",
      ctaLabel: "Book now",
    });
  });

  it("passes legacy plain-string content through unchanged", () => {
    const content = { title: "Book with Test Salon" };
    expect(resolveLocalizedContent("HERO", content, "ar")).toEqual({ title: "Book with Test Salon" });
  });

  it("leaves non-localized section types (e.g. GALLERY) untouched", () => {
    const content = { imageUrls: ["https://example.com/a.png"] };
    expect(resolveLocalizedContent("GALLERY", content, "ar")).toEqual(content);
  });
});

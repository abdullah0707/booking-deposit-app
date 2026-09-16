import { describe, expect, it } from "vitest";
import { validateSectionContent } from "./sectionSchemas.js";

describe("validateSectionContent", () => {
  it("accepts valid HERO content and rejects a missing required field", () => {
    expect(validateSectionContent("HERO", { title: "Welcome" })).toEqual({ title: "Welcome" });
    expect(() => validateSectionContent("HERO", {})).toThrow();
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

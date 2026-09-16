import { describe, expect, it } from "vitest";
import { computeAvailableSlots } from "./availability.js";

const TZ = "Africa/Cairo";
const WORKING_HOURS = { startTime: "09:00", endTime: "12:00" }; // 3 one-hour slots: 9-10, 10-11, 11-12

describe("computeAvailableSlots", () => {
  it("returns no slots when the business is closed that day", () => {
    const slots = computeAvailableSlots({
      date: "2026-08-01",
      timezone: TZ,
      workingHours: null,
      slotDurationMinutes: 60,
      existingBookings: [],
      blockedTimes: [],
    });
    expect(slots).toHaveLength(0);
  });

  it("generates back-to-back slots filling the full working window", () => {
    const slots = computeAvailableSlots({
      date: "2026-08-01",
      timezone: TZ,
      workingHours: WORKING_HOURS,
      slotDurationMinutes: 60,
      existingBookings: [],
      blockedTimes: [],
    });
    expect(slots).toHaveLength(3);
    expect(slots[0].startsAt.toISOString()).toBe(
      new Date("2026-08-01T09:00:00+03:00").toISOString(),
    );
    expect(slots[2].endsAt.toISOString()).toBe(
      new Date("2026-08-01T12:00:00+03:00").toISOString(),
    );
  });

  it("excludes a slot that overlaps an existing booking, and only that slot", () => {
    const slots = computeAvailableSlots({
      date: "2026-08-01",
      timezone: TZ,
      workingHours: WORKING_HOURS,
      slotDurationMinutes: 60,
      existingBookings: [
        {
          startsAt: new Date("2026-08-01T10:00:00+03:00"),
          endsAt: new Date("2026-08-01T11:00:00+03:00"),
        },
      ],
      blockedTimes: [],
    });
    expect(slots).toHaveLength(2);
    expect(slots.map((s) => s.startsAt.toISOString())).not.toContain(
      new Date("2026-08-01T10:00:00+03:00").toISOString(),
    );
  });

  it("excludes a slot that only partially overlaps a blocked time", () => {
    // Blocked 09:30–10:30 should knock out both the 09:00-10:00 and 10:00-11:00 slots.
    const slots = computeAvailableSlots({
      date: "2026-08-01",
      timezone: TZ,
      workingHours: WORKING_HOURS,
      slotDurationMinutes: 60,
      existingBookings: [],
      blockedTimes: [
        {
          startsAt: new Date("2026-08-01T09:30:00+03:00"),
          endsAt: new Date("2026-08-01T10:30:00+03:00"),
        },
      ],
    });
    expect(slots).toHaveLength(1);
    expect(slots[0].startsAt.toISOString()).toBe(
      new Date("2026-08-01T11:00:00+03:00").toISOString(),
    );
  });

  it("does not generate a trailing partial slot past the end of working hours", () => {
    const slots = computeAvailableSlots({
      date: "2026-08-01",
      timezone: TZ,
      workingHours: { startTime: "09:00", endTime: "10:30" },
      slotDurationMinutes: 60,
      existingBookings: [],
      blockedTimes: [],
    });
    // Only one full 60-minute slot fits in a 90-minute window.
    expect(slots).toHaveLength(1);
  });

  it("handles a DST-boundary date without throwing or misaligning slot count", () => {
    // Egypt observes DST transitions in some years; regardless, the function
    // must not crash and must respect the working-hour wall-clock window.
    const slots = computeAvailableSlots({
      date: "2026-04-24",
      timezone: TZ,
      workingHours: WORKING_HOURS,
      slotDurationMinutes: 60,
      existingBookings: [],
      blockedTimes: [],
    });
    expect(slots).toHaveLength(3);
  });
});

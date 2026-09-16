import { DateTime } from "luxon";

export interface Interval {
  startsAt: Date;
  endsAt: Date;
}

export interface WorkingHourInput {
  startTime: string; // "09:00"
  endTime: string; // "17:00"
}

export interface ComputeAvailableSlotsArgs {
  /** The calendar date being requested, as "YYYY-MM-DD". */
  date: string;
  /** IANA timezone the business operates in, e.g. "Africa/Cairo". */
  timezone: string;
  /** Working hours for that weekday; null/undefined means closed. */
  workingHours: WorkingHourInput | null | undefined;
  slotDurationMinutes: number;
  /** Existing bookings in PENDING_PAYMENT or CONFIRMED status. */
  existingBookings: Interval[];
  blockedTimes: Interval[];
}

function intervalsOverlap(aStart: DateTime, aEnd: DateTime, bStart: Date, bEnd: Date): boolean {
  const bs = DateTime.fromJSDate(bStart);
  const be = DateTime.fromJSDate(bEnd);
  return aStart < be && aEnd > bs;
}

/**
 * Walks the business's working hours for the requested day in
 * `slotDurationMinutes` steps and excludes any candidate slot that
 * overlaps an existing booking or a blocked time. This is the
 * application-level first line of defense; the Postgres exclusion
 * constraint on the Booking table is the backstop against races between
 * two simultaneous requests for the same slot (see the plan, §2.1).
 */
export function computeAvailableSlots(args: ComputeAvailableSlotsArgs): Interval[] {
  const { date, timezone, workingHours, slotDurationMinutes, existingBookings, blockedTimes } = args;

  if (!workingHours) return [];

  const dayStart = DateTime.fromISO(`${date}T${workingHours.startTime}`, { zone: timezone });
  const dayEnd = DateTime.fromISO(`${date}T${workingHours.endTime}`, { zone: timezone });

  if (!dayStart.isValid || !dayEnd.isValid || dayEnd <= dayStart) return [];

  const slots: Interval[] = [];
  let cursor = dayStart;

  while (cursor.plus({ minutes: slotDurationMinutes }) <= dayEnd) {
    const slotStart = cursor;
    const slotEnd = cursor.plus({ minutes: slotDurationMinutes });

    const blocked =
      existingBookings.some((b) => intervalsOverlap(slotStart, slotEnd, b.startsAt, b.endsAt)) ||
      blockedTimes.some((b) => intervalsOverlap(slotStart, slotEnd, b.startsAt, b.endsAt));

    if (!blocked) {
      slots.push({ startsAt: slotStart.toJSDate(), endsAt: slotEnd.toJSDate() });
    }

    cursor = cursor.plus({ minutes: slotDurationMinutes });
  }

  return slots;
}

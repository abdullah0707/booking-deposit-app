import { prisma } from "../lib/prisma.js";

const HOLD_MINUTES = Number(process.env.BOOKING_HOLD_MINUTES ?? 10);

/**
 * Releases slots held by bookings that never completed payment (plan
 * §2.2). Runs on a short interval since an abandoned checkout should
 * free the slot quickly for other customers.
 */
export async function expirePendingBookings(): Promise<number> {
  const cutoff = new Date(Date.now() - HOLD_MINUTES * 60_000);

  const result = await prisma.booking.updateMany({
    where: { status: "PENDING_PAYMENT", createdAt: { lt: cutoff } },
    data: { status: "CANCELLED" },
  });

  return result.count;
}

import { prisma } from "../lib/prisma.js";
import type { NotificationChannel } from "../lib/notifications/types.js";

const HOURS_BEFORE = Number(process.env.REMINDER_HOURS_BEFORE ?? 24);

/** Plan §2.3 — reminds customers of confirmed, upcoming bookings once. */
export async function sendReminders(channel: NotificationChannel): Promise<number> {
  const windowStart = new Date();
  const windowEnd = new Date(Date.now() + HOURS_BEFORE * 60 * 60_000);

  const bookings = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      reminderSentAt: null,
      startsAt: { gte: windowStart, lte: windowEnd },
    },
    include: { service: true },
  });

  for (const booking of bookings) {
    await channel.sendReminder({
      to: booking.customerEmail,
      customerName: booking.customerName,
      serviceName: booking.service.name,
      startsAt: booking.startsAt,
    });
    await prisma.booking.update({
      where: { id: booking.id },
      data: { reminderSentAt: new Date() },
    });
  }

  return bookings.length;
}

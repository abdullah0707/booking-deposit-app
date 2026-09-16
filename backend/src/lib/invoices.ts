import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma.js";

type Client = PrismaClient | Prisma.TransactionClient;

/**
 * The one place that decides "a CONFIRMED booking has an invoice" —
 * called from both webhook appliers (after their guarded updateMany
 * actually matches a row) and the manual-payment confirm endpoint, so
 * there's exactly one code path issuing invoices, not three copies of
 * the same logic. Idempotent (returns the existing invoice if one
 * already exists for this booking, e.g. on a retry).
 *
 * Allocates the next per-business invoice number atomically: the
 * increment on Business.nextInvoiceNumber takes a Postgres row lock, so
 * two bookings confirming concurrently genuinely serialize rather than
 * race. @@unique([businessId, number]) on Invoice is a correctness
 * backstop, not the primary allocation mechanism.
 */
export async function issueInvoiceForBooking(bookingId: string, businessId: string, client: Client = prisma) {
  const existing = await client.invoice.findUnique({ where: { bookingId } });
  if (existing) return existing;

  const business = await client.business.update({
    where: { id: businessId },
    data: { nextInvoiceNumber: { increment: 1 } },
  });
  const number = business.nextInvoiceNumber - 1;

  return client.invoice.create({ data: { businessId, number, bookingId } });
}

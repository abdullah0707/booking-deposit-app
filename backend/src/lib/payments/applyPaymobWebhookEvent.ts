import { prisma } from "../prisma.js";
import { issueInvoiceForBooking } from "../invoices.js";

export interface ApplyWebhookResult {
  duplicate: boolean;
}

export interface PaymobTransactionObj {
  id: number | string;
  success: boolean;
  amount_cents?: number;
  special_reference?: string;
  extras?: { bookingId?: string } | null;
}

/**
 * The idempotent core of the Paymob webhook handler, split out from the
 * Express route the same way applyStripeWebhookEvent is — testable
 * without an HTTP request or a real HMAC secret.
 */
export async function applyPaymobWebhookEvent(transaction: PaymobTransactionObj): Promise<ApplyWebhookResult> {
  const eventId = String(transaction.id);

  try {
    await prisma.paymentWebhookEvent.create({
      data: { provider: "paymob", eventId },
    });
  } catch {
    return { duplicate: true };
  }

  if (transaction.success) {
    const bookingId = transaction.extras?.bookingId ?? transaction.special_reference;

    if (bookingId) {
      const result = await prisma.booking.updateMany({
        where: { id: bookingId, status: "PENDING_PAYMENT" },
        data: { status: "CONFIRMED" },
      });
      if (result.count === 1) {
        const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
        await issueInvoiceForBooking(booking.id, booking.businessId);
      }
    }
  }

  return { duplicate: false };
}

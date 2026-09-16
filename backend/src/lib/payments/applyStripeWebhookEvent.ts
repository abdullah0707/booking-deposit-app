import type Stripe from "stripe";
import { prisma } from "../prisma.js";
import { issueInvoiceForBooking } from "../invoices.js";

export interface ApplyWebhookResult {
  duplicate: boolean;
}

/**
 * The idempotent core of the Stripe webhook handler, split out from the
 * Express route so it's testable without mocking HTTP/signatures (plan
 * §2.2 verification: "replay the same provider event, confirm no
 * duplicate state change"). The route itself only verifies the signature
 * and calls this.
 */
export async function applyStripeWebhookEvent(event: Stripe.Event): Promise<ApplyWebhookResult> {
  try {
    await prisma.paymentWebhookEvent.create({
      data: { provider: "stripe", eventId: event.id },
    });
  } catch {
    return { duplicate: true };
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as { metadata?: { bookingId?: string } };
    const bookingId = session.metadata?.bookingId;

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

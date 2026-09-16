import Stripe from "stripe";
import type { CreateDepositChargeArgs, CreateDepositChargeResult, PaymentProvider } from "./types.js";

export class StripeProvider implements PaymentProvider {
  readonly name = "stripe";
  private stripe: Stripe;

  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey);
  }

  async createDepositCharge(args: CreateDepositChargeArgs): Promise<CreateDepositChargeResult> {
    const appUrl = process.env.APP_URL ?? "http://localhost:3000";

    const session = await this.stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: args.customerEmail,
      line_items: [
        {
          price_data: {
            currency: args.currency,
            unit_amount: Math.round(args.amount * 100),
            product_data: { name: "Booking deposit" },
          },
          quantity: 1,
        },
      ],
      metadata: { bookingId: args.bookingId },
      success_url: `${appUrl}/booking/confirmed?bookingId=${args.bookingId}`,
      cancel_url: `${appUrl}/booking/cancelled?bookingId=${args.bookingId}`,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL");
    }

    return { paymentRef: session.id, checkoutUrl: session.url };
  }

  /** Verifies the webhook signature and returns the parsed event. */
  constructEvent(rawBody: Buffer, signature: string, webhookSecret: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  }
}

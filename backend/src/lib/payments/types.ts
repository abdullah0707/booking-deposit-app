/**
 * Payment provider abstraction — the plan calls for Stripe or Paymob,
 * selected at install time. Only one concrete implementation needs to
 * exist for the booking flow to work end-to-end; adding the other later
 * is "implement this interface," not a redesign.
 */
export interface CreateDepositChargeArgs {
  bookingId: string;
  amount: number; // in the business's currency's smallest unit (e.g. cents/piastres)
  currency: string;
  customerEmail: string;
  /** Optional — Paymob's billing_data wants a name/phone; Stripe ignores these. */
  customerName?: string;
  customerPhone?: string;
}

export interface CreateDepositChargeResult {
  /** Opaque reference stored on the booking, used to reconcile the webhook. */
  paymentRef: string;
  /** Where the customer completes payment (Stripe Checkout URL, Paymob iframe URL, etc). */
  checkoutUrl: string;
}

export interface PaymentProvider {
  readonly name: string;
  createDepositCharge(args: CreateDepositChargeArgs): Promise<CreateDepositChargeResult>;
}

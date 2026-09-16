import { StripeProvider } from "./stripeProvider.js";
import { PaymobProvider } from "./paymobProvider.js";
import type { PaymentProvider } from "./types.js";

let stripeCached: StripeProvider | null = null;
let paymobCached: PaymobProvider | null = null;

export type AutomatedProviderType = "STRIPE" | "PAYMOB";

/** Whether the env vars a given automated provider needs are actually set — used to
 * reject enabling a PaymentMethod row whose secrets were never configured. */
export function isProviderConfigured(type: AutomatedProviderType): boolean {
  if (type === "STRIPE") return Boolean(process.env.STRIPE_SECRET_KEY);
  return Boolean(
    process.env.PAYMOB_SECRET_KEY && process.env.PAYMOB_PUBLIC_KEY && process.env.PAYMOB_INTEGRATION_ID_CARD,
  );
}

/**
 * Resolves the concrete automated PaymentProvider for a given method type.
 * Secrets always come from env vars (unchanged); the *choice* of which
 * provider to use now comes from the customer's selected PaymentMethod
 * row at checkout, not a single process-wide PAYMENT_PROVIDER env var.
 */
export function getPaymentProviderByType(type: AutomatedProviderType): PaymentProvider {
  if (type === "STRIPE") {
    if (stripeCached) return stripeCached;
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    stripeCached = new StripeProvider(key);
    return stripeCached;
  }

  if (paymobCached) return paymobCached;
  const secretKey = process.env.PAYMOB_SECRET_KEY;
  const publicKey = process.env.PAYMOB_PUBLIC_KEY;
  const integrationId = process.env.PAYMOB_INTEGRATION_ID_CARD;
  if (!secretKey || !publicKey || !integrationId) {
    throw new Error("PAYMOB_SECRET_KEY, PAYMOB_PUBLIC_KEY, and PAYMOB_INTEGRATION_ID_CARD must all be set");
  }
  paymobCached = new PaymobProvider(secretKey, publicKey, integrationId);
  return paymobCached;
}

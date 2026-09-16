import { Router } from "express";
import { StripeProvider } from "../lib/payments/stripeProvider.js";
import { applyStripeWebhookEvent } from "../lib/payments/applyStripeWebhookEvent.js";
import { verifyPaymobHmac } from "../lib/payments/paymobHmac.js";
import { applyPaymobWebhookEvent, type PaymobTransactionObj } from "../lib/payments/applyPaymobWebhookEvent.js";
import { asyncHandler } from "../lib/asyncHandler.js";

export const webhooksRouter = Router();

// NOTE: mounted with express.raw() in server.ts, not express.json() — Stripe's
// signature verification needs the exact raw request bytes.
webhooksRouter.post(
  "/webhooks/stripe",
  asyncHandler(async (req, res) => {
    const signature = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (typeof signature !== "string" || !webhookSecret || !process.env.STRIPE_SECRET_KEY) {
      return res.status(400).json({ error: "Webhook is not configured" });
    }

    const provider = new StripeProvider(process.env.STRIPE_SECRET_KEY);

    let event;
    try {
      event = provider.constructEvent(req.body as Buffer, signature, webhookSecret);
    } catch (err) {
      return res.status(400).json({ error: `Invalid signature: ${(err as Error).message}` });
    }

    const result = await applyStripeWebhookEvent(event);
    res.json({ received: true, duplicate: result.duplicate });
  }),
);

// NOTE: also mounted with express.raw() in server.ts. Paymob appends the
// HMAC as a query-string parameter (`?hmac=...`) on the notification_url
// it calls, not a header — see src/lib/payments/paymobHmac.ts for the
// exact field order/algorithm this verifies against.
webhooksRouter.post(
  "/webhooks/paymob",
  asyncHandler(async (req, res) => {
    const receivedHmac = req.query.hmac;
    const hmacSecret = process.env.PAYMOB_HMAC_SECRET;

    if (typeof receivedHmac !== "string" || !hmacSecret) {
      return res.status(400).json({ error: "Webhook is not configured" });
    }

    let body: { obj?: Record<string, unknown> };
    try {
      body = JSON.parse((req.body as Buffer).toString("utf8"));
    } catch {
      return res.status(400).json({ error: "Invalid JSON body" });
    }

    if (!body.obj || !verifyPaymobHmac(body.obj, receivedHmac, hmacSecret)) {
      return res.status(400).json({ error: "Invalid HMAC signature" });
    }

    const result = await applyPaymobWebhookEvent(body.obj as unknown as PaymobTransactionObj);
    res.json({ received: true, duplicate: result.duplicate });
  }),
);

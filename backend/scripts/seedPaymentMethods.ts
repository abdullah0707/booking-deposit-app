import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

/**
 * One-time upgrade step for installs that predate the multi-method
 * payment system (v2): seeds an enabled PaymentMethod row matching
 * whatever PAYMENT_PROVIDER was already configured via env vars, so an
 * existing buyer's install keeps working after the schema migration
 * instead of silently losing its payment method. Idempotent — safe to
 * run more than once, skips if a method of that type already exists.
 *
 * Run once after migrating: `npx tsx scripts/seedPaymentMethods.ts`
 */
async function main() {
  const business = await prisma.business.findFirst();
  if (!business) {
    console.log("No business installed yet — nothing to seed.");
    return;
  }

  const provider = process.env.PAYMENT_PROVIDER;
  if (provider !== "stripe" && provider !== "paymob") {
    console.log(`PAYMENT_PROVIDER="${provider}" is not stripe/paymob — nothing to seed.`);
    return;
  }

  const type = provider === "stripe" ? "STRIPE" : "PAYMOB";
  const existing = await prisma.paymentMethod.findFirst({
    where: { businessId: business.id, type },
  });
  if (existing) {
    console.log(`A ${type} payment method already exists (id=${existing.id}) — skipping.`);
    return;
  }

  const label = type === "STRIPE" ? "Card (Stripe)" : "Card (Paymob)";
  const created = await prisma.paymentMethod.create({
    data: { businessId: business.id, type, label, enabled: true, sortOrder: 0 },
  });
  console.log(`Seeded ${type} payment method (id=${created.id}, label="${label}", enabled=true).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

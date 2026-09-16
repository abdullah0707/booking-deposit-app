import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type Stripe from "stripe";
import { prisma } from "../prisma.js";
import { applyStripeWebhookEvent } from "./applyStripeWebhookEvent.js";

// Integration test against the local dev Postgres (docker compose up -d
// in backend/) — this is deliberate: the behavior under test is the
// interaction between the app and the database's unique constraint, not
// pure logic, so a real database is the meaningful thing to verify
// against (plan §6 verification: "replay the same provider event,
// confirm no duplicate state change").

let businessId: string;
let serviceId: string;
let bookingId: string;

beforeAll(async () => {
  const business = await prisma.business.create({
    data: { name: "Webhook Test Business" },
  });
  businessId = business.id;

  const service = await prisma.service.create({
    data: {
      businessId,
      name: "Test service",
      durationMinutes: 60,
      price: 100,
      depositAmount: 20,
    },
  });
  serviceId = service.id;

  const booking = await prisma.booking.create({
    data: {
      businessId,
      serviceId,
      customerName: "Test Customer",
      customerEmail: "customer@example.com",
      startsAt: new Date("2026-09-01T09:00:00Z"),
      endsAt: new Date("2026-09-01T10:00:00Z"),
      depositAmount: 20,
      status: "PENDING_PAYMENT",
    },
  });
  bookingId = booking.id;
});

afterAll(async () => {
  await prisma.paymentWebhookEvent.deleteMany({ where: { eventId: { startsWith: "evt_test_" } } });
  await prisma.invoice.deleteMany({ where: { businessId } });
  await prisma.booking.deleteMany({ where: { businessId } });
  await prisma.service.deleteMany({ where: { businessId } });
  await prisma.business.delete({ where: { id: businessId } });
});

function fakeCheckoutCompletedEvent(eventId: string): Stripe.Event {
  return {
    id: eventId,
    type: "checkout.session.completed",
    data: { object: { metadata: { bookingId } } },
  } as unknown as Stripe.Event;
}

describe("applyStripeWebhookEvent", () => {
  it("confirms the booking and issues invoice #1 on first delivery", async () => {
    const result = await applyStripeWebhookEvent(fakeCheckoutCompletedEvent("evt_test_1"));
    expect(result.duplicate).toBe(false);

    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(booking.status).toBe("CONFIRMED");

    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { bookingId } });
    expect(invoice.number).toBe(1);
  });

  it("is a no-op on a retried delivery of the same event id, no duplicate invoice", async () => {
    const result = await applyStripeWebhookEvent(fakeCheckoutCompletedEvent("evt_test_1"));
    expect(result.duplicate).toBe(true);

    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(booking.status).toBe("CONFIRMED");

    const invoices = await prisma.invoice.findMany({ where: { bookingId } });
    expect(invoices).toHaveLength(1);
  });

  it("treats a different event id as a new delivery", async () => {
    const result = await applyStripeWebhookEvent(fakeCheckoutCompletedEvent("evt_test_2"));
    expect(result.duplicate).toBe(false);
  });
});

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma.js";
import { issueInvoiceForBooking } from "./invoices.js";

// Verifies the race-safety claim in the plan directly, not just by
// sequential manual testing: a burst of concurrent confirmations for
// different bookings on the same business must never produce a
// duplicate or skipped invoice number.

let businessId: string;
let serviceId: string;

beforeAll(async () => {
  const business = await prisma.business.create({ data: { name: "Invoice Race Test Business" } });
  businessId = business.id;

  const service = await prisma.service.create({
    data: { businessId, name: "Test service", durationMinutes: 60, price: 100, depositAmount: 20 },
  });
  serviceId = service.id;
});

afterAll(async () => {
  await prisma.invoice.deleteMany({ where: { businessId } });
  await prisma.booking.deleteMany({ where: { businessId } });
  await prisma.service.deleteMany({ where: { businessId } });
  await prisma.business.delete({ where: { id: businessId } });
});

describe("issueInvoiceForBooking", () => {
  it("allocates unique, gapless sequential numbers under concurrent confirmation", async () => {
    const bookings = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        prisma.booking.create({
          data: {
            businessId,
            serviceId,
            customerName: `Customer ${i}`,
            customerEmail: `customer${i}@example.com`,
            startsAt: new Date(Date.UTC(2026, 8, 3, 9 + i)),
            endsAt: new Date(Date.UTC(2026, 8, 3, 10 + i)),
            depositAmount: 20,
            status: "CONFIRMED",
          },
        }),
      ),
    );

    const invoices = await Promise.all(bookings.map((b) => issueInvoiceForBooking(b.id, businessId)));

    const numbers = invoices.map((inv) => inv.number).sort((a, b) => a - b);
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    const uniqueNumbers = new Set(numbers);
    expect(uniqueNumbers.size).toBe(10);
  });

  it("is idempotent — returns the existing invoice instead of allocating a new number", async () => {
    const booking = await prisma.booking.create({
      data: {
        businessId,
        serviceId,
        customerName: "Idempotency Test",
        customerEmail: "idempotent@example.com",
        startsAt: new Date(Date.UTC(2026, 8, 4, 9)),
        endsAt: new Date(Date.UTC(2026, 8, 4, 10)),
        depositAmount: 20,
        status: "CONFIRMED",
      },
    });

    const first = await issueInvoiceForBooking(booking.id, businessId);
    const second = await issueInvoiceForBooking(booking.id, businessId);

    expect(second.id).toBe(first.id);
    expect(second.number).toBe(first.number);

    const count = await prisma.invoice.count({ where: { bookingId: booking.id } });
    expect(count).toBe(1);
  });
});

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../lib/prisma.js";
import { expirePendingBookings } from "./expirePendingBookings.js";

let businessId: string;
let serviceId: string;

beforeAll(async () => {
  const business = await prisma.business.create({ data: { name: "Expiry Test Business" } });
  businessId = business.id;
  const service = await prisma.service.create({
    data: { businessId, name: "Test", durationMinutes: 60, price: 10, depositAmount: 5 },
  });
  serviceId = service.id;
});

afterAll(async () => {
  await prisma.booking.deleteMany({ where: { businessId } });
  await prisma.service.deleteMany({ where: { businessId } });
  await prisma.business.delete({ where: { id: businessId } });
});

describe("expirePendingBookings", () => {
  it("cancels a pending booking held past the TTL, and leaves a fresh one alone", async () => {
    const stale = await prisma.booking.create({
      data: {
        businessId,
        serviceId,
        customerName: "Stale",
        customerEmail: "stale@example.com",
        startsAt: new Date("2026-10-01T09:00:00Z"),
        endsAt: new Date("2026-10-01T10:00:00Z"),
        depositAmount: 5,
        status: "PENDING_PAYMENT",
      },
    });
    // Backdate createdAt past the default 10-minute hold window directly,
    // since Prisma's @default(now()) can't be overridden on create().
    await prisma.$executeRaw`UPDATE "Booking" SET "createdAt" = NOW() - INTERVAL '15 minutes' WHERE id = ${stale.id}`;

    const fresh = await prisma.booking.create({
      data: {
        businessId,
        serviceId,
        customerName: "Fresh",
        customerEmail: "fresh@example.com",
        startsAt: new Date("2026-10-01T11:00:00Z"),
        endsAt: new Date("2026-10-01T12:00:00Z"),
        depositAmount: 5,
        status: "PENDING_PAYMENT",
      },
    });

    const count = await expirePendingBookings();
    expect(count).toBeGreaterThanOrEqual(1);

    const staleAfter = await prisma.booking.findUniqueOrThrow({ where: { id: stale.id } });
    const freshAfter = await prisma.booking.findUniqueOrThrow({ where: { id: fresh.id } });
    expect(staleAfter.status).toBe("CANCELLED");
    expect(freshAfter.status).toBe("PENDING_PAYMENT");
  });
});

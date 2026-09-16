/**
 * Dev-only seed script — NOT the buyer-facing install wizard (that's
 * still on the roadmap, see docs/README.md). This exists purely so we
 * can exercise the booking flow end-to-end during development without
 * building the install UI first.
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth.js";

const prisma = new PrismaClient();

async function main() {
  // Delete in FK-dependency order (children before parents) — Business
  // has many dependents without cascading deletes, so deleteMany
  // (Business) alone fails once any of those exist from a prior
  // seed/dev-testing run.
  await prisma.$transaction([
    prisma.paymentProof.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.paymentMethod.deleteMany(),
    prisma.contactSubmission.deleteMany(),
    prisma.section.deleteMany(),
    prisma.page.deleteMany(),
    prisma.blockedTime.deleteMany(),
    prisma.workingHour.deleteMany(),
    prisma.service.deleteMany(),
    prisma.user.deleteMany(),
    prisma.business.deleteMany(),
  ]);

  const business = await prisma.business.create({
    data: {
      name: "Miqat Demo Salon",
      defaultLanguage: "en",
      timezone: "Africa/Cairo",
    },
  });

  await prisma.user.create({
    data: {
      businessId: business.id,
      email: "owner@miqat.test",
      passwordHash: await hashPassword("password123"),
      role: "OWNER",
    },
  });

  const service = await prisma.service.create({
    data: {
      businessId: business.id,
      name: "Haircut",
      description: "A classic haircut.",
      durationMinutes: 60,
      price: 30,
      depositAmount: 10,
    },
  });

  for (const weekday of ["MON", "TUE", "WED", "THU", "SUN"] as const) {
    await prisma.workingHour.create({
      data: { businessId: business.id, weekday, startTime: "09:00", endTime: "17:00" },
    });
  }

  console.log("Seeded:");
  console.log(`  business: ${business.name} (${business.id})`);
  console.log(`  owner login: owner@miqat.test / password123`);
  console.log(`  service: ${service.name} (${service.id})`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });

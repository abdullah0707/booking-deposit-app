import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { getTheBusiness } from "../lib/business.js";
import { hashPassword, signCustomerToken, verifyPassword } from "../lib/auth.js";
import { requireCustomerAuth } from "../middleware/requireCustomerAuth.js";
import { asyncHandler } from "../lib/asyncHandler.js";

export const customersRouter = Router();

// Public — a customer creating their own account. Optional: guest
// checkout (POST /bookings with no Authorization header) still works
// fully without one — this exists so a returning customer can see real
// booking history instead of the device-local fallback.
const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

customersRouter.post(
  "/customers/register",
  asyncHandler(async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const business = await getTheBusiness();
    const { name, email, password } = parsed.data;

    const existing = await prisma.customer.findUnique({
      where: { businessId_email: { businessId: business.id, email } },
    });
    if (existing) return res.status(409).json({ error: "An account with this email already exists" });

    const customer = await prisma.customer.create({
      data: { businessId: business.id, name, email, passwordHash: await hashPassword(password) },
    });

    const token = signCustomerToken({ customerId: customer.id, businessId: business.id });
    res.status(201).json({ token, customer: { id: customer.id, name: customer.name, email: customer.email } });
  }),
);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

customersRouter.post(
  "/customers/login",
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid email or password format" });

    const business = await getTheBusiness();
    const { email, password } = parsed.data;

    const customer = await prisma.customer.findUnique({
      where: { businessId_email: { businessId: business.id, email } },
    });
    if (!customer || !(await verifyPassword(password, customer.passwordHash))) {
      return res.status(401).json({ error: "Incorrect email or password" });
    }

    const token = signCustomerToken({ customerId: customer.id, businessId: business.id });
    res.json({ token, customer: { id: customer.id, name: customer.name, email: customer.email } });
  }),
);

customersRouter.get(
  "/customers/me",
  requireCustomerAuth,
  asyncHandler(async (req, res) => {
    const customer = await prisma.customer.findUniqueOrThrow({ where: { id: req.customerAuth!.customerId } });
    res.json({ id: customer.id, name: customer.name, email: customer.email });
  }),
);

// A registered customer's real booking history — the account-backed
// equivalent of web/src/lib/myBookings.ts's device-local list.
customersRouter.get(
  "/customers/me/bookings",
  requireCustomerAuth,
  asyncHandler(async (req, res) => {
    const bookings = await prisma.booking.findMany({
      where: { customerId: req.customerAuth!.customerId },
      include: { service: true },
      orderBy: { startsAt: "desc" },
    });
    res.json(bookings);
  }),
);

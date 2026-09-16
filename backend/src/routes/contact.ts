import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { getTheBusiness } from "../lib/business.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { buildNotificationChannel } from "../lib/notifications/smtpChannel.js";

export const contactRouter = Router();

const contactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  message: z.string().min(1).max(5000),
});

// Public — submitted from a CONTACT_FORM section on the storefront/app.
contactRouter.post(
  "/contact",
  asyncHandler(async (req, res) => {
    const parsed = contactSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const business = await getTheBusiness();
    const submission = await prisma.contactSubmission.create({
      data: { ...parsed.data, businessId: business.id },
    });

    // Best-effort — the submission is already durably stored above, so a
    // failed/unconfigured email notification shouldn't fail the request.
    try {
      const owner = await prisma.user.findFirst({ where: { businessId: business.id, role: "OWNER" } });
      if (owner) {
        await buildNotificationChannel().sendEmail({
          to: owner.email,
          subject: `New message from ${parsed.data.name}`,
          text: `${parsed.data.message}\n\nReply to: ${parsed.data.email}`,
          html: `<p>${parsed.data.message}</p><p>Reply to: <a href="mailto:${parsed.data.email}">${parsed.data.email}</a></p>`,
        });
      }
    } catch (err) {
      console.error("[contact] failed to email the owner", err);
    }

    res.status(201).json({ id: submission.id });
  }),
);

contactRouter.get(
  "/admin/contact-submissions",
  requireAuth,
  asyncHandler(async (req, res) => {
    const submissions = await prisma.contactSubmission.findMany({
      where: { businessId: req.auth!.businessId },
      orderBy: { createdAt: "desc" },
    });
    res.json(submissions);
  }),
);

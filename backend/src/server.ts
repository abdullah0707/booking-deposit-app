import "dotenv/config";
import cors from "cors";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import cron from "node-cron";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import { servicesRouter } from "./routes/services.js";
import { workingHoursRouter } from "./routes/workingHours.js";
import { blockedTimesRouter } from "./routes/blockedTimes.js";
import { availabilityRouter } from "./routes/availability.js";
import { bookingsRouter } from "./routes/bookings.js";
import { webhooksRouter } from "./routes/webhooks.js";
import { pagesRouter } from "./routes/pages.js";
import { sectionsRouter } from "./routes/sections.js";
import { trashRouter } from "./routes/trash.js";
import { uploadsRouter, UPLOADS_DIR } from "./routes/uploads.js";
import { expirePendingBookings } from "./jobs/expirePendingBookings.js";
import { sendReminders } from "./jobs/sendReminders.js";
import { purgeTrash } from "./jobs/purgeTrash.js";
import { buildNotificationChannel } from "./lib/notifications/smtpChannel.js";
import { installRouter } from "./routes/install.js";
import { contactRouter } from "./routes/contact.js";
import { businessRouter } from "./routes/business.js";
import { paymentMethodsRouter } from "./routes/paymentMethods.js";
import { invoicesRouter } from "./routes/invoices.js";
import { translateRouter } from "./routes/translate.js";
import { customersRouter } from "./routes/customers.js";
import { NotInstalledError } from "./lib/notInstalledError.js";

const app = express();

app.use(cors());

// Stripe and Paymob webhooks both need the raw body for signature
// verification, so they're mounted with express.raw() before the global
// JSON parser applies to everything else.
app.use("/webhooks/stripe", express.raw({ type: "application/json" }));
app.use("/webhooks/paymob", express.raw({ type: "application/json" }));
app.use(webhooksRouter);

app.use(express.json());
// Uploaded images — served under the same origin the upload endpoint
// returns URLs for (BACKEND_URL), so callers don't need a separate CDN.
app.use("/uploads", express.static(UPLOADS_DIR));
app.use(healthRouter);
app.use(installRouter);
app.use(businessRouter);
app.use(authRouter);
app.use(servicesRouter);
app.use(workingHoursRouter);
app.use(blockedTimesRouter);
app.use(availabilityRouter);
app.use(bookingsRouter);
app.use(pagesRouter);
app.use(sectionsRouter);
app.use(trashRouter);
app.use(uploadsRouter);
app.use(contactRouter);
app.use(paymentMethodsRouter);
app.use(invoicesRouter);
app.use(translateRouter);
app.use(customersRouter);

// Last-resort safety net: every route handler is wrapped in asyncHandler
// (see src/lib/asyncHandler.ts) so errors should always land here rather
// than crash the process — confirmed necessary the hard way during
// development, when a misconfigured payment provider took the entire
// server down instead of just failing one request.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (res.headersSent) return;
  if (err instanceof NotInstalledError) {
    return res.status(503).json({ error: err.message, code: "NOT_INSTALLED" });
  }
  console.error("[error]", err);
  res.status(500).json({ error: "Internal server error" });
});

const port = process.env.PORT ? Number(process.env.PORT) : 4000;

app.listen(port, () => {
  console.log(`Miqat backend listening on http://localhost:${port}`);
});

// Every minute: release slots abandoned mid-checkout (plan §2.2).
cron.schedule("* * * * *", async () => {
  try {
    const count = await expirePendingBookings();
    if (count > 0) console.log(`[jobs] expired ${count} pending booking(s)`);
  } catch (err) {
    console.error("[jobs] expirePendingBookings failed", err);
  }
});

// Every 15 minutes: remind customers of upcoming confirmed bookings (plan §2.3).
const reminderChannel = buildNotificationChannel();
cron.schedule("*/15 * * * *", async () => {
  try {
    const count = await sendReminders(reminderChannel);
    if (count > 0) console.log(`[jobs] sent ${count} reminder(s)`);
  } catch (err) {
    console.error("[jobs] sendReminders failed", err);
  }
});

// Nightly: permanently delete anything past the 30-day trash window (plan §2.4).
cron.schedule("0 3 * * *", async () => {
  try {
    const { pages, sections } = await purgeTrash();
    if (pages > 0 || sections > 0) {
      console.log(`[jobs] purged ${pages} page(s) and ${sections} section(s) from trash`);
    }
  } catch (err) {
    console.error("[jobs] purgeTrash failed", err);
  }
});

// A buyer running this template may not have a process manager (PM2,
// systemd) auto-restarting on crash, so as a defensive last resort we
// log instead of letting one unexpected error take the whole server
// down. The Express error middleware above should catch route-level
// errors before they ever reach here.
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err);
});

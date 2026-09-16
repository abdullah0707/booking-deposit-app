import nodemailer, { type Transporter } from "nodemailer";
import type { NotificationChannel, SendEmailArgs, SendReminderArgs } from "./types.js";
import { ConsoleNotificationChannel } from "./consoleChannel.js";

/**
 * Real email reminders over plain SMTP — works with any provider a buyer
 * already has (Gmail, SendGrid, Mailgun, Amazon SES, their own mail
 * server), rather than locking the template to one vendor's API/SDK.
 */
export class SmtpNotificationChannel implements NotificationChannel {
  readonly name = "smtp";
  private transporter: Transporter;
  private fromAddress: string;

  constructor(config: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    fromAddress: string;
  }) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
    });
    this.fromAddress = config.fromAddress;
  }

  async sendReminder(args: SendReminderArgs): Promise<void> {
    const when = args.startsAt.toLocaleString("en-US", {
      dateStyle: "full",
      timeStyle: "short",
    });

    await this.sendEmail({
      to: args.to,
      subject: `Reminder: your ${args.serviceName} appointment`,
      text: `Hi ${args.customerName},\n\nJust a reminder that your ${args.serviceName} appointment is scheduled for ${when}.\n\nSee you then!`,
      html: `<p>Hi ${args.customerName},</p><p>Just a reminder that your <strong>${args.serviceName}</strong> appointment is scheduled for <strong>${when}</strong>.</p><p>See you then!</p>`,
    });
  }

  async sendEmail(args: SendEmailArgs): Promise<void> {
    await this.transporter.sendMail({
      from: this.fromAddress,
      to: args.to,
      subject: args.subject,
      text: args.text,
      html: args.html,
    });
  }
}

/** Builds the configured channel from env vars, falling back to the
 * console channel (and a warning) if SMTP isn't configured yet — so a
 * fresh install doesn't crash the reminder job before the buyer has set
 * up email. */
export function buildNotificationChannel(): NotificationChannel {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM } = process.env;

  if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS && EMAIL_FROM) {
    return new SmtpNotificationChannel({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      user: SMTP_USER,
      pass: SMTP_PASS,
      fromAddress: EMAIL_FROM,
    });
  }

  console.warn(
    "[notifications] SMTP is not configured (SMTP_HOST/PORT/USER/PASS/EMAIL_FROM) — " +
      "reminders will be logged to the console instead of emailed. See docs/README.md.",
  );
  return new ConsoleNotificationChannel();
}

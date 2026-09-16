/**
 * Notification-channel abstraction (plan §2.3, extended for the contact
 * form). Console logging is the default so both the reminder job and
 * contact-form notifications are demonstrably working end-to-end without
 * needing real SMTP/WhatsApp credentials during development; swapping in
 * a real provider later is "implement this interface."
 */
export interface SendReminderArgs {
  to: string;
  customerName: string;
  serviceName: string;
  startsAt: Date;
}

export interface SendEmailArgs {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface NotificationChannel {
  readonly name: string;
  sendReminder(args: SendReminderArgs): Promise<void>;
  sendEmail(args: SendEmailArgs): Promise<void>;
}

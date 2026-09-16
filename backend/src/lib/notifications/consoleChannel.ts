import type { NotificationChannel, SendEmailArgs, SendReminderArgs } from "./types.js";

export class ConsoleNotificationChannel implements NotificationChannel {
  readonly name = "console";

  async sendReminder(args: SendReminderArgs): Promise<void> {
    console.log(
      `[reminder] ${args.to}: "${args.customerName}", your ${args.serviceName} appointment is at ${args.startsAt.toISOString()}`,
    );
  }

  async sendEmail(args: SendEmailArgs): Promise<void> {
    console.log(`[email] to=${args.to} subject="${args.subject}"\n${args.text}`);
  }
}

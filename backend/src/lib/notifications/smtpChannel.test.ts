import { afterEach, describe, expect, it, vi } from "vitest";
import { buildNotificationChannel } from "./smtpChannel.js";
import { ConsoleNotificationChannel } from "./consoleChannel.js";
import { SmtpNotificationChannel } from "./smtpChannel.js";

const ENV_KEYS = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "EMAIL_FROM"] as const;

function clearSmtpEnv() {
  for (const key of ENV_KEYS) delete process.env[key];
}

describe("buildNotificationChannel", () => {
  afterEach(() => {
    clearSmtpEnv();
    vi.restoreAllMocks();
  });

  it("falls back to the console channel when SMTP isn't configured", () => {
    clearSmtpEnv();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const channel = buildNotificationChannel();
    expect(channel).toBeInstanceOf(ConsoleNotificationChannel);
    expect(warnSpy).toHaveBeenCalled();
  });

  it("builds a real SMTP channel when fully configured", () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USER = "user@example.com";
    process.env.SMTP_PASS = "secret";
    process.env.EMAIL_FROM = "bookings@example.com";

    const channel = buildNotificationChannel();
    expect(channel).toBeInstanceOf(SmtpNotificationChannel);
    expect(channel.name).toBe("smtp");
  });
});

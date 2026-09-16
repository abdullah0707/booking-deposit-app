"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarCheck, CheckCircle } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthContext";

type Step = "business" | "owner" | "done";

const TIMEZONES = [
  "Africa/Cairo",
  "Asia/Riyadh",
  "Asia/Dubai",
  "Europe/London",
  "America/New_York",
  "UTC",
];

export default function InstallPage() {
  const t = useTranslations("install");
  const router = useRouter();
  const locale = usePathname().split("/")[1];
  const { login } = useAuth();

  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState<Step>("business");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [defaultLanguage, setDefaultLanguage] = useState<"en" | "ar">(locale === "ar" ? "ar" : "en");
  const [timezone, setTimezone] = useState(TIMEZONES[0]);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");

  useEffect(() => {
    api
      .get<{ installed: boolean }>("/install/status")
      .then((result) => {
        if (result.installed) {
          router.replace(`/${locale}/admin/login`);
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [locale, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/install", { businessName, defaultLanguage, timezone, ownerEmail, ownerPassword });
      await login(ownerEmail, ownerPassword);
      setStep("done");
    } catch {
      setError(t("genericError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) return null;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <div className="glass-chip flex h-14 w-14 items-center justify-center rounded-2xl">
          <CalendarCheck size={26} className="text-accent" />
        </div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-ink/60">{t("subtitle")}</p>
      </div>

      {step === "business" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setStep("owner");
          }}
          className="space-y-3"
        >
          <Field label={t("businessNameLabel")}>
            <input
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full rounded-xl border border-line bg-bg px-4 py-2.5 text-sm outline-none focus:border-accent"
            />
          </Field>
          <Field label={t("languageLabel")}>
            <select
              value={defaultLanguage}
              onChange={(e) => setDefaultLanguage(e.target.value as "en" | "ar")}
              className="w-full rounded-xl border border-line bg-bg px-4 py-2.5 text-sm outline-none focus:border-accent"
            >
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </Field>
          <Field label={t("timezoneLabel")}>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded-xl border border-line bg-bg px-4 py-2.5 text-sm outline-none focus:border-accent"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </Field>
          <button
            type="submit"
            className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            {t("next")}
          </button>
        </form>
      )}

      {step === "owner" && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label={t("ownerEmailLabel")}>
            <input
              required
              type="email"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              className="w-full rounded-xl border border-line bg-bg px-4 py-2.5 text-sm outline-none focus:border-accent"
            />
          </Field>
          <Field label={t("ownerPasswordLabel")}>
            <input
              required
              minLength={8}
              type="password"
              value={ownerPassword}
              onChange={(e) => setOwnerPassword(e.target.value)}
              className="w-full rounded-xl border border-line bg-bg px-4 py-2.5 text-sm outline-none focus:border-accent"
            />
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep("business")}
              className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium"
            >
              {t("back")}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? t("settingUp") : t("finish")}
            </button>
          </div>
        </form>
      )}

      {step === "done" && (
        <div className="space-y-4 text-center">
          <CheckCircle size={40} weight="fill" className="mx-auto text-accent-2" />
          <p className="text-ink/70">{t("doneMessage")}</p>
          <div className="rounded-xl border border-line bg-bg p-4 text-start text-sm text-ink/60">
            {t("paymentReminder")}
          </div>
          <button
            onClick={() => router.push(`/${locale}/admin`)}
            className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            {t("goToDashboard")}
          </button>
        </div>
      )}
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-ink/60">{label}</span>
      {children}
    </label>
  );
}

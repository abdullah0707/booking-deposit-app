"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { UserCircle } from "@phosphor-icons/react";
import { useCustomerAuth } from "@/lib/customerAuth/CustomerAuthContext";
import { ApiError } from "@/lib/api";

export default function CustomerRegisterPage() {
  const t = useTranslations("account.register");
  const { register } = useCustomerAuth();
  const router = useRouter();
  const locale = usePathname().split("/")[1];

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(name, email, password);
      router.push(`/${locale}/my-bookings`);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 409 ? t("emailTaken") : t("genericError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="glass-chip flex h-14 w-14 items-center justify-center rounded-2xl">
            <UserCircle size={26} className="text-accent" />
          </div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-ink/60">{t("subtitle")}</p>
        </div>

        <div className="space-y-3">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("namePlaceholder")}
            className="w-full rounded-xl border border-line bg-bg px-4 py-2.5 text-sm outline-none focus:border-accent"
          />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPlaceholder")}
            className="w-full rounded-xl border border-line bg-bg px-4 py-2.5 text-sm outline-none focus:border-accent"
          />
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("passwordPlaceholder")}
            className="w-full rounded-xl border border-line bg-bg px-4 py-2.5 text-sm outline-none focus:border-accent"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? t("creating") : t("createAccount")}
        </button>

        <p className="text-center text-sm text-ink/60">
          {t("haveAccount")}{" "}
          <button
            type="button"
            onClick={() => router.push(`/${locale}/account/login`)}
            className="font-semibold text-accent hover:underline"
          >
            {t("signIn")}
          </button>
        </p>
      </form>
    </div>
  );
}

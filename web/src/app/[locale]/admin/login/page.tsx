"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarCheck } from "@phosphor-icons/react";
import { useAuth, ApiError } from "@/lib/auth/AuthContext";
import { api } from "@/lib/api";

export default function LoginPage() {
  const t = useTranslations("admin.login");
  const { login } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get<{ installed: boolean }>("/install/status")
      .then((result) => {
        if (!result.installed) router.replace(`/${locale}/install`);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.push(`/${locale}/admin`);
    } catch (err) {
      setError(err instanceof ApiError ? t("invalidCredentials") : t("genericError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="glass-chip flex h-14 w-14 items-center justify-center rounded-2xl">
            <CalendarCheck size={26} className="text-accent" />
          </div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-ink/60">{t("subtitle")}</p>
        </div>

        <div className="space-y-3">
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
          {submitting ? t("signingIn") : t("signIn")}
        </button>
      </form>
    </div>
  );
}

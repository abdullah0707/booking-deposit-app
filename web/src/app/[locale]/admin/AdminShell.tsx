"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CalendarCheck,
  Clock,
  CreditCard,
  PaintBrush,
  Stack,
  SignOut,
  SquaresFour,
  Trash,
  WarningCircle,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/AuthContext";
import { api } from "@/lib/api";

// A fresh install has zero enabled payment methods (Stripe/Paymob need
// .env keys the wizard deliberately doesn't collect; manual methods are
// opt-in). Until the owner fixes that, every customer who reaches the
// booking flow's payment step hits a dead end — so this surfaces on
// every admin page, not just Payment Methods, since that's easy to miss
// on first login.
function PaymentSetupWarning() {
  const t = useTranslations("admin.paymentSetupWarning");
  const router = useRouter();
  const pathname = usePathname();
  const { token } = useAuth();
  const locale = pathname.split("/")[1];
  const [hasEnabledMethod, setHasEnabledMethod] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) return;
    api
      .get<{ enabled: boolean }[]>("/admin/payment-methods", token)
      .then((methods) => setHasEnabledMethod(methods.some((m) => m.enabled)))
      .catch(() => setHasEnabledMethod(null));
  }, [token]);

  if (hasEnabledMethod !== false || pathname.endsWith("/admin/payment-methods")) return null;

  return (
    <button
      onClick={() => router.push(`/${locale}/admin/payment-methods`)}
      className="flex w-full items-center gap-2 rounded-xl border border-amber-600/30 bg-amber-600/10 px-4 py-3 text-start text-sm text-amber-700 transition hover:bg-amber-600/15"
    >
      <WarningCircle size={18} weight="fill" className="shrink-0" />
      {t("message")}
    </button>
  );
}

function AdminNav() {
  const t = useTranslations("admin.nav");
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();
  const locale = pathname.split("/")[1];

  const links = [
    { href: `/${locale}/admin`, label: t("bookings"), icon: CalendarCheck },
    { href: `/${locale}/admin/services`, label: t("services"), icon: SquaresFour },
    { href: `/${locale}/admin/content`, label: t("content"), icon: Stack },
    { href: `/${locale}/admin/business`, label: t("business"), icon: PaintBrush },
    { href: `/${locale}/admin/payment-methods`, label: t("paymentMethods"), icon: CreditCard },
    { href: `/${locale}/admin/settings`, label: t("settings"), icon: Clock },
    { href: `/${locale}/admin/trash`, label: t("trash"), icon: Trash },
  ];

  return (
    <nav className="glass-chip sticky top-4 z-10 mx-auto flex w-fit items-center gap-1 rounded-2xl p-1.5">
      {links.map((link) => {
        const Icon = link.icon;
        const active = pathname === link.href;
        return (
          <button
            key={link.href}
            onClick={() => router.push(link.href)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
              active ? "bg-accent text-white" : "text-ink/70 hover:bg-ink/5"
            }`}
          >
            <Icon size={16} weight={active ? "fill" : "regular"} />
            {link.label}
          </button>
        );
      })}
      <button
        onClick={() => {
          logout();
          router.push(`/${locale}/admin/login`);
        }}
        className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-ink/70 transition hover:bg-ink/5"
      >
        <SignOut size={16} />
      </button>
    </nav>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1];
  const isLoginPage = pathname.endsWith("/admin/login");

  useEffect(() => {
    if (!loading && !token && !isLoginPage) {
      router.replace(`/${locale}/admin/login`);
    }
  }, [loading, token, isLoginPage, locale, router]);

  if (loading) return null;
  if (!token && !isLoginPage) return null;

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-6">
      {!isLoginPage && <AdminNav />}
      {!isLoginPage && <PaymentSetupWarning />}
      {children}
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}

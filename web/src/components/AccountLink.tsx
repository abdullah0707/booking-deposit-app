"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { UserCircle } from "@phosphor-icons/react";
import { useCustomerAuth } from "@/lib/customerAuth/CustomerAuthContext";

// A small, always-visible entry point into the customer account system
// (sign in / my bookings) — otherwise a first-time visitor has no way to
// discover that account-based booking history exists at all.
export function AccountLink() {
  const t = useTranslations("account.link");
  const router = useRouter();
  const locale = usePathname().split("/")[1];
  const { customer, loading } = useCustomerAuth();

  if (loading) return null;

  return (
    <button
      onClick={() => router.push(`/${locale}/${customer ? "my-bookings" : "account/login"}`)}
      className="glass-chip absolute end-4 top-4 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-ink/70 transition hover:text-accent"
    >
      <UserCircle size={14} />
      {customer ? customer.name : t("signIn")}
    </button>
  );
}

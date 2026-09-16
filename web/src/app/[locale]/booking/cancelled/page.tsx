"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { XCircle } from "@phosphor-icons/react";

export default function BookingCancelledPage() {
  const t = useTranslations("booking.cancellation");
  const router = useRouter();
  const locale = usePathname().split("/")[1];

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="glass-chip flex h-16 w-16 items-center justify-center rounded-2xl">
        <XCircle size={28} className="text-ink/50" />
      </div>
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="text-ink/60">{t("subtitle")}</p>
      <button
        onClick={() => router.push(`/${locale}#booking`)}
        className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
      >
        {t("tryAgain")}
      </button>
    </main>
  );
}

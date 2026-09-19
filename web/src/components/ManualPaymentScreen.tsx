"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, UploadSimple } from "@phosphor-icons/react";

interface ManualInstructions {
  instructions?: string;
  accountName?: string;
  qrImageUrl?: string;
}

export function ManualPaymentScreen({
  bookingId,
  instructions,
}: {
  bookingId: string;
  instructions: ManualInstructions;
}) {
  const t = useTranslations("booking.manualPayment");
  const router = useRouter();
  const locale = usePathname().split("/")[1];
  const [file, setFile] = useState<File | null>(null);
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setSubmitting(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      if (reference) body.append("referenceNumber", reference);

      const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
      const res = await fetch(`${API_URL}/bookings/${bookingId}/payment-proof`, {
        method: "POST",
        body,
      });
      if (!res.ok) throw new Error("submit failed");
      setSubmitted(true);
    } catch {
      setError(t("submitError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <div className="glass-chip mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
          <Check size={28} weight="bold" className="text-accent-2" />
        </div>
        <p className="text-lg font-semibold">{t("submitted")}</p>
        <p className="mt-2 text-sm text-ink/60">
          {t("bookingReference")}: {bookingId}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => router.push(`/${locale}`)}
            className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-ink/5"
          >
            {t("backToHome")}
          </button>
          <button
            onClick={() => router.push(`/${locale}/my-bookings`)}
            className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            {t("viewMyBookings")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <p className="mt-1 text-sm text-ink/60">{t("subtitle")}</p>

      <div className="mt-4 space-y-2 rounded-xl border border-line bg-bg p-4 text-sm">
        {instructions.accountName && <p className="font-medium">{instructions.accountName}</p>}
        {instructions.instructions && <p className="text-ink/70">{instructions.instructions}</p>}
        {instructions.qrImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- buyer-supplied QR image, not a build-time asset
          <img src={instructions.qrImageUrl} alt="" className="mt-2 h-40 w-40 rounded-lg object-contain" />
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line px-4 py-3 text-sm text-ink/70 transition hover:border-accent hover:text-accent">
          <UploadSimple size={16} />
          {file ? file.name : t("uploadProof")}
          <input
            required
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
        </label>
        <input
          placeholder={t("referencePlaceholder")}
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          className="w-full rounded-xl border border-line bg-bg px-4 py-2.5 text-sm outline-none focus:border-accent"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting || !file}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? t("uploading") : t("submit")}
        </button>
      </form>
    </div>
  );
}

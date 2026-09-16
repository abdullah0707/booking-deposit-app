"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useFormatter } from "next-intl";
import { CheckCircle, HourglassMedium, XCircle } from "@phosphor-icons/react";
import { api } from "@/lib/api";

interface Booking {
  id: string;
  status: "PENDING_PAYMENT" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  startsAt: string;
  customerName: string;
}

export function ConfirmedContent() {
  const t = useTranslations("booking.confirmation");
  const format = useFormatter();
  const bookingId = useSearchParams().get("bookingId");
  const [booking, setBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (!bookingId) return;

    let tries = 0;
    const MAX_TRIES = 10;

    // Stripe's webhook may land a moment after the browser redirect back,
    // so poll briefly rather than showing "pending" as if it were final —
    // and stop once confirmed or after ~20s so we're not polling forever.
    const interval = setInterval(async () => {
      const result = await api.get<Booking>(`/bookings/${bookingId}`);
      setBooking(result);
      tries += 1;
      if (result.status === "CONFIRMED" || tries >= MAX_TRIES) {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [bookingId]);

  const isConfirmed = booking?.status === "CONFIRMED";
  const isPending = !booking || booking.status === "PENDING_PAYMENT";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="glass-chip flex h-16 w-16 items-center justify-center rounded-2xl">
        {isConfirmed ? (
          <CheckCircle size={30} weight="fill" className="text-accent-2" />
        ) : isPending ? (
          <HourglassMedium size={28} className="text-accent" />
        ) : (
          <XCircle size={28} className="text-red-500" />
        )}
      </div>
      <h1 className="text-2xl font-semibold">
        {isConfirmed ? t("confirmedTitle") : isPending ? t("pendingTitle") : t("failedTitle")}
      </h1>
      {booking && (
        <p className="text-ink/60">
          {format.dateTime(new Date(booking.startsAt), { dateStyle: "full", timeStyle: "short" })}
        </p>
      )}
      <p className="text-sm text-ink/50">{isPending ? t("pendingHint") : ""}</p>
    </main>
  );
}

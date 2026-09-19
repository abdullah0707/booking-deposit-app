"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations, useFormatter } from "next-intl";
import { CaretLeft } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { getMyBookingIds } from "@/lib/myBookings";

type BookingStatus =
  | "PENDING_PAYMENT"
  | "AWAITING_MANUAL_VERIFICATION"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

interface Booking {
  id: string;
  status: BookingStatus;
  startsAt: string;
  depositAmount: string;
}

const STATUS_STYLES: Record<BookingStatus, string> = {
  PENDING_PAYMENT: "bg-amber-100 text-amber-800",
  AWAITING_MANUAL_VERIFICATION: "bg-blue-100 text-blue-800",
  CONFIRMED: "bg-accent-2/15 text-accent-2",
  COMPLETED: "bg-ink/10 text-ink/70",
  CANCELLED: "bg-red-100 text-red-700",
  NO_SHOW: "bg-red-100 text-red-700",
};

// No customer accounts in this product (see backend's "booking id as
// informal capability" trust model) — so this reads whichever booking
// ids this browser has created (see lib/myBookings.ts) and looks each
// one up live via the same public endpoint the confirmation page polls.
export default function MyBookingsPage() {
  const t = useTranslations("booking.myBookings");
  const format = useFormatter();
  const router = useRouter();
  const locale = usePathname().split("/")[1];
  const [bookings, setBookings] = useState<Booking[] | null>(null);

  useEffect(() => {
    // Promise.all([]) resolves to [] on its own — no need to special-case
    // an empty id list with a synchronous setState in the effect body.
    Promise.all(getMyBookingIds().map((id) => api.get<Booking>(`/bookings/${id}`).catch(() => null))).then(
      (results) => setBookings(results.filter((b): b is Booking => b !== null)),
    );
  }, []);

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <button
        onClick={() => router.push(`/${locale}`)}
        className="mb-4 flex items-center gap-1 text-sm text-ink/60 hover:text-ink"
      >
        <CaretLeft size={14} /> {t("backToHome")}
      </button>
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      {!bookings && <p className="mt-4 text-sm text-ink/60">{t("loading")}</p>}
      {bookings?.length === 0 && <p className="mt-4 text-sm text-ink/60">{t("empty")}</p>}

      <div className="mt-4 space-y-2">
        {bookings?.map((booking) => (
          <div key={booking.id} className="flex items-center justify-between rounded-xl border border-line bg-bg px-4 py-3">
            <div>
              <p className="text-sm font-medium">
                {format.dateTime(new Date(booking.startsAt), { dateStyle: "medium", timeStyle: "short" })}
              </p>
              <p className="text-xs text-ink/50">
                {t("deposit")}: {booking.depositAmount}
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[booking.status]}`}>
              {t(`status.${booking.status}`)}
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}

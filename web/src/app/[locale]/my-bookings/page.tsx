"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations, useFormatter } from "next-intl";
import { CaretLeft } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { getMyBookingIds } from "@/lib/myBookings";
import { useCustomerAuth } from "@/lib/customerAuth/CustomerAuthContext";

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
  service?: { name: string };
}

const STATUS_STYLES: Record<BookingStatus, string> = {
  PENDING_PAYMENT: "bg-amber-100 text-amber-800",
  AWAITING_MANUAL_VERIFICATION: "bg-blue-100 text-blue-800",
  CONFIRMED: "bg-accent-2/15 text-accent-2",
  COMPLETED: "bg-ink/10 text-ink/70",
  CANCELLED: "bg-red-100 text-red-700",
  NO_SHOW: "bg-red-100 text-red-700",
};

// Two ways to end up here: signed in with a real account (real history,
// fetched from GET /customers/me/bookings — works across devices), or as
// a guest (fallback to whichever booking ids this browser has created,
// see lib/myBookings.ts — device-local only, no account needed to book).
export default function MyBookingsPage() {
  const t = useTranslations("booking.myBookings");
  const format = useFormatter();
  const router = useRouter();
  const locale = usePathname().split("/")[1];
  const { customer, token, loading: authLoading, logout } = useCustomerAuth();
  const [bookings, setBookings] = useState<Booking[] | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (token) {
      api.get<Booking[]>("/customers/me/bookings", token).then(setBookings);
    } else {
      Promise.all(getMyBookingIds().map((id) => api.get<Booking>(`/bookings/${id}`).catch(() => null))).then(
        (results) => setBookings(results.filter((b): b is Booking => b !== null)),
      );
    }
  }, [authLoading, token]);

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <button
        onClick={() => router.push(`/${locale}`)}
        className="mb-4 flex items-center gap-1 text-sm text-ink/60 hover:text-ink"
      >
        <CaretLeft size={14} /> {t("backToHome")}
      </button>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        {customer ? (
          <button onClick={logout} className="text-sm text-ink/60 hover:text-ink hover:underline">
            {t("logOut")}
          </button>
        ) : (
          !authLoading && (
            <button
              onClick={() => router.push(`/${locale}/account/login`)}
              className="text-sm font-semibold text-accent hover:underline"
            >
              {t("signIn")}
            </button>
          )
        )}
      </div>

      {!customer && !authLoading && (
        <p className="mt-2 rounded-xl border border-line bg-bg px-4 py-3 text-sm text-ink/70">
          {t("guestHint")}
        </p>
      )}

      {!bookings && <p className="mt-4 text-sm text-ink/60">{t("loading")}</p>}
      {bookings?.length === 0 && <p className="mt-4 text-sm text-ink/60">{t("empty")}</p>}

      <div className="mt-4 space-y-2">
        {bookings?.map((booking) => (
          <div key={booking.id} className="flex items-center justify-between rounded-xl border border-line bg-bg px-4 py-3">
            <div>
              {booking.service && <p className="text-sm font-semibold">{booking.service.name}</p>}
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

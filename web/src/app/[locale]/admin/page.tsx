"use client";

import { useEffect, useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { DownloadSimple } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth/AuthContext";
import { api } from "@/lib/api";

type BookingStatus = "PENDING_PAYMENT" | "AWAITING_MANUAL_VERIFICATION" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

interface PaymentProof {
  imageUrl: string;
  referenceNumber?: string | null;
  submittedAt: string;
}

interface Booking {
  id: string;
  customerName: string;
  customerEmail: string;
  startsAt: string;
  endsAt: string;
  status: BookingStatus;
  depositAmount: string;
  service: { name: string };
  paymentProofs?: PaymentProof[];
}

const STATUS_STYLES: Record<BookingStatus, string> = {
  PENDING_PAYMENT: "bg-amber-100 text-amber-800",
  AWAITING_MANUAL_VERIFICATION: "bg-blue-100 text-blue-800",
  CONFIRMED: "bg-accent-2/15 text-accent-2",
  COMPLETED: "bg-ink/10 text-ink/70",
  CANCELLED: "bg-red-100 text-red-700",
  NO_SHOW: "bg-red-100 text-red-700",
};

// Awaiting-verification bookings need the owner's attention first, so
// they float to the top instead of sitting wherever their start time
// happens to sort them — a filter/tab would be equivalent but heavier
// for what's still a small, single-glance list.
function sortBookings(bookings: Booking[]): Booking[] {
  return [...bookings].sort((a, b) => {
    const aPriority = a.status === "AWAITING_MANUAL_VERIFICATION" ? 0 : 1;
    const bPriority = b.status === "AWAITING_MANUAL_VERIFICATION" ? 0 : 1;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
  });
}

export default function BookingsPage() {
  const t = useTranslations("admin.bookings");
  const format = useFormatter();
  const { token } = useAuth();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  function load() {
    if (!token) return;
    api
      .get<Booking[]>("/admin/bookings", token)
      .then(setBookings)
      .catch(() => setError(t("loadError")));
  }

  useEffect(load, [token, t]);

  async function handleConfirm(booking: Booking) {
    setActingId(booking.id);
    setActionError(null);
    try {
      await api.post(`/admin/bookings/${booking.id}/confirm-payment`, {}, token);
      load();
    } catch {
      setActionError(t("actionError"));
    } finally {
      setActingId(null);
    }
  }

  async function handleReject(booking: Booking) {
    setActingId(booking.id);
    setActionError(null);
    try {
      await api.post(`/admin/bookings/${booking.id}/reject-payment`, {}, token);
      load();
    } catch {
      setActionError(t("actionError"));
    } finally {
      setActingId(null);
    }
  }

  async function handleDownloadInvoice(booking: Booking) {
    try {
      await api.download(`/admin/bookings/${booking.id}/invoice.pdf`, `invoice-${booking.id}.pdf`, token);
    } catch {
      setActionError(t("actionError"));
    }
  }

  const sorted = bookings ? sortBookings(bookings) : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {actionError && <p className="text-sm text-red-600">{actionError}</p>}
      {!sorted && !error && <p className="text-sm text-ink/60">{t("loading")}</p>}
      {sorted && sorted.length === 0 && <p className="text-sm text-ink/60">{t("empty")}</p>}

      <div className="space-y-2">
        {sorted?.map((booking) => {
          const latestProof = booking.paymentProofs?.[0];
          const awaitingVerification = booking.status === "AWAITING_MANUAL_VERIFICATION";

          return (
            <div key={booking.id} className="rounded-xl border border-line bg-bg px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{booking.customerName}</p>
                  <p className="text-sm text-ink/60">
                    {booking.service.name} ·{" "}
                    {format.dateTime(new Date(booking.startsAt), { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {booking.status === "CONFIRMED" && (
                    <button
                      onClick={() => handleDownloadInvoice(booking)}
                      className="flex items-center gap-1 rounded-lg p-2 text-ink/50 transition hover:bg-ink/5 hover:text-ink"
                      aria-label={t("downloadInvoice")}
                      title={t("downloadInvoice")}
                    >
                      <DownloadSimple size={16} />
                    </button>
                  )}
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[booking.status]}`}>
                    {t(`status.${booking.status}`)}
                  </span>
                </div>
              </div>

              {awaitingVerification && (
                <div className="mt-3 space-y-2 border-t border-line pt-3">
                  <p className="text-xs font-semibold text-ink/70">{t("proofLabel")}</p>
                  {latestProof ? (
                    <div className="flex items-start gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element -- customer-uploaded proof, not a build-time asset */}
                      <img
                        src={latestProof.imageUrl}
                        alt=""
                        className="h-20 w-20 rounded-lg border border-line object-cover"
                      />
                      {latestProof.referenceNumber && (
                        <p className="text-sm text-ink/60">
                          {t("referenceLabel")}: {latestProof.referenceNumber}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-ink/50">{t("noProofYet")}</p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleConfirm(booking)}
                      disabled={actingId === booking.id}
                      className="rounded-lg bg-accent-2 px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                    >
                      {t("confirmPayment")}
                    </button>
                    <button
                      onClick={() => handleReject(booking)}
                      disabled={actingId === booking.id}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      {t("rejectPayment")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

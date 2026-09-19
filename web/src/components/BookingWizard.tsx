"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { CaretLeft, CaretRight, Check } from "@phosphor-icons/react";
import { api, ApiError } from "@/lib/api";
import { LocationPicker, type LocationValue } from "@/components/LocationPicker";
import { ManualPaymentScreen } from "@/components/ManualPaymentScreen";
import { saveMyBooking } from "@/lib/myBookings";
import { useCustomerAuth } from "@/lib/customerAuth/CustomerAuthContext";

type LocationType = "ON_SITE" | "CUSTOMER_ADDRESS" | "EITHER";

interface Service {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: string;
  depositAmount: string;
  imageUrl?: string | null;
  locationType: LocationType;
}

interface Slot {
  startsAt: string;
  endsAt: string;
}

interface PaymentMethod {
  id: string;
  type: "STRIPE" | "PAYMOB" | "MANUAL";
  label: string;
  config: { instructions?: string; accountName?: string; qrImageUrl?: string };
}

type Step = "service" | "slot" | "details" | "payment";

function nextDays(count: number): Date[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function BookingWizard() {
  const t = useTranslations("booking");
  const format = useFormatter();
  const { customer, token: customerToken } = useCustomerAuth();

  const [step, setStep] = useState<Step>("service");
  const [services, setServices] = useState<Service[] | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const days = useMemo(() => nextDays(7), []);
  const [selectedDate, setSelectedDate] = useState<string>(toDateKey(days[0]));
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState<LocationValue>({ address: "" });
  const [wantsAddress, setWantsAddress] = useState(false); // for EITHER services
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[] | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [manualResult, setManualResult] = useState<{ bookingId: string; instructions: PaymentMethod["config"] } | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Service[]>("/services").then(setServices);
    api.get<PaymentMethod[]>("/payment-methods").then(setPaymentMethods);
  }, []);

  // Signed-in customers shouldn't have to retype what the account already
  // knows — one-time sync from the auth context (which itself resolves
  // async from localStorage), only while both fields are still untouched
  // so it never overwrites someone mid-edit.
  /* eslint-disable-next-line react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!customer) return;
    setName((current) => current || customer.name);
    setEmail((current) => current || customer.email);
  }, [customer]);

  const needsAddress =
    !!selectedService &&
    (selectedService.locationType === "CUSTOMER_ADDRESS" ||
      (selectedService.locationType === "EITHER" && wantsAddress));

  useEffect(() => {
    if (!selectedService) return;
    // Clear the previous service/date's stale slots before the new fetch
    // resolves, so the old times never briefly appear selectable for the
    // new selection.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSlots(null);
    setSelectedSlot(null);
    api
      .get<Slot[]>(`/availability?serviceId=${selectedService.id}&date=${selectedDate}`)
      .then(setSlots)
      .catch(() => setSlots([]));
  }, [selectedService, selectedDate]);

  function handleContinueToPayment(e: React.FormEvent) {
    e.preventDefault();
    setStep("payment");
  }

  async function handleSubmit(method: PaymentMethod) {
    if (!selectedService || !selectedSlot) return;
    setSelectedMethod(method);
    setError(null);
    setSubmitting(true);
    try {
      const result = await api.post<
        { bookingId: string; checkoutUrl: string } | { bookingId: string; instructions: PaymentMethod["config"] }
      >(
        "/bookings",
        {
          serviceId: selectedService.id,
          paymentMethodId: method.id,
          startsAt: selectedSlot.startsAt,
          customerName: name,
          customerEmail: email,
          customerPhone: phone || undefined,
          customerAddress: needsAddress ? location.address : undefined,
          customerLat: needsAddress ? location.lat : undefined,
          customerLng: needsAddress ? location.lng : undefined,
        },
        // Optional — a signed-in customer's booking links to their account
        // (see backend's optionalCustomerAuth); guests just omit this.
        customerToken,
      );
      saveMyBooking(result.bookingId);
      if ("checkoutUrl" in result) {
        // eslint-disable-next-line react-hooks/immutability -- handing off to the external checkout page is a real navigation, not a captured-variable mutation
        window.location.href = result.checkoutUrl;
      } else {
        setManualResult({ bookingId: result.bookingId, instructions: result.instructions });
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(t("slotTaken"));
        setSelectedSlot(null);
        setStep("slot");
      } else {
        setError(t("submitError"));
      }
      setSubmitting(false);
    }
  }

  if (manualResult) {
    return <ManualPaymentScreen bookingId={manualResult.bookingId} instructions={manualResult.instructions} />;
  }

  return (
    <div id="booking" className="mx-auto max-w-xl px-6 pb-24">
      <div className="glass-chip mb-6 flex items-center justify-center gap-2 rounded-2xl p-1.5 text-sm">
        {(["service", "slot", "details", "payment"] as Step[]).map((s, i) => (
          <div
            key={s}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 font-medium ${
              step === s ? "bg-accent text-white" : "text-ink/50"
            }`}
          >
            <span className="text-xs">{i + 1}</span>
            {t(`steps.${s}`)}
          </div>
        ))}
      </div>

      {step === "service" && (
        <div className="space-y-2">
          {!services && <p className="text-sm text-ink/60">{t("loadingServices")}</p>}
          {services?.map((service) => (
            <button
              key={service.id}
              onClick={() => {
                setSelectedService(service);
                setStep("slot");
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-line bg-bg px-4 py-3 text-start transition hover:border-accent"
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-line/20">
                {service.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- buyer-supplied photo, not a build-time asset
                  <img src={service.imageUrl} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium">{service.name}</p>
                <p className="text-sm text-ink/60">
                  {service.durationMinutes} {t("minutes")} · {t("depositOf")} {service.depositAmount}
                </p>
              </div>
              <CaretRight size={16} className="text-ink/40" />
            </button>
          ))}
        </div>
      )}

      {step === "slot" && selectedService && (
        <div className="space-y-4">
          <button
            onClick={() => setStep("service")}
            className="flex items-center gap-1 text-sm text-ink/60 hover:text-ink"
          >
            <CaretLeft size={14} /> {t("back")}
          </button>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {days.map((d) => {
              const key = toDateKey(d);
              const active = key === selectedDate;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(key)}
                  className={`flex shrink-0 flex-col items-center rounded-xl border px-3 py-2 text-xs ${
                    active ? "border-accent bg-accent text-white" : "border-line text-ink/70"
                  }`}
                >
                  <span>{format.dateTime(d, { weekday: "short" })}</span>
                  <span className="font-semibold">{format.dateTime(d, { day: "numeric" })}</span>
                </button>
              );
            })}
          </div>

          {slots === null && <p className="text-sm text-ink/60">{t("loadingSlots")}</p>}
          {slots?.length === 0 && <p className="text-sm text-ink/60">{t("noSlots")}</p>}

          <div className="grid grid-cols-3 gap-2">
            {slots?.map((slot) => (
              <button
                key={slot.startsAt}
                onClick={() => {
                  setSelectedSlot(slot);
                  setStep("details");
                }}
                className="rounded-lg border border-line py-2 text-sm transition hover:border-accent hover:bg-accent/5"
              >
                {format.dateTime(new Date(slot.startsAt), { timeStyle: "short" })}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "details" && selectedService && selectedSlot && (
        <form onSubmit={handleContinueToPayment} className="space-y-4">
          <button
            type="button"
            onClick={() => setStep("slot")}
            className="flex items-center gap-1 text-sm text-ink/60 hover:text-ink"
          >
            <CaretLeft size={14} /> {t("back")}
          </button>

          <div className="rounded-xl border border-line bg-bg px-4 py-3 text-sm">
            <p className="font-medium">{selectedService.name}</p>
            <p className="text-ink/60">
              {format.dateTime(new Date(selectedSlot.startsAt), {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>

          <input
            required
            placeholder={t("namePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-line bg-bg px-4 py-2.5 text-sm outline-none focus:border-accent"
          />
          <input
            required
            type="email"
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-line bg-bg px-4 py-2.5 text-sm outline-none focus:border-accent"
          />
          <input
            type="tel"
            placeholder={t("phonePlaceholder")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-xl border border-line bg-bg px-4 py-2.5 text-sm outline-none focus:border-accent"
          />

          {selectedService.locationType === "EITHER" && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setWantsAddress(false)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                  !wantsAddress ? "border-accent bg-accent/5 text-accent" : "border-line text-ink/60"
                }`}
              >
                {t("eitherAtYourPlace")}
              </button>
              <button
                type="button"
                onClick={() => setWantsAddress(true)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                  wantsAddress ? "border-accent bg-accent/5 text-accent" : "border-line text-ink/60"
                }`}
              >
                {t("eitherAtMyAddress")}
              </button>
            </div>
          )}

          {needsAddress && (
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/70">{t("addressLabel")}</label>
              <LocationPicker value={location} onChange={setLocation} />
            </div>
          )}

          <button
            type="submit"
            disabled={needsAddress && !location.address}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {t("continueToPayment")}
          </button>
        </form>
      )}

      {step === "payment" && selectedService && (
        <div className="space-y-4">
          <button
            onClick={() => setStep("details")}
            className="flex items-center gap-1 text-sm text-ink/60 hover:text-ink"
          >
            <CaretLeft size={14} /> {t("back")}
          </button>

          <p className="text-sm font-medium text-ink/70">{t("choosePaymentMethod")}</p>

          {!paymentMethods && <p className="text-sm text-ink/60">{t("loadingServices")}</p>}

          {paymentMethods?.length === 0 && (
            <p className="rounded-xl border border-line bg-bg px-4 py-3 text-sm text-ink/70">
              {t("noPaymentMethods")}
            </p>
          )}

          <div className="space-y-2">
            {paymentMethods?.map((method) => (
              <button
                key={method.id}
                type="button"
                disabled={submitting}
                onClick={() => handleSubmit(method)}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-start text-sm transition disabled:opacity-50 ${
                  selectedMethod?.id === method.id ? "border-accent bg-accent/5" : "border-line hover:border-accent"
                }`}
              >
                <span className="font-medium">{method.label}</span>
                {submitting && selectedMethod?.id === method.id ? (
                  <span className="text-xs text-ink/50">{t("redirecting")}</span>
                ) : (
                  <Check size={16} className="text-ink/30" />
                )}
              </button>
            ))}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}

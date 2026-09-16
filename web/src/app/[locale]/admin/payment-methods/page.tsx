"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth/AuthContext";
import { api } from "@/lib/api";

type PaymentMethodType = "STRIPE" | "PAYMOB" | "MANUAL";

interface PaymentMethodConfig {
  instructions?: string;
  accountName?: string;
  qrImageUrl?: string;
}

interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  label: string;
  enabled: boolean;
  config: PaymentMethodConfig;
}

const emptyManualForm = { label: "", instructions: "", accountName: "", qrImageUrl: "" };

export default function PaymentMethodsPage() {
  const t = useTranslations("admin.paymentMethods");
  const { token } = useAuth();
  const [methods, setMethods] = useState<PaymentMethod[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualForm, setManualForm] = useState(emptyManualForm);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    if (!token) return;
    api.get<PaymentMethod[]>("/admin/payment-methods", token).then(setMethods);
  }

  useEffect(load, [token]);

  async function handleToggleEnabled(method: PaymentMethod) {
    setError(null);
    try {
      await api.patch(`/admin/payment-methods/${method.id}`, { enabled: !method.enabled }, token);
      load();
    } catch {
      setError(t("saveError"));
    }
  }

  async function handleLabelChange(method: PaymentMethod, label: string) {
    await api.patch(`/admin/payment-methods/${method.id}`, { label }, token);
  }

  async function handleQrSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingQr(true);
    try {
      const result = await api.upload<{ url: string }>("/admin/uploads", file, token);
      setManualForm({ ...manualForm, qrImageUrl: result.url });
    } catch {
      setError(t("saveError"));
    } finally {
      setUploadingQr(false);
    }
  }

  async function handleAddManual(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post(
        "/admin/payment-methods",
        {
          type: "MANUAL",
          label: manualForm.label,
          enabled: true,
          config: {
            instructions: manualForm.instructions,
            accountName: manualForm.accountName || undefined,
            qrImageUrl: manualForm.qrImageUrl || undefined,
          },
        },
        token,
      );
      setManualForm(emptyManualForm);
      load();
    } catch {
      setError(t("saveError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-ink/60">{t("subtitle")}</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {methods && methods.filter((m) => m.enabled).length === 0 && (
        <p className="rounded-xl border border-amber-600/30 bg-amber-600/10 px-4 py-3 text-sm text-amber-700">
          {t("noneEnabledWarning")}
        </p>
      )}

      <div className="space-y-2">
        {methods?.map((method) => (
          <div key={method.id} className="rounded-xl border border-line bg-bg p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-ink/5 px-2.5 py-1 text-xs font-medium text-ink/60">
                  {t(`type.${method.type}`)}
                </span>
                <input
                  defaultValue={method.label}
                  onBlur={(e) => handleLabelChange(method, e.target.value)}
                  className="rounded-lg border border-line bg-bg px-3 py-1.5 text-sm outline-none focus:border-accent"
                />
              </div>
              <button
                onClick={() => handleToggleEnabled(method)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  method.enabled ? "bg-accent-2/15 text-accent-2" : "bg-ink/10 text-ink/60"
                }`}
              >
                {method.enabled ? t("enable") : t("disable")}
              </button>
            </div>
            {method.type === "MANUAL" && method.config.instructions && (
              <p className="mt-2 text-sm text-ink/60">{method.config.instructions}</p>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleAddManual} className="space-y-3 rounded-xl border border-line p-4">
        <h2 className="text-sm font-semibold text-ink/70">{t("addManual")}</h2>
        <input
          required
          placeholder={t("manualLabelPlaceholder")}
          value={manualForm.label}
          onChange={(e) => setManualForm({ ...manualForm, label: e.target.value })}
          className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <textarea
          required
          rows={3}
          placeholder={t("instructionsPlaceholder")}
          value={manualForm.instructions}
          onChange={(e) => setManualForm({ ...manualForm, instructions: e.target.value })}
          className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <input
          placeholder={t("accountNamePlaceholder")}
          value={manualForm.accountName}
          onChange={(e) => setManualForm({ ...manualForm, accountName: e.target.value })}
          className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <div className="flex items-center gap-3">
          <div className="glass-chip flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl">
            {manualForm.qrImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- buyer-supplied QR image, not a build-time asset
              <img src={manualForm.qrImageUrl} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-line px-3 py-1.5 text-xs font-medium text-ink/70 transition hover:border-accent hover:text-accent">
            <Plus size={12} weight="bold" />
            {uploadingQr ? t("uploading") : t("uploadQr")}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleQrSelect}
              disabled={uploadingQr}
              className="hidden"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          <Plus size={16} weight="bold" />
          {t("add")}
        </button>
      </form>
    </div>
  );
}

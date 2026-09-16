"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash, PencilSimple } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth/AuthContext";
import { api } from "@/lib/api";
import { ServiceCard } from "@/components/ServiceCard";

type LocationType = "ON_SITE" | "CUSTOMER_ADDRESS" | "EITHER";

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  price: string;
  depositAmount: string;
  imageUrl?: string | null;
  locationType: LocationType;
  active: boolean;
}

const LOCATION_TYPES: LocationType[] = ["ON_SITE", "CUSTOMER_ADDRESS", "EITHER"];

const emptyForm = {
  name: "",
  durationMinutes: 60,
  price: "",
  depositAmount: "",
  locationType: "ON_SITE" as LocationType,
};

export default function ServicesPage() {
  const t = useTranslations("admin.services");
  const { token } = useAuth();
  const [services, setServices] = useState<Service[] | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [newPhotoUrl, setNewPhotoUrl] = useState<string | null>(null);
  const [uploadingNew, setUploadingNew] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [savingEdit, setSavingEdit] = useState(false);

  function load() {
    if (!token) return;
    api.get<Service[]>("/services", token).then(setServices);
  }

  useEffect(load, [token]);

  async function uploadPhoto(file: File): Promise<string | null> {
    setUploadError(false);
    try {
      const result = await api.upload<{ url: string }>("/admin/uploads", file, token);
      return result.url;
    } catch {
      setUploadError(true);
      return null;
    }
  }

  async function handleNewPhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingNew(true);
    const url = await uploadPhoto(file);
    if (url) setNewPhotoUrl(url);
    setUploadingNew(false);
  }

  async function handleExistingPhotoSelect(service: Service, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingId(service.id);
    const url = await uploadPhoto(file);
    if (url) {
      await api.patch(`/admin/services/${service.id}`, { imageUrl: url }, token);
      load();
    }
    setUploadingId(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post(
        "/admin/services",
        {
          name: form.name,
          durationMinutes: Number(form.durationMinutes),
          price: Number(form.price),
          depositAmount: Number(form.depositAmount),
          imageUrl: newPhotoUrl,
          locationType: form.locationType,
        },
        token,
      );
      setForm(emptyForm);
      setNewPhotoUrl(null);
      load();
    } catch {
      setError(t("saveError"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    await api.delete(`/admin/services/${id}`, token);
    load();
  }

  async function handleLocationTypeChange(service: Service, locationType: LocationType) {
    await api.patch(`/admin/services/${service.id}`, { locationType }, token);
    load();
  }

  function startEdit(service: Service) {
    setEditingId(service.id);
    setEditForm({
      name: service.name,
      durationMinutes: service.durationMinutes,
      price: service.price,
      depositAmount: service.depositAmount,
      locationType: service.locationType,
    });
  }

  async function handleSaveEdit(id: string) {
    setSavingEdit(true);
    try {
      await api.patch(
        `/admin/services/${id}`,
        {
          name: editForm.name,
          durationMinutes: Number(editForm.durationMinutes),
          price: Number(editForm.price),
          depositAmount: Number(editForm.depositAmount),
        },
        token,
      );
      setEditingId(null);
      load();
    } catch {
      setError(t("saveError"));
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services?.map((service) =>
          editingId === service.id ? (
            <div key={service.id} className="space-y-2 rounded-xl border border-accent p-3">
              <input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder={t("namePlaceholder")}
                className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  min={5}
                  value={editForm.durationMinutes}
                  onChange={(e) => setEditForm({ ...editForm, durationMinutes: Number(e.target.value) })}
                  placeholder={t("durationPlaceholder")}
                  className="rounded-lg border border-line bg-bg px-2 py-2 text-sm outline-none focus:border-accent"
                />
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={editForm.price}
                  onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                  placeholder={t("pricePlaceholder")}
                  className="rounded-lg border border-line bg-bg px-2 py-2 text-sm outline-none focus:border-accent"
                />
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={editForm.depositAmount}
                  onChange={(e) => setEditForm({ ...editForm, depositAmount: e.target.value })}
                  placeholder={t("depositPlaceholder")}
                  className="rounded-lg border border-line bg-bg px-2 py-2 text-sm outline-none focus:border-accent"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSaveEdit(service.id)}
                  disabled={savingEdit}
                  className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  {t("save")}
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink/70 transition hover:bg-ink/5"
                >
                  {t("cancel")}
                </button>
              </div>
            </div>
          ) : (
            <div key={service.id} className="space-y-2">
              <ServiceCard
                name={service.name}
                imageUrl={service.imageUrl}
                subtitle={`${service.durationMinutes} ${t("minutes")} · ${t("deposit")} ${service.depositAmount}`}
                priceLabel={service.price}
                actions={
                  <>
                    <label className="glass-chip flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-white">
                      <Plus size={14} weight="bold" />
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={(e) => handleExistingPhotoSelect(service, e)}
                        disabled={uploadingId === service.id}
                        className="hidden"
                      />
                    </label>
                    <button
                      onClick={() => startEdit(service)}
                      className="glass-chip flex h-8 w-8 items-center justify-center rounded-lg text-white transition hover:text-accent"
                      aria-label={t("edit")}
                    >
                      <PencilSimple size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(service.id)}
                      className="glass-chip flex h-8 w-8 items-center justify-center rounded-lg text-white transition hover:text-red-300"
                      aria-label={t("delete")}
                    >
                      <Trash size={14} />
                    </button>
                  </>
                }
              />
              <select
                value={service.locationType}
                onChange={(e) => handleLocationTypeChange(service, e.target.value as LocationType)}
                className="w-full rounded-lg border border-line bg-bg px-2 py-1.5 text-xs outline-none focus:border-accent"
              >
                {LOCATION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`locationType.${type}`)}
                  </option>
                ))}
              </select>
            </div>
          ),
        )}
        {services?.length === 0 && <p className="text-sm text-ink/60">{t("empty")}</p>}
      </div>

      <form onSubmit={handleCreate} className="space-y-3 rounded-xl border border-line p-4">
        <h2 className="text-sm font-semibold text-ink/70">{t("addService")}</h2>
        <div className="flex items-center gap-3">
          <div className="glass-chip flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl">
            {newPhotoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- buyer-supplied photo, not a build-time asset
              <img src={newPhotoUrl} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-line px-3 py-1.5 text-xs font-medium text-ink/70 transition hover:border-accent hover:text-accent">
            <Plus size={12} weight="bold" />
            {uploadingNew ? t("uploading") : t("uploadPhoto")}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleNewPhotoSelect}
              disabled={uploadingNew}
              className="hidden"
            />
          </label>
        </div>
        {uploadError && <p className="text-xs text-red-600">{t("uploadError")}</p>}
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/70">{t("locationLabel")}</label>
          <select
            value={form.locationType}
            onChange={(e) => setForm({ ...form, locationType: e.target.value as LocationType })}
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
          >
            {LOCATION_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`locationType.${type}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input
            required
            placeholder={t("namePlaceholder")}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="col-span-2 rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            required
            type="number"
            min={5}
            placeholder={t("durationPlaceholder")}
            value={form.durationMinutes}
            onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
            className="rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            required
            type="number"
            min={0}
            step="0.01"
            placeholder={t("pricePlaceholder")}
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className="rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            required
            type="number"
            min={0}
            step="0.01"
            placeholder={t("depositPlaceholder")}
            value={form.depositAmount}
            onChange={(e) => setForm({ ...form, depositAmount: e.target.value })}
            className="rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          <Plus size={16} weight="bold" />
          {t("addService")}
        </button>
      </form>
    </div>
  );
}

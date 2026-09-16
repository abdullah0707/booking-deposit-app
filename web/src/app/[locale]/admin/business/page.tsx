"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth/AuthContext";
import { api } from "@/lib/api";

interface Business {
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
}

const DEFAULT_COLOR = "#c0684b";

export default function BusinessPage() {
  const t = useTranslations("admin.business");
  const { token } = useAuth();

  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.get<Business>("/admin/business", token).then((business) => {
      setName(business.name);
      setLogoUrl(business.logoUrl);
      setColor(business.primaryColor ?? DEFAULT_COLOR);
    });
  }, [token]);

  async function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setUploadError(false);
    try {
      const result = await api.upload<{ url: string }>("/admin/uploads", file, token);
      setLogoUrl(result.url);
    } catch {
      setUploadError(true);
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await api.patch("/admin/business", { name, logoUrl, primaryColor: color }, token);
    setSaving(false);
    setSaved(true);
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-ink/60">{t("subtitle")}</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">{t("nameLabel")}</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <p className="text-xs text-ink/50">{t("nameHint")}</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">{t("logoLabel")}</label>
        <div className="flex items-center gap-3">
          <div className="glass-chip flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- buyer-supplied logo, not a build-time asset
              <img src={logoUrl} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-line px-3 py-1.5 text-xs font-medium text-ink/70 transition hover:border-accent hover:text-accent">
            <Plus size={12} weight="bold" />
            {uploading ? t("uploading") : t("uploadLogo")}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleLogoSelect}
              disabled={uploading}
              className="hidden"
            />
          </label>
          {logoUrl && (
            <button
              onClick={() => setLogoUrl(null)}
              className="text-xs text-red-600 hover:underline"
            >
              {t("removeLogo")}
            </button>
          )}
        </div>
        {uploadError && <p className="text-xs text-red-600">{t("uploadError")}</p>}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">{t("colorLabel")}</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-10 w-14 cursor-pointer rounded-lg border border-line bg-bg"
          />
          <input
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-32 rounded-lg border border-line bg-bg px-3 py-2 text-sm uppercase outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {saving ? t("saving") : t("save")}
        </button>
        {saved && <span className="text-sm text-accent-2">{t("saved")}</span>}
      </div>
    </div>
  );
}

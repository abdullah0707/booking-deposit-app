"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowCounterClockwise, File, Stack } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth/AuthContext";
import { api } from "@/lib/api";

interface TrashedPage {
  id: string;
  title: string;
  daysUntilPermanentDelete: number;
}

interface TrashedSection {
  id: string;
  type: string;
  page: { title: string };
  daysUntilPermanentDelete: number;
}

export default function TrashPage() {
  const t = useTranslations("admin.trash");
  const tContent = useTranslations("admin.content");
  const { token } = useAuth();
  const [pages, setPages] = useState<TrashedPage[] | null>(null);
  const [sections, setSections] = useState<TrashedSection[] | null>(null);

  async function load() {
    if (!token) return;
    const result = await api.get<{ pages: TrashedPage[]; sections: TrashedSection[] }>(
      "/admin/trash",
      token,
    );
    setPages(result.pages);
    setSections(result.sections);
  }

  // load() sets state only after its own await resolves, not synchronously
  // in this effect body — the standard fetch-on-mount pattern, not the
  // cascading-render case react-hooks/set-state-in-effect targets.
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    load();
  }, [token]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  async function restorePage(id: string) {
    await api.post(`/admin/pages/${id}/restore`, {}, token);
    load();
  }

  async function restoreSection(id: string) {
    await api.post(`/admin/sections/${id}/restore`, {}, token);
    load();
  }

  const isEmpty = pages?.length === 0 && sections?.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-ink/60">{t("subtitle")}</p>
      </div>

      {isEmpty && <p className="text-sm text-ink/60">{t("empty")}</p>}

      <div className="space-y-2">
        {pages?.map((page) => (
          <div
            key={page.id}
            className="flex items-center justify-between rounded-xl border border-line bg-bg px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <File size={18} className="text-ink/40" />
              <div>
                <p className="text-xs text-ink/50">{t("pageLabel")}</p>
                <p className="font-medium">{page.title}</p>
              </div>
            </div>
            <RestoreButton
              daysLeft={page.daysUntilPermanentDelete}
              label={t("restore")}
              daysLeftText={t("daysLeft", { days: page.daysUntilPermanentDelete })}
              onRestore={() => restorePage(page.id)}
            />
          </div>
        ))}

        {sections?.map((section) => (
          <div
            key={section.id}
            className="flex items-center justify-between rounded-xl border border-line bg-bg px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <Stack size={18} className="text-ink/40" />
              <div>
                <p className="text-xs text-ink/50">{t("sectionLabel", { page: section.page.title })}</p>
                <p className="font-medium">{tContent(`sectionType.${section.type}`)}</p>
              </div>
            </div>
            <RestoreButton
              daysLeft={section.daysUntilPermanentDelete}
              label={t("restore")}
              daysLeftText={t("daysLeft", { days: section.daysUntilPermanentDelete })}
              onRestore={() => restoreSection(section.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function RestoreButton({
  daysLeft,
  daysLeftText,
  label,
  onRestore,
}: {
  daysLeft: number;
  daysLeftText: string;
  label: string;
  onRestore: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={`text-xs ${daysLeft <= 5 ? "text-red-600" : "text-ink/50"}`}>
        {daysLeftText}
      </span>
      <button
        onClick={onRestore}
        className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium transition hover:border-accent hover:text-accent"
      >
        <ArrowCounterClockwise size={14} />
        {label}
      </button>
    </div>
  );
}

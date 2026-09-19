"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { CaretDown, CaretUp, Pencil, Plus, Translate, Trash } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth/AuthContext";
import { api, ApiError } from "@/lib/api";
import { SECTION_LIBRARY, SECTION_TYPES, type Page, type Section, type SectionType } from "@/lib/sections/types";

export default function ContentPage() {
  const t = useTranslations("admin.content");
  const { token } = useAuth();

  const [pages, setPages] = useState<Page[] | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [sections, setSections] = useState<Section[] | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [newPageTitle, setNewPageTitle] = useState("");
  const [newPageSlug, setNewPageSlug] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function loadPages() {
    if (!token) return;
    const result = await api.get<Page[]>("/admin/pages", token);
    setPages(result);
    if (!selectedPageId && result.length > 0) setSelectedPageId(result[0].id);
  }

  async function loadSections(pageId: string) {
    // The admin-only endpoint, not the public GET /pages/:slug — this one
    // returns each section's raw {en, ar} content so the editor can show
    // (and let the owner edit) both languages, instead of the single
    // resolved-locale string the public storefront/app render from.
    const result = await api.get<Section[]>(`/admin/sections?pageId=${pageId}`, token);
    setSections(result);
  }

  // loadPages()/loadSections() only setState after their own await
  // resolves — the standard fetch-on-mount/fetch-on-change pattern, not
  // the synchronous-cascading-render case react-hooks/set-state-in-effect
  // targets. Deps are intentionally the trigger values, not the loader
  // functions themselves (those would need to be memoized to be safe deps).
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    loadPages();
  }, [token]);

  useEffect(() => {
    if (selectedPageId) loadSections(selectedPageId);
  }, [selectedPageId, pages]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  async function handleCreatePage(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const page = await api.post<Page>(
        "/admin/pages",
        { title: newPageTitle, slug: newPageSlug },
        token,
      );
      setNewPageTitle("");
      setNewPageSlug("");
      await loadPages();
      setSelectedPageId(page.id);
    } catch {
      setError(t("saveError"));
    }
  }

  async function handleDeletePage(id: string) {
    await api.delete(`/admin/pages/${id}`, token);
    setSelectedPageId(null);
    await loadPages();
  }

  async function handleAddSection(type: SectionType) {
    if (!selectedPageId) return;
    await api.post(
      "/admin/sections",
      { pageId: selectedPageId, type, contentJson: SECTION_LIBRARY[type].defaultContent },
      token,
    );
    await loadSections(selectedPageId);
  }

  async function handleDeleteSection(id: string) {
    await api.delete(`/admin/sections/${id}`, token);
    if (selectedPageId) await loadSections(selectedPageId);
  }

  async function handleReorder(section: Section, direction: "up" | "down") {
    if (!sections) return;
    const idx = sections.findIndex((s) => s.id === section.id);
    const swapWith = direction === "up" ? sections[idx - 1] : sections[idx + 1];
    if (!swapWith) return;

    await Promise.all([
      api.patch(`/admin/sections/${section.id}`, { order: swapWith.order }, token),
      api.patch(`/admin/sections/${swapWith.id}`, { order: section.order }, token),
    ]);
    if (selectedPageId) await loadSections(selectedPageId);
  }

  async function handleSaveContent(section: Section, contentJson: Record<string, unknown>) {
    try {
      await api.patch(`/admin/sections/${section.id}`, { contentJson }, token);
      setEditingSectionId(null);
      if (selectedPageId) await loadSections(selectedPageId);
    } catch {
      setError(t("saveError"));
    }
  }

  const selectedPage = pages?.find((p) => p.id === selectedPageId) ?? null;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold tracking-wide text-ink/50 uppercase">
          {t("pagesLabel")}
        </h2>
        <div className="flex flex-wrap gap-2">
          {pages?.map((page) => (
            <button
              key={page.id}
              onClick={() => setSelectedPageId(page.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                page.id === selectedPageId
                  ? "bg-accent text-white"
                  : "border border-line text-ink/70"
              }`}
            >
              {page.title}
            </button>
          ))}
        </div>

        <form onSubmit={handleCreatePage} className="flex flex-wrap gap-2">
          <input
            required
            placeholder={t("pageTitlePlaceholder")}
            value={newPageTitle}
            onChange={(e) => setNewPageTitle(e.target.value)}
            className="rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            required
            placeholder={t("pageSlugPlaceholder")}
            value={newPageSlug}
            onChange={(e) => setNewPageSlug(e.target.value.toLowerCase())}
            className="rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white"
          >
            <Plus size={14} weight="bold" />
            {t("newPage")}
          </button>
        </form>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </section>

      {selectedPage && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold tracking-wide text-ink/50 uppercase">
              {t("sectionsLabel")} — {selectedPage.title}
            </h2>
            <button
              onClick={() => handleDeletePage(selectedPage.id)}
              className="flex items-center gap-1 text-xs text-red-600 hover:underline"
            >
              <Trash size={12} />
              {t("deletePage")}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {SECTION_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => handleAddSection(type)}
                className="rounded-lg border border-dashed border-line px-3 py-1.5 text-xs font-medium text-ink/70 transition hover:border-accent hover:text-accent"
              >
                + {t(`sectionType.${type}`)}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {sections?.length === 0 && <p className="text-sm text-ink/60">{t("noSections")}</p>}
            {sections?.map((section, i) => (
              <SectionRow
                key={section.id}
                section={section}
                isFirst={i === 0}
                isLast={i === (sections?.length ?? 0) - 1}
                editing={editingSectionId === section.id}
                onEdit={() => setEditingSectionId(section.id)}
                onCancelEdit={() => setEditingSectionId(null)}
                onDelete={() => handleDeleteSection(section.id)}
                onMoveUp={() => handleReorder(section, "up")}
                onMoveDown={() => handleReorder(section, "down")}
                onSave={(content) => handleSaveContent(section, content)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SectionRow({
  section,
  isFirst,
  isLast,
  editing,
  onEdit,
  onCancelEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onSave,
}: {
  section: Section;
  isFirst: boolean;
  isLast: boolean;
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSave: (content: Record<string, unknown>) => void;
}) {
  const t = useTranslations("admin.content");
  const [draft, setDraft] = useState<Record<string, unknown>>(section.contentJson);

  return (
    <div className="rounded-xl border border-line bg-bg p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{t(`sectionType.${section.type}`)}</span>
        <div className="flex items-center gap-1 text-ink/50">
          <button disabled={isFirst} onClick={onMoveUp} className="rounded p-1.5 hover:bg-ink/5 disabled:opacity-30">
            <CaretUp size={14} />
          </button>
          <button disabled={isLast} onClick={onMoveDown} className="rounded p-1.5 hover:bg-ink/5 disabled:opacity-30">
            <CaretDown size={14} />
          </button>
          <button
            onClick={() => (editing ? onCancelEdit() : onEdit())}
            className="rounded p-1.5 hover:bg-ink/5"
          >
            <Pencil size={14} />
          </button>
          <button onClick={onDelete} className="rounded p-1.5 hover:bg-red-50 hover:text-red-600">
            <Trash size={14} />
          </button>
        </div>
      </div>

      {editing && (
        <div className="mt-3 space-y-2 border-t border-line pt-3">
          <SectionFields type={section.type} value={draft} onChange={setDraft} />
          <button
            onClick={() => onSave(draft)}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white"
          >
            {t("save")}
          </button>
        </div>
      )}
    </div>
  );
}

function SectionFields({
  type,
  value,
  onChange,
}: {
  type: Section["type"];
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
}) {
  const t = useTranslations("admin.content");

  const textField = (key: string, label: string) => (
    <LocalizedTextField
      key={key}
      label={label}
      value={value[key] as { en?: string; ar?: string } | string | undefined}
      onChange={(next) => onChange({ ...value, [key]: next })}
    />
  );

  switch (type) {
    case "HERO":
      return (
        <>
          {textField("title", t("fields.title"))}
          {textField("subtitle", t("fields.subtitle"))}
          {textField("ctaLabel", t("fields.ctaLabel"))}
        </>
      );
    case "SERVICE_LIST":
    case "PRICING":
      return <>{textField("title", t("fields.title"))}</>;
    case "CONTACT_FORM":
      return (
        <>
          {textField("title", t("fields.title"))}
          {textField("description", t("fields.description"))}
        </>
      );
    case "GALLERY":
      return <GalleryField value={value} onChange={onChange} />;
    case "CALENDAR":
      return <p className="text-xs text-ink/50">{t("noSettings")}</p>;
  }
}

// Every buyer-authored text field is bilingual (EN/AR), shown as two
// inputs with a one-way "translate this into the other language" button
// on each — the owner can always just type both by hand, so a missing/
// failing GOOGLE_TRANSLATE_API_KEY (see backend/.env.example) degrades to
// that rather than blocking anything.
function LocalizedTextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: { en?: string; ar?: string } | string | undefined;
  onChange: (value: { en?: string; ar?: string }) => void;
}) {
  const t = useTranslations("admin.content");
  const { token } = useAuth();
  const [translating, setTranslating] = useState<"en" | "ar" | null>(null);
  const [translateError, setTranslateError] = useState<string | null>(null);

  // Content saved before this feature existed is a plain string — treat
  // it as the English side rather than losing it.
  const current = typeof value === "string" ? { en: value, ar: "" } : (value ?? {});
  const en = current.en ?? "";
  const ar = current.ar ?? "";

  async function handleTranslate(from: "en" | "ar", to: "en" | "ar") {
    const text = from === "en" ? en : ar;
    if (!text) return;
    setTranslating(to);
    setTranslateError(null);
    try {
      const result = await api.post<{ translatedText: string }>(
        "/admin/translate",
        { text, target: to },
        token,
      );
      onChange({ ...current, [to]: result.translatedText });
    } catch (err) {
      setTranslateError(
        err instanceof ApiError && err.status === 501 ? t("fields.translateNotConfigured") : t("fields.translateError"),
      );
    } finally {
      setTranslating(null);
    }
  }

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-ink/50">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          placeholder="English"
          value={en}
          onChange={(e) => onChange({ ...current, en: e.target.value })}
          className="w-full rounded-lg border border-line bg-bg px-3 py-1.5 text-sm outline-none focus:border-accent"
        />
        <button
          type="button"
          title={t("fields.translateToAr")}
          disabled={!en || translating !== null}
          onClick={() => handleTranslate("en", "ar")}
          className="shrink-0 rounded-lg border border-line p-1.5 text-ink/50 transition hover:border-accent hover:text-accent disabled:opacity-30"
        >
          <Translate size={14} className={translating === "ar" ? "animate-pulse" : ""} />
        </button>
      </div>
      <div className="flex items-center gap-1.5">
        <input
          dir="rtl"
          placeholder="العربي"
          value={ar}
          onChange={(e) => onChange({ ...current, ar: e.target.value })}
          className="w-full rounded-lg border border-line bg-bg px-3 py-1.5 text-sm outline-none focus:border-accent"
        />
        <button
          type="button"
          title={t("fields.translateToEn")}
          disabled={!ar || translating !== null}
          onClick={() => handleTranslate("ar", "en")}
          className="shrink-0 rounded-lg border border-line p-1.5 text-ink/50 transition hover:border-accent hover:text-accent disabled:opacity-30"
        >
          <Translate size={14} className={translating === "en" ? "animate-pulse" : ""} />
        </button>
      </div>
      {translateError && <p className="text-xs text-red-600">{translateError}</p>}
    </div>
  );
}

function GalleryField({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
}) {
  const t = useTranslations("admin.content");
  const { token } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(false);

  const imageUrls = (value.imageUrls as string[]) ?? [];

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file after an error
    if (!file) return;

    setUploading(true);
    setUploadError(false);
    try {
      const result = await api.upload<{ url: string }>("/admin/uploads", file, token);
      onChange({ ...value, imageUrls: [...imageUrls, result.url] });
    } catch {
      setUploadError(true);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <textarea
        placeholder={t("fields.imageUrls")}
        value={imageUrls.join("\n")}
        onChange={(e) => onChange({ ...value, imageUrls: e.target.value.split("\n").filter(Boolean) })}
        rows={4}
        className="w-full rounded-lg border border-line bg-bg px-3 py-1.5 text-sm outline-none focus:border-accent"
      />
      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-line px-3 py-1.5 text-xs font-medium text-ink/70 transition hover:border-accent hover:text-accent">
        <Plus size={12} weight="bold" />
        {uploading ? t("fields.uploading") : t("fields.uploadImage")}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
        />
      </label>
      {uploadError && <p className="text-xs text-red-600">{t("fields.uploadError")}</p>}
    </div>
  );
}

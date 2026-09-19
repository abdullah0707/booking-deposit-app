import { getTranslations } from "next-intl/server";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import { BookingWizard } from "@/components/BookingWizard";
import type { Page } from "@/lib/sections/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function fetchHomePage(locale: string): Promise<Page | null> {
  try {
    const res = await fetch(`${API_URL}/pages/home?locale=${locale}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as Page;
  } catch {
    return null;
  }
}

async function fetchBusinessLogo(): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/business`, { cache: "no-store" });
    if (!res.ok) return null;
    const business = (await res.json()) as { logoUrl: string | null };
    return business.logoUrl;
  } catch {
    return null;
  }
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [page, businessLogoUrl] = await Promise.all([fetchHomePage(locale), fetchBusinessLogo()]);

  // No "home" page content configured yet (fresh install, before the
  // owner has used the content editor) — fall back to a working default
  // rather than showing a blank storefront.
  if (!page || !page.sections || page.sections.length === 0) {
    const t = await getTranslations("home");
    return (
      <main className="min-h-screen">
        <div className="mx-auto flex flex-col items-center gap-6 px-6 pt-20 pb-12 text-center">
          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-[0.14em] text-accent uppercase">
              {t("kicker")}
            </p>
            <h1 className="text-4xl font-semibold text-balance sm:text-5xl">{t("title")}</h1>
            <p className="mx-auto max-w-xl text-lg text-ink/70">{t("subtitle")}</p>
          </div>
        </div>
        <BookingWizard />
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      {page.sections.map((section) => (
        <SectionRenderer key={section.id} section={section} businessLogoUrl={businessLogoUrl} />
      ))}
    </main>
  );
}

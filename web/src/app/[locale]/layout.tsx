import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Sans_Arabic } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, rtlLocales } from "@/i18n/routing";
import { AuthProvider } from "@/lib/auth/AuthContext";
import "../globals.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function fetchBusinessBranding(): Promise<{ primaryColor: string | null } | null> {
  try {
    const res = await fetch(`${API_URL}/business`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as { primaryColor: string | null };
  } catch {
    return null;
  }
}

const plexSans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexSansArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-sans-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "app" });
  return { title: t("name") };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  setRequestLocale(locale);

  const dir = rtlLocales.includes(locale) ? "rtl" : "ltr";
  const branding = await fetchBusinessBranding();

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      style={branding?.primaryColor ? ({ "--accent": branding.primaryColor } as React.CSSProperties) : undefined}
    >
      <body
        className={`${plexSans.variable} ${plexSansArabic.variable} min-h-screen bg-bg text-ink antialiased`}
      >
        <NextIntlClientProvider>
          <AuthProvider>{children}</AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

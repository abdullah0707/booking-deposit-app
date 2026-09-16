import { CalendarCheck } from "@phosphor-icons/react/dist/ssr";

export function HeroSection({
  content,
  logoUrl,
}: {
  content: { title?: string; subtitle?: string; ctaLabel?: string };
  logoUrl?: string | null;
}) {
  return (
    <div className="mx-auto flex flex-col items-center gap-6 px-6 pt-20 pb-12 text-center">
      <div className="glass-chip flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- buyer-supplied logo, not a build-time asset
          <img src={logoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <CalendarCheck size={28} weight="regular" className="text-accent" />
        )}
      </div>
      <div className="space-y-3">
        {content.title && <h1 className="text-4xl font-semibold text-balance sm:text-5xl">{content.title}</h1>}
        {content.subtitle && <p className="mx-auto max-w-xl text-lg text-ink/70">{content.subtitle}</p>}
      </div>
      {content.ctaLabel && (
        <a
          href="#booking"
          className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          {content.ctaLabel}
        </a>
      )}
    </div>
  );
}

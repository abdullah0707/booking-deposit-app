import { Image as ImageIcon } from "@phosphor-icons/react/dist/ssr";

export function ServiceCard({
  name,
  imageUrl,
  priceLabel,
  subtitle,
  actions,
  onClick,
}: {
  name: string;
  imageUrl?: string | null;
  priceLabel?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  onClick?: () => void;
}) {
  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      onClick={onClick}
      className={`group relative flex w-full flex-col overflow-hidden rounded-2xl border border-line bg-bg text-start transition ${
        onClick ? "hover:border-accent/50 hover:shadow-md" : ""
      }`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-line/20">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- buyer-supplied service photo, not a build-time asset
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon size={28} className="text-ink/25" />
          </div>
        )}
        {imageUrl && (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
        )}
        {actions && <div className="absolute top-2 end-2 flex gap-1">{actions}</div>}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="font-semibold">{name}</p>
        {subtitle && <p className="text-xs text-ink/60">{subtitle}</p>}
        {priceLabel && <p className="mt-auto pt-1 text-lg font-semibold text-accent">{priceLabel}</p>}
      </div>
    </Wrapper>
  );
}

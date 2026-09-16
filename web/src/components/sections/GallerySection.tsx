/* eslint-disable @next/next/no-img-element -- gallery URLs are arbitrary
   buyer-supplied images, not part of the Next.js-optimized asset pipeline */
export function GallerySection({ content }: { content: { imageUrls?: string[] } }) {
  const urls = content.imageUrls ?? [];
  if (urls.length === 0) return null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {urls.map((url) => (
          <img key={url} src={url} alt="" className="aspect-square w-full rounded-xl object-cover" />
        ))}
      </div>
    </div>
  );
}

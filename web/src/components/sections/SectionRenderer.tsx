import type { Section } from "@/lib/sections/types";
import { HeroSection } from "./HeroSection";
import { ServiceListSection } from "./ServiceListSection";
import { CalendarSection } from "./CalendarSection";
import { ContactFormSection } from "./ContactFormSection";
import { GallerySection } from "./GallerySection";
import { PricingSection } from "./PricingSection";

/** The bounded section library's public-render registry (plan §2.4) —
 * composing from this known set, not an open-ended layout builder. */
export function SectionRenderer({
  section,
  businessLogoUrl,
}: {
  section: Section;
  businessLogoUrl?: string | null;
}) {
  switch (section.type) {
    case "HERO":
      return <HeroSection content={section.contentJson} logoUrl={businessLogoUrl} />;
    case "SERVICE_LIST":
      return <ServiceListSection content={section.contentJson} />;
    case "CALENDAR":
      return <CalendarSection />;
    case "CONTACT_FORM":
      return <ContactFormSection content={section.contentJson} />;
    case "GALLERY":
      return <GallerySection content={section.contentJson} />;
    case "PRICING":
      return <PricingSection content={section.contentJson} />;
    default:
      return null;
  }
}

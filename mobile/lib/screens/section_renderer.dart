import "package:flutter/material.dart";
import "../models/content_models.dart";
import "sections/calendar_section_widget.dart";
import "sections/contact_form_section_widget.dart";
import "sections/gallery_section_widget.dart";
import "sections/hero_section_widget.dart";
import "sections/pricing_section_widget.dart";
import "sections/service_list_section_widget.dart";

/// The bounded section library's public-render registry (plan §2.4),
/// mirroring the web app's SectionRenderer — composing from this known
/// set, not an open-ended layout builder.
class SectionRenderer extends StatelessWidget {
  final ContentSection section;
  final String? logoUrl;
  const SectionRenderer({super.key, required this.section, this.logoUrl});

  @override
  Widget build(BuildContext context) {
    switch (section.type) {
      case SectionType.hero:
        return HeroSectionWidget(content: section.content, logoUrl: logoUrl);
      case SectionType.serviceList:
        return ServiceListSectionWidget(content: section.content);
      case SectionType.calendar:
        return const CalendarSectionWidget();
      case SectionType.contactForm:
        return ContactFormSectionWidget(content: section.content);
      case SectionType.gallery:
        return GallerySectionWidget(content: section.content);
      case SectionType.pricing:
        return PricingSectionWidget(content: section.content);
      case SectionType.unknown:
        return const SizedBox.shrink();
    }
  }
}

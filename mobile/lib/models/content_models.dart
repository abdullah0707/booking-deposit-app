enum SectionType { hero, serviceList, calendar, contactForm, gallery, pricing, unknown }

SectionType sectionTypeFromString(String value) {
  switch (value) {
    case "HERO":
      return SectionType.hero;
    case "SERVICE_LIST":
      return SectionType.serviceList;
    case "CALENDAR":
      return SectionType.calendar;
    case "CONTACT_FORM":
      return SectionType.contactForm;
    case "GALLERY":
      return SectionType.gallery;
    case "PRICING":
      return SectionType.pricing;
    default:
      return SectionType.unknown;
  }
}

class ContentSection {
  final String id;
  final SectionType type;
  final Map<String, dynamic> content;

  ContentSection({required this.id, required this.type, required this.content});

  factory ContentSection.fromJson(Map<String, dynamic> json) => ContentSection(
        id: json["id"] as String,
        type: sectionTypeFromString(json["type"] as String),
        content: (json["contentJson"] as Map<String, dynamic>?) ?? {},
      );
}

class ContentPage {
  final String id;
  final String title;
  final List<ContentSection> sections;

  ContentPage({required this.id, required this.title, required this.sections});

  factory ContentPage.fromJson(Map<String, dynamic> json) => ContentPage(
        id: json["id"] as String,
        title: json["title"] as String,
        sections: ((json["sections"] as List?) ?? [])
            .map((s) => ContentSection.fromJson(s as Map<String, dynamic>))
            .toList(),
      );
}

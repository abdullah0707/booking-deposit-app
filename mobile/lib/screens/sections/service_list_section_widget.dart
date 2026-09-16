import "package:flutter/material.dart";
import "../../api/api_client.dart";
import "../../models/booking_models.dart";
import "../../widgets/photo_card.dart";

class ServiceListSectionWidget extends StatefulWidget {
  final Map<String, dynamic> content;
  const ServiceListSectionWidget({super.key, required this.content});

  @override
  State<ServiceListSectionWidget> createState() => _ServiceListSectionWidgetState();
}

class _ServiceListSectionWidgetState extends State<ServiceListSectionWidget> {
  List<Service>? _services;

  @override
  void initState() {
    super.initState();
    apiClient.get("/services").then((result) {
      if (!mounted) return;
      setState(() => _services = (result as List).map((e) => Service.fromJson(e)).toList());
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_services == null || _services!.isEmpty) return const SizedBox.shrink();
    final title = widget.content["title"] as String?;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (title != null && title.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
            ),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 0.72,
            children: _services!
                .map(
                  (service) => PhotoCard(
                    name: service.name,
                    imageUrl: service.imageUrl,
                    priceLabel: service.price,
                  ),
                )
                .toList(),
          ),
        ],
      ),
    );
  }
}

import "package:flutter/material.dart";

class GallerySectionWidget extends StatelessWidget {
  final Map<String, dynamic> content;
  const GallerySectionWidget({super.key, required this.content});

  @override
  Widget build(BuildContext context) {
    final urls = ((content["imageUrls"] as List?) ?? []).cast<String>();
    if (urls.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      child: GridView.count(
        crossAxisCount: 3,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        crossAxisSpacing: 6,
        mainAxisSpacing: 6,
        children: urls
            .map(
              (url) => ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: Image.network(url, fit: BoxFit.cover),
              ),
            )
            .toList(),
      ),
    );
  }
}

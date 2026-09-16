import "package:flutter/material.dart";
import "package:phosphor_flutter/phosphor_flutter.dart";

/// A photo-backed card for services — sized to its content (no fixed
/// width/height container), unlike GlassChip which is built for a single
/// fixed-size icon. See booking_flow_screen.dart's _StepIndicator for the
/// overflow bug that came from forcing content into a fixed-size box.
class PhotoCard extends StatelessWidget {
  final String name;
  final String? imageUrl;
  final String? subtitle;
  final String? priceLabel;
  final VoidCallback? onTap;

  const PhotoCard({
    super.key,
    required this.name,
    this.imageUrl,
    this.subtitle,
    this.priceLabel,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final line = Theme.of(context).dividerColor;
    final onSurface = Theme.of(context).colorScheme.onSurface;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          border: Border.all(color: line),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            AspectRatio(
              aspectRatio: 4 / 3,
              child: (imageUrl != null && imageUrl!.isNotEmpty)
                  ? Image.network(imageUrl!, fit: BoxFit.cover)
                  : Container(
                      color: line.withValues(alpha: 0.15),
                      child: Icon(PhosphorIcons.image(), size: 28, color: onSurface.withValues(alpha: 0.25)),
                    ),
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    name,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (subtitle != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      subtitle!,
                      style: TextStyle(fontSize: 12, color: onSurface.withValues(alpha: 0.6)),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                  if (priceLabel != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      priceLabel!,
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 16,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

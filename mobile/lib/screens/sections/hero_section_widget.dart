import "package:flutter/material.dart";
import "package:phosphor_flutter/phosphor_flutter.dart";
import "../../widgets/glass_chip.dart";
import "../booking_flow_screen.dart";

class HeroSectionWidget extends StatelessWidget {
  final Map<String, dynamic> content;
  final String? logoUrl;
  const HeroSectionWidget({super.key, required this.content, this.logoUrl});

  @override
  Widget build(BuildContext context) {
    final title = content["title"] as String?;
    final subtitle = content["subtitle"] as String?;
    final ctaLabel = content["ctaLabel"] as String?;

    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 48, 24, 24),
      child: Column(
        children: [
          GlassChip(
            child: logoUrl != null
                ? ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: Image.network(logoUrl!, width: 28, height: 28, fit: BoxFit.cover),
                  )
                : Icon(
                    PhosphorIcons.calendarCheck(),
                    size: 28,
                    color: Theme.of(context).colorScheme.primary,
                  ),
          ),
          const SizedBox(height: 24),
          if (title != null && title.isNotEmpty)
            Text(
              title,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w600),
            ),
          if (subtitle != null && subtitle.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.7),
                  ),
            ),
          ],
          if (ctaLabel != null && ctaLabel.isNotEmpty) ...[
            const SizedBox(height: 28),
            FilledButton.icon(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const BookingFlowScreen()),
              ),
              icon: Icon(PhosphorIcons.sparkle(PhosphorIconsStyle.fill)),
              label: Text(ctaLabel),
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

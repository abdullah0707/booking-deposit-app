import "dart:ui";
import "package:flutter/material.dart";
import "../theme/miqat_theme.dart";

/// A frosted-glass icon container. Reserved for static/floating chrome
/// (icons, nav bars, modals) — never wrapped around a scrolling list,
/// per the plan's performance guardrail for BackdropFilter.
class GlassChip extends StatelessWidget {
  final Widget child;
  final double size;
  final BorderRadius borderRadius;

  const GlassChip({
    super.key,
    required this.child,
    this.size = 56,
    this.borderRadius = const BorderRadius.all(Radius.circular(18)),
  });

  @override
  Widget build(BuildContext context) {
    final glass = Theme.of(context).extension<MiqatGlass>()!;
    return ClipRRect(
      borderRadius: borderRadius,
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
        child: Container(
          width: size,
          height: size,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: glass.background,
            borderRadius: borderRadius,
            border: Border.all(color: glass.border, width: 1),
          ),
          child: child,
        ),
      ),
    );
  }
}

import "package:flutter/material.dart";
import "package:google_fonts/google_fonts.dart";

/// Miqat design tokens — mirrors the web app's globals.css so the admin
/// dashboard and mobile app read as one product. Light and dark are each
/// tuned deliberately, not a naive invert of one another.
class MiqatColors {
  static const light = _MiqatPalette(
    bg: Color(0xFFFAF7F2),
    ink: Color(0xFF1E2A28),
    accent: Color(0xFFC0684B),
    accent2: Color(0xFF2F6F62),
    line: Color(0xFFE7E0D4),
    glassBg: Color(0x8CFAF7F2),
    glassBorder: Color(0x66FFFFFF),
  );

  static const dark = _MiqatPalette(
    bg: Color(0xFF161D1B),
    ink: Color(0xFFEDE8DF),
    accent: Color(0xFFDD8A6E),
    accent2: Color(0xFF5FB3A0),
    line: Color(0xFF2B332F),
    glassBg: Color(0x8C161D1B),
    glassBorder: Color(0x14FFFFFF),
  );
}

class _MiqatPalette {
  final Color bg, ink, accent, accent2, line, glassBg, glassBorder;
  const _MiqatPalette({
    required this.bg,
    required this.ink,
    required this.accent,
    required this.accent2,
    required this.line,
    required this.glassBg,
    required this.glassBorder,
  });
}

/// Text theme is bilingual by family, not by a separate display face —
/// same family system as the web app, differentiated by weight/size
/// instead of mixing a Latin display face with a mismatched Arabic one.
TextTheme _textThemeFor(String languageCode, Color color) {
  final base = ThemeData.light().textTheme.apply(bodyColor: color, displayColor: color);
  return languageCode == "ar"
      ? GoogleFonts.ibmPlexSansArabicTextTheme(base)
      : GoogleFonts.ibmPlexSansTextTheme(base);
}

/// Parses a `#RRGGBB` hex string (as saved from the admin Business
/// screen's color picker) into a Color, or null if it's missing/invalid
/// — callers fall back to the Miqat default accent in that case.
Color? parseHexColor(String? hex) {
  if (hex == null) return null;
  final match = RegExp(r"^#?([0-9a-fA-F]{6})$").firstMatch(hex);
  if (match == null) return null;
  return Color(int.parse("FF${match.group(1)}", radix: 16));
}

ThemeData miqatTheme({required Brightness brightness, required String languageCode, Color? accentOverride}) {
  final palette = brightness == Brightness.dark ? MiqatColors.dark : MiqatColors.light;
  final accent = accentOverride ?? palette.accent;

  return ThemeData(
    brightness: brightness,
    scaffoldBackgroundColor: palette.bg,
    colorScheme: ColorScheme(
      brightness: brightness,
      primary: accent,
      onPrimary: Colors.white,
      secondary: palette.accent2,
      onSecondary: Colors.white,
      error: const Color(0xFFB3261E),
      onError: Colors.white,
      surface: palette.bg,
      onSurface: palette.ink,
    ),
    textTheme: _textThemeFor(languageCode, palette.ink),
    dividerColor: palette.line,
    extensions: [MiqatGlass(background: palette.glassBg, border: palette.glassBorder)],
  );
}

/// Theme extension carrying the glass-surface tokens, scoped to icon
/// chips / floating nav / modals only — see the plan's "Glass surfaces"
/// section for why it's not applied to scrolling content.
class MiqatGlass extends ThemeExtension<MiqatGlass> {
  final Color background;
  final Color border;
  const MiqatGlass({required this.background, required this.border});

  @override
  MiqatGlass copyWith({Color? background, Color? border}) =>
      MiqatGlass(background: background ?? this.background, border: border ?? this.border);

  @override
  MiqatGlass lerp(ThemeExtension<MiqatGlass>? other, double t) {
    if (other is! MiqatGlass) return this;
    return MiqatGlass(
      background: Color.lerp(background, other.background, t)!,
      border: Color.lerp(border, other.border, t)!,
    );
  }
}

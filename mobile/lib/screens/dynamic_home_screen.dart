import "package:flutter/material.dart";
import "package:phosphor_flutter/phosphor_flutter.dart";
import "../api/api_client.dart";
import "../l10n/app_localizations.dart";
import "../models/content_models.dart";
import "../widgets/glass_chip.dart";
import "booking_flow_screen.dart";
import "section_renderer.dart";

class DynamicHomeScreen extends StatefulWidget {
  final Locale locale;
  final String? logoUrl;
  final ValueChanged<Locale> onLocaleChanged;

  const DynamicHomeScreen({super.key, required this.locale, required this.onLocaleChanged, this.logoUrl});

  @override
  State<DynamicHomeScreen> createState() => _DynamicHomeScreenState();
}

class _DynamicHomeScreenState extends State<DynamicHomeScreen> {
  ContentPage? _page;
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(DynamicHomeScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Section text is bilingual server-side (see backend's
    // resolveLocalizedContent) — switching the EN/AR toggle must re-fetch
    // so the resolved language actually changes, not just the app chrome.
    if (oldWidget.locale.languageCode != widget.locale.languageCode) {
      _load();
    }
  }

  Future<void> _load() async {
    try {
      final result = await apiClient.get("/pages/home?locale=${widget.locale.languageCode}");
      if (!mounted) return;
      setState(() {
        _page = ContentPage.fromJson(result as Map<String, dynamic>);
        _loaded = true;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loaded = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isArabic = widget.locale.languageCode == "ar";

    return Scaffold(
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.transparent,
        actions: [
          TextButton(
            onPressed: () => widget.onLocaleChanged(Locale(isArabic ? "en" : "ar")),
            child: Text(isArabic ? "EN" : "AR"),
          ),
        ],
      ),
      body: SafeArea(
        child: !_loaded
            ? const SizedBox.shrink()
            : (_page == null || _page!.sections.isEmpty)
                ? _FallbackHome(onLocaleChanged: widget.onLocaleChanged, locale: widget.locale, logoUrl: widget.logoUrl)
                : ListView(
                    children: _page!.sections
                        .map((section) => SectionRenderer(section: section, logoUrl: widget.logoUrl))
                        .toList(),
                  ),
      ),
    );
  }
}

/// No "home" page content configured yet (fresh install, before the owner
/// has used the content editor) — the same resilience fallback as the web
/// app, rather than showing a blank screen.
class _FallbackHome extends StatelessWidget {
  final Locale locale;
  final String? logoUrl;
  final ValueChanged<Locale> onLocaleChanged;
  const _FallbackHome({required this.locale, required this.onLocaleChanged, this.logoUrl});

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context)!;
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
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
            Text(
              t.homeKicker.toUpperCase(),
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: Theme.of(context).colorScheme.primary,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 1.4,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              t.homeTitle,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 12),
            Text(
              t.homeSubtitle,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.7),
                  ),
            ),
            const SizedBox(height: 28),
            FilledButton.icon(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const BookingFlowScreen()),
              ),
              icon: Icon(PhosphorIcons.sparkle(PhosphorIconsStyle.fill)),
              label: Text(t.homeCta),
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

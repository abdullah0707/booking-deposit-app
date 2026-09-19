import "package:flutter/material.dart";
import "package:flutter_localizations/flutter_localizations.dart";
import "api/api_client.dart";
import "auth/customer_auth.dart";
import "l10n/app_localizations.dart";
import "screens/dynamic_home_screen.dart";
import "theme/miqat_theme.dart";

void main() {
  runApp(const MiqatApp());
}

class MiqatApp extends StatefulWidget {
  const MiqatApp({super.key});

  @override
  State<MiqatApp> createState() => _MiqatAppState();
}

class _MiqatAppState extends State<MiqatApp> {
  Locale _locale = const Locale("en");
  Color? _accentColor;
  String? _logoUrl;

  @override
  void initState() {
    super.initState();
    _loadBusiness();
    customerAuth.load();
  }

  // The web app's Business settings screen (name/logo/accent color) is
  // meant to apply everywhere the brand shows up, not just the web
  // storefront — so the mobile app reads the same public /business
  // endpoint at startup and overrides the default Miqat theme with it.
  Future<void> _loadBusiness() async {
    try {
      final result = await apiClient.get("/business") as Map<String, dynamic>;
      if (!mounted) return;
      setState(() {
        _accentColor = parseHexColor(result["primaryColor"] as String?);
        _logoUrl = result["logoUrl"] as String?;
      });
    } catch (_) {
      // Falls back to the default Miqat theme/icon — same resilience as
      // the content sections' own fallbacks when the backend is unreachable.
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: "Miqat",
      debugShowCheckedModeBanner: false,
      locale: _locale,
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      theme: miqatTheme(brightness: Brightness.light, languageCode: _locale.languageCode, accentOverride: _accentColor),
      darkTheme: miqatTheme(brightness: Brightness.dark, languageCode: _locale.languageCode, accentOverride: _accentColor),
      themeMode: ThemeMode.system,
      home: DynamicHomeScreen(
        locale: _locale,
        logoUrl: _logoUrl,
        onLocaleChanged: (locale) => setState(() => _locale = locale),
      ),
    );
  }
}

import "package:flutter/material.dart";
import "package:phosphor_flutter/phosphor_flutter.dart";
import "../../l10n/app_localizations.dart";
import "../booking_flow_screen.dart";

/// The booking calendar section on mobile opens the dedicated multi-step
/// booking flow screen rather than embedding it inline — a full wizard
/// doesn't fit naturally inside a scrolling content page on a small
/// screen, unlike the web version which embeds it directly.
class CalendarSectionWidget extends StatelessWidget {
  const CalendarSectionWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      child: OutlinedButton.icon(
        onPressed: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const BookingFlowScreen()),
        ),
        icon: Icon(PhosphorIcons.calendarPlus()),
        label: Text(AppLocalizations.of(context)!.homeCta),
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(52),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
      ),
    );
  }
}

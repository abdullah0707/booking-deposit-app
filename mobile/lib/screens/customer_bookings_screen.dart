import "package:flutter/material.dart";
import "../api/api_client.dart";
import "../auth/customer_auth.dart";
import "../l10n/app_localizations.dart";
import "customer_login_screen.dart";

class CustomerBookingsScreen extends StatefulWidget {
  const CustomerBookingsScreen({super.key});

  @override
  State<CustomerBookingsScreen> createState() => _CustomerBookingsScreenState();
}

class _CustomerBookingsScreenState extends State<CustomerBookingsScreen> {
  List<dynamic>? _bookings;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (customerAuth.token == null) return;
    final result = await apiClient.get("/customers/me/bookings", token: customerAuth.token);
    if (!mounted) return;
    setState(() => _bookings = result as List<dynamic>);
  }

  String _statusLabel(AppLocalizations t, String status) {
    switch (status) {
      case "PENDING_PAYMENT":
        return t.bookingStatusPendingPayment;
      case "AWAITING_MANUAL_VERIFICATION":
        return t.bookingStatusAwaitingVerification;
      case "CONFIRMED":
        return t.bookingStatusConfirmed;
      case "COMPLETED":
        return t.bookingStatusCompleted;
      case "CANCELLED":
        return t.bookingStatusCancelled;
      default:
        return status;
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context)!;

    if (customerAuth.token == null) {
      return Scaffold(
        appBar: AppBar(title: Text(t.myBookingsTitle)),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(t.myBookingsSignInPrompt, textAlign: TextAlign.center),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () => Navigator.of(context)
                      .push(MaterialPageRoute(builder: (_) => const CustomerLoginScreen()))
                      .then((_) => setState(_load)),
                  child: Text(t.accountSignIn),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(t.myBookingsTitle),
        actions: [
          TextButton(
            onPressed: () async {
              await customerAuth.logout();
              if (mounted) setState(() {});
            },
            child: Text(t.accountLogOut),
          ),
        ],
      ),
      body: _bookings == null
          ? const Center(child: CircularProgressIndicator())
          : _bookings!.isEmpty
              ? Center(child: Text(t.myBookingsEmpty))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _bookings!.length,
                  itemBuilder: (context, index) {
                    final booking = _bookings![index] as Map<String, dynamic>;
                    final service = booking["service"] as Map<String, dynamic>?;
                    final startsAt = DateTime.tryParse(booking["startsAt"] as String? ?? "");
                    return Card(
                      child: ListTile(
                        title: Text(service?["name"] as String? ?? ""),
                        subtitle: Text(startsAt != null ? startsAt.toLocal().toString() : ""),
                        trailing: Text(_statusLabel(t, booking["status"] as String? ?? "")),
                      ),
                    );
                  },
                ),
    );
  }
}

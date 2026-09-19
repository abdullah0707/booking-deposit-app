import "dart:ui";
import "package:flutter/material.dart";
import "package:intl/intl.dart";
import "package:phosphor_flutter/phosphor_flutter.dart";
import "package:url_launcher/url_launcher.dart";
import "../api/api_client.dart";
import "../auth/customer_auth.dart";
import "../l10n/app_localizations.dart";
import "../models/booking_models.dart";
import "../theme/miqat_theme.dart";
import "location_picker_screen.dart";
import "manual_payment_screen.dart";

// Only pushes the real Maps picker when a buyer has set this at build time
// (`--dart-define=GOOGLE_MAPS_API_KEY=...`, alongside the native manifest
// placeholder in android/app/build.gradle.kts) — otherwise falls back to
// a plain text address field, same reasoning as the web app: Maps is a
// real, billed third-party dependency, not something the core booking
// flow should be fully blocked on.
const _googleMapsApiKey = String.fromEnvironment("GOOGLE_MAPS_API_KEY");

enum _Step { service, slot, details, payment }

class BookingFlowScreen extends StatefulWidget {
  const BookingFlowScreen({super.key});

  @override
  State<BookingFlowScreen> createState() => _BookingFlowScreenState();
}

class _BookingFlowScreenState extends State<BookingFlowScreen> {
  _Step _step = _Step.service;

  List<Service>? _services;
  Service? _selectedService;

  late final List<DateTime> _days;
  late DateTime _selectedDate;
  List<Slot>? _slots;
  Slot? _selectedSlot;

  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();

  bool _wantsAddress = false; // for EITHER services
  String? _addressText;
  double? _addressLat;
  double? _addressLng;

  List<PaymentMethod>? _paymentMethods;
  PaymentMethod? _selectedMethod;

  bool _submitting = false;
  String? _error;

  bool get _needsAddress =>
      _selectedService != null &&
      (_selectedService!.locationType == ServiceLocationType.customerAddress ||
          (_selectedService!.locationType == ServiceLocationType.either && _wantsAddress));

  @override
  void initState() {
    super.initState();
    final today = DateTime.now();
    _days = List.generate(7, (i) => DateTime(today.year, today.month, today.day + i));
    _selectedDate = _days.first;
    _loadServices();
    _loadPaymentMethods();
    // Signed-in customers shouldn't have to retype what the account
    // already knows — mirrors the web app's BookingWizard prefill.
    if (customerAuth.customer != null) {
      _nameController.text = customerAuth.customer!.name;
      _emailController.text = customerAuth.customer!.email;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _loadServices() async {
    final result = await apiClient.get("/services") as List;
    setState(() => _services = result.map((e) => Service.fromJson(e)).toList());
  }

  Future<void> _loadPaymentMethods() async {
    final result = await apiClient.get("/payment-methods") as List;
    if (!mounted) return;
    setState(() => _paymentMethods = result.map((e) => PaymentMethod.fromJson(e)).toList());
  }

  Future<void> _loadSlots() async {
    if (_selectedService == null) return;
    setState(() {
      _slots = null;
      _selectedSlot = null;
    });
    final dateKey = DateFormat("yyyy-MM-dd").format(_selectedDate);
    try {
      final result = await apiClient
          .get("/availability?serviceId=${_selectedService!.id}&date=$dateKey") as List;
      setState(() => _slots = result.map((e) => Slot.fromJson(e)).toList());
    } catch (_) {
      setState(() => _slots = []);
    }
  }

  Future<void> _pickAddress() async {
    if (_googleMapsApiKey.isNotEmpty) {
      final picked = await Navigator.push<PickedLocation>(
        context,
        MaterialPageRoute(builder: (_) => const LocationPickerScreen()),
      );
      if (picked != null) {
        setState(() {
          _addressText = picked.address;
          _addressLat = picked.lat;
          _addressLng = picked.lng;
        });
      }
    } else {
      final controller = TextEditingController(text: _addressText);
      final result = await showDialog<String>(
        context: context,
        builder: (context) => AlertDialog(
          content: TextField(
            controller: controller,
            decoration: InputDecoration(hintText: AppLocalizations.of(context)!.addressPlaceholder),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, controller.text), child: const Text("OK")),
          ],
        ),
      );
      if (result != null && result.isNotEmpty) setState(() => _addressText = result);
    }
  }

  Future<void> _submit(PaymentMethod method) async {
    if (_selectedService == null || _selectedSlot == null) return;
    final t = AppLocalizations.of(context)!;
    setState(() {
      _selectedMethod = method;
      _error = null;
      _submitting = true;
    });
    try {
      final result = await apiClient.post(
        "/bookings",
        {
          "serviceId": _selectedService!.id,
          "paymentMethodId": method.id,
          "startsAt": _selectedSlot!.startsAt.toIso8601String(),
          "customerName": _nameController.text,
          "customerEmail": _emailController.text,
          if (_phoneController.text.isNotEmpty) "customerPhone": _phoneController.text,
          if (_needsAddress && _addressText != null) "customerAddress": _addressText,
          if (_needsAddress && _addressLat != null) "customerLat": _addressLat,
          if (_needsAddress && _addressLng != null) "customerLng": _addressLng,
        },
        // Optional — a signed-in customer's booking links to their account
        // (see backend's optionalCustomerAuth); guests just omit this.
        token: customerAuth.token,
      );
      if (result["checkoutUrl"] != null) {
        final checkoutUrl = result["checkoutUrl"] as String;
        final launched = await launchUrl(Uri.parse(checkoutUrl), mode: LaunchMode.externalApplication);
        if (!launched && mounted) {
          setState(() => _error = t.couldNotOpenPayment);
        }
      } else if (mounted) {
        await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => ManualPaymentScreen(
              bookingId: result["bookingId"] as String,
              instructions: (result["instructions"] as Map<String, dynamic>?) ?? {},
            ),
          ),
        );
      }
    } on ApiException catch (e) {
      setState(() {
        if (e.status == 409) {
          _error = t.slotTaken;
          _selectedSlot = null;
          _step = _Step.slot;
        } else {
          _error = t.submitError;
        }
      });
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context)!;
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            _StepIndicator(step: _step),
            Expanded(child: _buildStepBody(t)),
          ],
        ),
      ),
    );
  }

  Widget _buildStepBody(AppLocalizations t) {
    switch (_step) {
      case _Step.service:
        return _ServiceStep(
          services: _services,
          loadingLabel: t.loadingServices,
          onSelect: (service) {
            setState(() {
              _selectedService = service;
              _step = _Step.slot;
            });
            _loadSlots();
          },
        );
      case _Step.slot:
        return _SlotStep(
          days: _days,
          selectedDate: _selectedDate,
          slots: _slots,
          loadingLabel: t.loadingSlots,
          noSlotsLabel: t.noSlots,
          backLabel: t.back,
          onBack: () => setState(() => _step = _Step.service),
          onDateChanged: (date) {
            setState(() => _selectedDate = date);
            _loadSlots();
          },
          onSlotSelected: (slot) {
            setState(() {
              _selectedSlot = slot;
              _step = _Step.details;
              // A stale "that time was just taken" error from a previous
              // attempt would otherwise still show on the payment step
              // even though this is a fresh slot with no conflict yet.
              _error = null;
            });
          },
        );
      case _Step.details:
        return _DetailsStep(
          service: _selectedService!,
          slot: _selectedSlot!,
          nameController: _nameController,
          emailController: _emailController,
          phoneController: _phoneController,
          backLabel: t.back,
          onBack: () => setState(() => _step = _Step.slot),
          namePlaceholder: t.namePlaceholder,
          emailPlaceholder: t.emailPlaceholder,
          phonePlaceholder: t.phonePlaceholder,
          needsAddress: _needsAddress,
          isEither: _selectedService!.locationType == ServiceLocationType.either,
          wantsAddress: _wantsAddress,
          onWantsAddressChanged: (value) => setState(() => _wantsAddress = value),
          addressText: _addressText,
          onPickAddress: _pickAddress,
          addressLabel: t.addressLabel,
          eitherAtYourPlaceLabel: t.eitherAtYourPlace,
          eitherAtMyAddressLabel: t.eitherAtMyAddress,
          continueLabel: t.continueToPayment,
          onContinue: () => setState(() => _step = _Step.payment),
        );
      case _Step.payment:
        return _PaymentStep(
          methods: _paymentMethods,
          selectedMethod: _selectedMethod,
          submitting: _submitting,
          error: _error,
          backLabel: t.back,
          onBack: () => setState(() => _step = _Step.details),
          choosePaymentMethodLabel: t.choosePaymentMethod,
          redirectingLabel: t.redirecting,
          onSelect: _submit,
        );
    }
  }
}

class _StepIndicator extends StatelessWidget {
  final _Step step;
  const _StepIndicator({required this.step});

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context)!;
    final labels = [t.stepService, t.stepSlot, t.stepDetails, t.stepPayment];
    final glass = Theme.of(context).extension<MiqatGlass>()!;

    // Sizes to its Row's content width — GlassChip forces a fixed square
    // box (built for a single icon) and clipped this 3-label bar with a
    // ~132px overflow when tried here; a floating bar needs fixed height,
    // auto width instead.
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
          child: Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: glass.background,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: glass.border, width: 1),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: List.generate(4, (i) {
                final active = i == step.index;
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: active ? Theme.of(context).colorScheme.primary : Colors.transparent,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      labels[i],
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: active ? Colors.white : Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
                      ),
                    ),
                  ),
                );
              }),
            ),
          ),
        ),
      ),
    );
  }
}

class _ServiceStep extends StatelessWidget {
  final List<Service>? services;
  final String loadingLabel;
  final ValueChanged<Service> onSelect;

  const _ServiceStep({required this.services, required this.loadingLabel, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    if (services == null) {
      return Center(child: Text(loadingLabel));
    }
    final t = AppLocalizations.of(context)!;
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: services!.length,
      separatorBuilder: (_, index) => const SizedBox(height: 8),
      itemBuilder: (context, i) {
        final service = services![i];
        return InkWell(
          onTap: () => onSelect(service),
          borderRadius: BorderRadius.circular(14),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              border: Border.all(color: Theme.of(context).dividerColor),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: SizedBox(
                    width: 52,
                    height: 52,
                    child: (service.imageUrl != null && service.imageUrl!.isNotEmpty)
                        ? Image.network(service.imageUrl!, fit: BoxFit.cover)
                        : Container(
                            color: Theme.of(context).dividerColor.withValues(alpha: 0.15),
                            child: Icon(
                              PhosphorIcons.image(),
                              size: 20,
                              color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.25),
                            ),
                          ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(service.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                      Text(
                        "${service.durationMinutes} ${t.minutesShort} · ${t.depositOf} ${service.depositAmount}",
                        style: TextStyle(
                          fontSize: 13,
                          color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6),
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(PhosphorIcons.caretRight(), size: 16),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _SlotStep extends StatelessWidget {
  final List<DateTime> days;
  final DateTime selectedDate;
  final List<Slot>? slots;
  final String loadingLabel;
  final String noSlotsLabel;
  final String backLabel;
  final VoidCallback onBack;
  final ValueChanged<DateTime> onDateChanged;
  final ValueChanged<Slot> onSlotSelected;

  const _SlotStep({
    required this.days,
    required this.selectedDate,
    required this.slots,
    required this.loadingLabel,
    required this.noSlotsLabel,
    required this.backLabel,
    required this.onBack,
    required this.onDateChanged,
    required this.onSlotSelected,
  });

  bool _isSameDay(DateTime a, DateTime b) => a.year == b.year && a.month == b.month && a.day == b.day;

  @override
  Widget build(BuildContext context) {
    final accent = Theme.of(context).colorScheme.primary;
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextButton.icon(
            onPressed: onBack,
            icon: Icon(PhosphorIcons.caretLeft(), size: 14),
            label: Text(backLabel),
          ),
          SizedBox(
            height: 64,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: days.length,
              separatorBuilder: (_, index) => const SizedBox(width: 8),
              itemBuilder: (context, i) {
                final day = days[i];
                final active = _isSameDay(day, selectedDate);
                return InkWell(
                  onTap: () => onDateChanged(day),
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    width: 56,
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    decoration: BoxDecoration(
                      color: active ? accent : null,
                      border: Border.all(color: active ? accent : Theme.of(context).dividerColor),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(DateFormat("E").format(day),
                            style: TextStyle(fontSize: 11, color: active ? Colors.white : null)),
                        Text(DateFormat("d").format(day),
                            style: TextStyle(
                                fontWeight: FontWeight.w600, color: active ? Colors.white : null)),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 16),
          if (slots == null) Text(loadingLabel),
          if (slots != null && slots!.isEmpty) Text(noSlotsLabel),
          if (slots != null && slots!.isNotEmpty)
            Expanded(
              child: GridView.builder(
                gridDelegate:
                    const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 3, mainAxisSpacing: 8, crossAxisSpacing: 8, childAspectRatio: 2.2),
                itemCount: slots!.length,
                itemBuilder: (context, i) {
                  final slot = slots![i];
                  return OutlinedButton(
                    onPressed: () => onSlotSelected(slot),
                    child: Text(DateFormat("h:mm a").format(slot.startsAt.toLocal())),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}

class _DetailsStep extends StatelessWidget {
  final Service service;
  final Slot slot;
  final TextEditingController nameController;
  final TextEditingController emailController;
  final TextEditingController phoneController;
  final String backLabel;
  final VoidCallback onBack;
  final String namePlaceholder;
  final String emailPlaceholder;
  final String phonePlaceholder;
  final bool needsAddress;
  final bool isEither;
  final bool wantsAddress;
  final ValueChanged<bool> onWantsAddressChanged;
  final String? addressText;
  final VoidCallback onPickAddress;
  final String addressLabel;
  final String eitherAtYourPlaceLabel;
  final String eitherAtMyAddressLabel;
  final String continueLabel;
  final VoidCallback onContinue;

  const _DetailsStep({
    required this.service,
    required this.slot,
    required this.nameController,
    required this.emailController,
    required this.phoneController,
    required this.backLabel,
    required this.onBack,
    required this.namePlaceholder,
    required this.emailPlaceholder,
    required this.phonePlaceholder,
    required this.needsAddress,
    required this.isEither,
    required this.wantsAddress,
    required this.onWantsAddressChanged,
    required this.addressText,
    required this.onPickAddress,
    required this.addressLabel,
    required this.eitherAtYourPlaceLabel,
    required this.eitherAtMyAddressLabel,
    required this.continueLabel,
    required this.onContinue,
  });

  @override
  Widget build(BuildContext context) {
    final canContinue = !needsAddress || (addressText != null && addressText!.isNotEmpty);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextButton.icon(
            onPressed: onBack,
            icon: Icon(PhosphorIcons.caretLeft(), size: 14),
            label: Text(backLabel),
          ),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              border: Border.all(color: Theme.of(context).dividerColor),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(service.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                Text(DateFormat("MMM d, h:mm a").format(slot.startsAt.toLocal())),
              ],
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: nameController,
            decoration: InputDecoration(hintText: namePlaceholder, border: const OutlineInputBorder()),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: emailController,
            keyboardType: TextInputType.emailAddress,
            decoration: InputDecoration(hintText: emailPlaceholder, border: const OutlineInputBorder()),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: phoneController,
            keyboardType: TextInputType.phone,
            decoration: InputDecoration(hintText: phonePlaceholder, border: const OutlineInputBorder()),
          ),
          if (isEither) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => onWantsAddressChanged(false),
                    style: OutlinedButton.styleFrom(
                      backgroundColor: !wantsAddress ? Theme.of(context).colorScheme.primary.withValues(alpha: 0.1) : null,
                    ),
                    child: Text(eitherAtYourPlaceLabel),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => onWantsAddressChanged(true),
                    style: OutlinedButton.styleFrom(
                      backgroundColor: wantsAddress ? Theme.of(context).colorScheme.primary.withValues(alpha: 0.1) : null,
                    ),
                    child: Text(eitherAtMyAddressLabel),
                  ),
                ),
              ],
            ),
          ],
          if (needsAddress) ...[
            const SizedBox(height: 12),
            Text(addressLabel, style: Theme.of(context).textTheme.labelMedium),
            const SizedBox(height: 4),
            OutlinedButton(
              onPressed: onPickAddress,
              child: Text(addressText ?? addressLabel, maxLines: 2, overflow: TextOverflow.ellipsis),
            ),
          ],
          const SizedBox(height: 16),
          FilledButton(
            onPressed: canContinue ? onContinue : null,
            child: Text(continueLabel),
          ),
        ],
      ),
    );
  }
}

class _PaymentStep extends StatelessWidget {
  final List<PaymentMethod>? methods;
  final PaymentMethod? selectedMethod;
  final bool submitting;
  final String? error;
  final String backLabel;
  final VoidCallback onBack;
  final String choosePaymentMethodLabel;
  final String redirectingLabel;
  final ValueChanged<PaymentMethod> onSelect;

  const _PaymentStep({
    required this.methods,
    required this.selectedMethod,
    required this.submitting,
    required this.error,
    required this.backLabel,
    required this.onBack,
    required this.choosePaymentMethodLabel,
    required this.redirectingLabel,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextButton.icon(
            onPressed: onBack,
            icon: Icon(PhosphorIcons.caretLeft(), size: 14),
            label: Text(backLabel),
          ),
          Text(choosePaymentMethodLabel, style: Theme.of(context).textTheme.labelLarge),
          const SizedBox(height: 8),
          if (methods == null) const Center(child: CircularProgressIndicator()),
          ...?methods?.map(
            (method) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: OutlinedButton(
                onPressed: submitting ? null : () => onSelect(method),
                style: OutlinedButton.styleFrom(alignment: Alignment.centerLeft),
                child: Row(
                  children: [
                    Expanded(child: Text(method.label)),
                    if (submitting && selectedMethod?.id == method.id)
                      Text(redirectingLabel, style: const TextStyle(fontSize: 12)),
                  ],
                ),
              ),
            ),
          ),
          if (error != null) ...[
            const SizedBox(height: 8),
            Text(error!, style: const TextStyle(color: Colors.red)),
          ],
        ],
      ),
    );
  }
}

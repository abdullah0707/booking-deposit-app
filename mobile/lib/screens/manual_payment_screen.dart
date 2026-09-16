import "package:flutter/material.dart";
import "package:image_picker/image_picker.dart";
import "package:phosphor_flutter/phosphor_flutter.dart";
import "../api/api_client.dart";
import "../l10n/app_localizations.dart";

class ManualPaymentScreen extends StatefulWidget {
  final String bookingId;
  final Map<String, dynamic> instructions;

  const ManualPaymentScreen({super.key, required this.bookingId, required this.instructions});

  @override
  State<ManualPaymentScreen> createState() => _ManualPaymentScreenState();
}

class _ManualPaymentScreenState extends State<ManualPaymentScreen> {
  final _referenceController = TextEditingController();
  XFile? _proofFile;
  bool _submitting = false;
  bool _submitted = false;
  String? _error;

  Future<void> _pickFile() async {
    final picked = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (picked != null) setState(() => _proofFile = picked);
  }

  Future<void> _submit() async {
    if (_proofFile == null) return;
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await apiClient.uploadFile(
        "/bookings/${widget.bookingId}/payment-proof",
        _proofFile!,
        fields: _referenceController.text.isNotEmpty ? {"referenceNumber": _referenceController.text} : null,
      );
      if (!mounted) return;
      setState(() => _submitted = true);
    } on ApiException {
      if (!mounted) return;
      setState(() => _error = AppLocalizations.of(context)!.manualPaymentSubmitError);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context)!;

    if (_submitted) {
      return Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(PhosphorIcons.checkCircle(PhosphorIconsStyle.fill), size: 40, color: Theme.of(context).colorScheme.secondary),
                const SizedBox(height: 12),
                Text(t.manualPaymentSubmitted, style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 4),
                Text("${t.manualPaymentBookingReference}: ${widget.bookingId}", textAlign: TextAlign.center),
              ],
            ),
          ),
        ),
      );
    }

    final instructionsText = widget.instructions["instructions"] as String?;
    final accountName = widget.instructions["accountName"] as String?;

    return Scaffold(
      appBar: AppBar(title: Text(t.manualPaymentTitle)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(t.manualPaymentSubtitle),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              border: Border.all(color: Theme.of(context).dividerColor),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (accountName != null) Text(accountName, style: const TextStyle(fontWeight: FontWeight.w600)),
                if (instructionsText != null) Text(instructionsText),
              ],
            ),
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: _pickFile,
            icon: const Icon(Icons.upload_outlined),
            label: Text(_proofFile != null ? _proofFile!.name : t.manualPaymentUploadProof),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _referenceController,
            decoration: InputDecoration(hintText: t.manualPaymentReferencePlaceholder, border: const OutlineInputBorder()),
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(_error!, style: const TextStyle(color: Colors.red)),
          ],
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _proofFile == null || _submitting ? null : _submit,
            child: Text(_submitting ? t.manualPaymentUploading : t.manualPaymentSubmit),
          ),
        ],
      ),
    );
  }
}

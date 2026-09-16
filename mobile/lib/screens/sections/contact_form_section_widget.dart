import "package:flutter/material.dart";
import "../../api/api_client.dart";
import "../../l10n/app_localizations.dart";

class ContactFormSectionWidget extends StatefulWidget {
  final Map<String, dynamic> content;
  const ContactFormSectionWidget({super.key, required this.content});

  @override
  State<ContactFormSectionWidget> createState() => _ContactFormSectionWidgetState();
}

enum _Status { idle, submitting, sent, error }

class _ContactFormSectionWidgetState extends State<ContactFormSectionWidget> {
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _messageController = TextEditingController();
  _Status _status = _Status.idle;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _status = _Status.submitting);
    try {
      await apiClient.post("/contact", {
        "name": _nameController.text,
        "email": _emailController.text,
        "message": _messageController.text,
      });
      if (!mounted) return;
      setState(() => _status = _Status.sent);
      _nameController.clear();
      _emailController.clear();
      _messageController.clear();
    } catch (_) {
      if (!mounted) return;
      setState(() => _status = _Status.error);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context)!;
    final title = widget.content["title"] as String?;
    final description = widget.content["description"] as String?;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      child: Column(
        children: [
          if (title != null && title.isNotEmpty)
            Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
          if (description != null && description.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              description,
              textAlign: TextAlign.center,
              style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6)),
            ),
          ],
          const SizedBox(height: 16),
          if (_status == _Status.sent)
            Text(t.contactSent, style: TextStyle(color: Theme.of(context).colorScheme.secondary))
          else ...[
            TextField(
              controller: _nameController,
              decoration: InputDecoration(hintText: t.namePlaceholder, border: const OutlineInputBorder()),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              decoration: InputDecoration(hintText: t.emailPlaceholder, border: const OutlineInputBorder()),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _messageController,
              maxLines: 4,
              decoration:
                  InputDecoration(hintText: t.contactMessagePlaceholder, border: const OutlineInputBorder()),
            ),
            if (_status == _Status.error) ...[
              const SizedBox(height: 8),
              Text(t.contactError, style: const TextStyle(color: Colors.red)),
            ],
            const SizedBox(height: 12),
            FilledButton(
              onPressed: _status == _Status.submitting ? null : _submit,
              child: Text(_status == _Status.submitting ? t.contactSending : t.contactSend),
            ),
          ],
        ],
      ),
    );
  }
}

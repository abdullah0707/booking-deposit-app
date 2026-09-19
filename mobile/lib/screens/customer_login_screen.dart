import "package:flutter/material.dart";
import "package:phosphor_flutter/phosphor_flutter.dart";
import "../api/api_client.dart";
import "../auth/customer_auth.dart";
import "../l10n/app_localizations.dart";
import "../widgets/glass_chip.dart";
import "customer_register_screen.dart";

class CustomerLoginScreen extends StatefulWidget {
  const CustomerLoginScreen({super.key});

  @override
  State<CustomerLoginScreen> createState() => _CustomerLoginScreenState();
}

class _CustomerLoginScreenState extends State<CustomerLoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _submitting = false;
  String? _error;

  Future<void> _submit() async {
    final t = AppLocalizations.of(context)!;
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await customerAuth.login(_emailController.text, _passwordController.text);
      if (!mounted) return;
      Navigator.of(context).pop();
    } on ApiException catch (e) {
      setState(() => _error = e.status == 401 ? t.accountInvalidCredentials : t.accountGenericError);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Center(
            child: GlassChip(child: Icon(PhosphorIcons.userCircle(), size: 28, color: Theme.of(context).colorScheme.primary)),
          ),
          const SizedBox(height: 16),
          Text(t.accountLoginTitle, textAlign: TextAlign.center, style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 4),
          Text(
            t.accountLoginSubtitle,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.7)),
          ),
          const SizedBox(height: 24),
          TextField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            decoration: InputDecoration(hintText: t.emailPlaceholder, border: const OutlineInputBorder()),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _passwordController,
            obscureText: true,
            decoration: InputDecoration(hintText: t.passwordPlaceholder, border: const OutlineInputBorder()),
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(_error!, style: const TextStyle(color: Colors.red)),
          ],
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _submitting ? null : _submit,
            child: Text(_submitting ? t.accountSigningIn : t.accountSignIn),
          ),
          const SizedBox(height: 12),
          TextButton(
            onPressed: () => Navigator.of(context).pushReplacement(
              MaterialPageRoute(builder: (_) => const CustomerRegisterScreen()),
            ),
            child: Text(t.accountCreateOne),
          ),
        ],
      ),
    );
  }
}

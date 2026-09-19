import "package:flutter/foundation.dart";
import "package:shared_preferences/shared_preferences.dart";
import "../api/api_client.dart";

class CustomerUser {
  final String id;
  final String name;
  final String email;
  CustomerUser({required this.id, required this.name, required this.email});

  factory CustomerUser.fromJson(Map<String, dynamic> json) =>
      CustomerUser(id: json["id"] as String, name: json["name"] as String, email: json["email"] as String);
}

/// A registered customer's own session — mirrors the web app's
/// CustomerAuthContext. Deliberately a plain ChangeNotifier singleton
/// (like the existing `apiClient` global) rather than pulling in a state
/// management package, matching this app's existing plain-Flutter style.
/// Booking still works fully as a guest with no session at all — see
/// booking_flow_screen.dart, which only attaches the token when present.
class CustomerAuthController extends ChangeNotifier {
  static const _tokenKey = "miqat.customerToken";
  static const _idKey = "miqat.customerId";
  static const _nameKey = "miqat.customerName";
  static const _emailKey = "miqat.customerEmail";

  String? token;
  CustomerUser? customer;
  bool loading = true;

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    final storedToken = prefs.getString(_tokenKey);
    if (storedToken != null) {
      token = storedToken;
      customer = CustomerUser(
        id: prefs.getString(_idKey) ?? "",
        name: prefs.getString(_nameKey) ?? "",
        email: prefs.getString(_emailKey) ?? "",
      );
    }
    loading = false;
    notifyListeners();
  }

  Future<void> _persist(String newToken, CustomerUser newCustomer) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, newToken);
    await prefs.setString(_idKey, newCustomer.id);
    await prefs.setString(_nameKey, newCustomer.name);
    await prefs.setString(_emailKey, newCustomer.email);
  }

  Future<void> login(String email, String password) async {
    final result = await apiClient.post("/customers/login", {"email": email, "password": password})
        as Map<String, dynamic>;
    final newToken = result["token"] as String;
    final newCustomer = CustomerUser.fromJson(result["customer"] as Map<String, dynamic>);
    await _persist(newToken, newCustomer);
    token = newToken;
    customer = newCustomer;
    notifyListeners();
  }

  Future<void> register(String name, String email, String password) async {
    final result = await apiClient.post("/customers/register", {"name": name, "email": email, "password": password})
        as Map<String, dynamic>;
    final newToken = result["token"] as String;
    final newCustomer = CustomerUser.fromJson(result["customer"] as Map<String, dynamic>);
    await _persist(newToken, newCustomer);
    token = newToken;
    customer = newCustomer;
    notifyListeners();
  }

  Future<void> logout() async {
    token = null;
    customer = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_idKey);
    await prefs.remove(_nameKey);
    await prefs.remove(_emailKey);
    notifyListeners();
  }
}

final customerAuth = CustomerAuthController();

import "dart:convert";
import "package:http/http.dart" as http;
import "package:http_parser/http_parser.dart";
import "package:image_picker/image_picker.dart";
import "package:mime/mime.dart";

/// Defaults to the Android emulator's loopback alias for the host
/// machine's localhost during development. A real deployment sets this
/// via `--dart-define=API_URL=...` at build time (see the install
/// wizard docs once that exists).
const _apiUrl = String.fromEnvironment("API_URL", defaultValue: "http://10.0.2.2:4000");

class ApiException implements Exception {
  final int status;
  final String message;
  ApiException(this.status, this.message);

  @override
  String toString() => "ApiException($status): $message";
}

class ApiClient {
  Future<dynamic> get(String path) async {
    final res = await http.get(Uri.parse("$_apiUrl$path"));
    return _handle(res);
  }

  Future<dynamic> post(String path, Map<String, dynamic> body) async {
    final res = await http.post(
      Uri.parse("$_apiUrl$path"),
      headers: {"Content-Type": "application/json"},
      body: jsonEncode(body),
    );
    return _handle(res);
  }

  /// Multipart upload — used for the manual-payment proof screenshot.
  /// Fields other than the file (e.g. a reference number) go in [fields].
  /// Takes an [XFile] (from image_picker) and reads it as bytes rather
  /// than opening it by path — `fromPath` needs real filesystem access,
  /// which Flutter Web's picked files don't have (they're blob URLs), so
  /// this works identically on native and web. The content type must be
  /// set explicitly: `fromBytes` defaults to application/octet-stream
  /// (unlike `fromPath`, which guesses it from the file extension), and
  /// the backend's upload filter rejects anything that isn't a
  /// recognized image/* type.
  Future<dynamic> uploadFile(String path, XFile file, {Map<String, String>? fields}) async {
    final request = http.MultipartRequest("POST", Uri.parse("$_apiUrl$path"));
    if (fields != null) request.fields.addAll(fields);
    final mimeType = file.mimeType ?? lookupMimeType(file.name) ?? "image/jpeg";
    request.files.add(
      http.MultipartFile.fromBytes(
        "file",
        await file.readAsBytes(),
        filename: file.name,
        contentType: MediaType.parse(mimeType),
      ),
    );

    final streamedResponse = await request.send();
    final res = await http.Response.fromStream(streamedResponse);
    return _handle(res);
  }

  dynamic _handle(http.Response res) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      if (res.body.isEmpty) return null;
      return jsonDecode(res.body);
    }
    String message = res.reasonPhrase ?? "Request failed";
    try {
      final decoded = jsonDecode(res.body);
      if (decoded is Map && decoded["error"] != null) {
        message = decoded["error"].toString();
      }
    } catch (_) {
      // response body wasn't JSON — keep the status reason phrase
    }
    throw ApiException(res.statusCode, message);
  }
}

final apiClient = ApiClient();

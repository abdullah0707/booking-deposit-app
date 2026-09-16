import "package:flutter/material.dart";
import "package:google_maps_flutter/google_maps_flutter.dart";
import "package:geocoding/geocoding.dart";
import "package:geolocator/geolocator.dart";
import "../l10n/app_localizations.dart";

class PickedLocation {
  final String address;
  final double lat;
  final double lng;
  PickedLocation({required this.address, required this.lat, required this.lng});
}

/// A real interactive map picker — only pushed when GOOGLE_MAPS_API_KEY is
/// configured (see booking_flow_screen.dart's address step, which falls
/// back to a plain text field otherwise, matching the web app's
/// graceful-degradation approach for this same real, billed dependency).
class LocationPickerScreen extends StatefulWidget {
  const LocationPickerScreen({super.key});

  @override
  State<LocationPickerScreen> createState() => _LocationPickerScreenState();
}

class _LocationPickerScreenState extends State<LocationPickerScreen> {
  static const _defaultCenter = LatLng(30.0444, 31.2357); // Cairo — sane default

  GoogleMapController? _mapController;
  LatLng _picked = _defaultCenter;
  String? _address;
  bool _resolving = false;

  Future<void> _resolveAddress(LatLng position) async {
    setState(() {
      _picked = position;
      _resolving = true;
    });
    try {
      final placemarks = await placemarkFromCoordinates(position.latitude, position.longitude);
      final p = placemarks.firstOrNull;
      final address = p == null
          ? "${position.latitude.toStringAsFixed(5)}, ${position.longitude.toStringAsFixed(5)}"
          : [p.street, p.locality, p.country].where((s) => s != null && s.isNotEmpty).join(", ");
      if (!mounted) return;
      setState(() {
        _address = address;
        _resolving = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _resolving = false);
    }
  }

  Future<void> _useCurrentLocation() async {
    final permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      final requested = await Geolocator.requestPermission();
      if (requested == LocationPermission.denied || requested == LocationPermission.deniedForever) return;
    }
    final position = await Geolocator.getCurrentPosition();
    final latLng = LatLng(position.latitude, position.longitude);
    _mapController?.animateCamera(CameraUpdate.newLatLng(latLng));
    await _resolveAddress(latLng);
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context)!;

    return Scaffold(
      appBar: AppBar(
        title: Text(t.addressLabel),
        actions: [
          TextButton(
            onPressed: _address == null
                ? null
                : () => Navigator.pop(
                    context,
                    PickedLocation(address: _address!, lat: _picked.latitude, lng: _picked.longitude),
                  ),
            child: Text(t.confirmLocation),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: GoogleMap(
              initialCameraPosition: const CameraPosition(target: _defaultCenter, zoom: 13),
              onMapCreated: (controller) => _mapController = controller,
              onTap: _resolveAddress,
              markers: {Marker(markerId: const MarkerId("picked"), position: _picked)},
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_resolving) const LinearProgressIndicator(),
                if (_address != null && !_resolving) Text(_address!, textAlign: TextAlign.center),
                const SizedBox(height: 8),
                OutlinedButton(onPressed: _useCurrentLocation, child: Text(t.useCurrentLocation)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

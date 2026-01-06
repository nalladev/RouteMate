import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart' as latlng;

import '../utils/app_state.dart';
import '../models/place_suggestion.dart';
import '../models/driver.dart';
import '../models/ride_request.dart';
import 'pulsing_dot.dart';
import 'rotation_aware_marker.dart';

class MapView extends StatelessWidget {
  final MapController mapController;
  final latlng.LatLng? currentLocation;
  final List<latlng.LatLng> routePoints;
  final PlaceSuggestion? selectedPlace;
  final AppState appState;
  final List<RideRequest> relevantRideRequests;
  final List<Driver> availableDrivers;
  final Function(bool) onMapReady;
  final Function(RideRequest) onPickupPassenger;

  const MapView({
    super.key,
    required this.mapController,
    required this.currentLocation,
    required this.routePoints,
    required this.selectedPlace,
    required this.appState,
    required this.relevantRideRequests,
    required this.availableDrivers,
    required this.onMapReady,
    required this.onPickupPassenger,
  });

  @override
  Widget build(BuildContext context) {
    return FlutterMap(
      mapController: mapController,
      options: MapOptions(
        initialCenter: currentLocation ?? const latlng.LatLng(0, 0),
        initialZoom: 15.0,
        onMapReady: () => onMapReady(true),
      ),
      children: [
        TileLayer(
          urlTemplate: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          userAgentPackageName: 'com.routemate.app',
        ),
        if (routePoints.isNotEmpty)
          PolylineLayer(
            polylines: [
              Polyline(
                points: routePoints,
                strokeWidth: 5.0,
                color: const Color(0xFF0284C7),
                borderColor: const Color(0xFF0369A1),
                borderStrokeWidth: 1.0,
              ),
            ],
          ),
        MarkerLayer(markers: _buildMarkers(context)),
      ],
    );
  }

  List<Marker> _buildMarkers(BuildContext context) {
    List<Marker> markers = [];
    if (currentLocation == null) return markers;

    // 1. User's current location
    markers.add(
      Marker(
        point: currentLocation!,
        width: 80,
        height: 80,
        child: const PulsingDot(),
      ),
    );

    // 2. Destination marker
    if (selectedPlace != null) {
      markers.add(
        _createDestinationMarker(
          latlng.LatLng(selectedPlace!.latitude, selectedPlace!.longitude),
        ),
      );
    }

    // 3. Passenger (ride request) markers for drivers - limit to nearby ones for performance
    if (appState == AppState.driving) {
      // Limit to first 20 requests to avoid rendering too many markers
      final limitedRequests = relevantRideRequests.take(20).toList();
      for (var request in limitedRequests) {
        markers.add(
          Marker(
            point: request.pickupLocation,
            width: 80,
            height: 80,
            child: GestureDetector(
              onTap: () => _showPickupDialog(context, request),
              child: Tooltip(
                message: "To: ${request.destinationName}",
                child: Icon(
                  Icons.hail,
                  color: Colors.purple.shade600,
                  size: 40,
                ),
              ),
            ),
          ),
        );
      }
    }

    // 4. Driver markers for passengers - limit to nearby ones for performance
    if (appState == AppState.searching) {
      // Limit to first 15 drivers to avoid rendering too many markers
      final limitedDrivers = availableDrivers.take(15).toList();
      for (var driver in limitedDrivers) {
        markers.add(
          _createDriverMarker(driver.location, "To: ${driver.destinationName}"),
        );
      }
    }
    return markers;
  }

  void _showPickupDialog(BuildContext context, RideRequest rideRequest) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Pick up passenger?"),
        content: Text(
          "This passenger wants to go to ${rideRequest.destinationName}.",
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text("Ignore"),
          ),
          ElevatedButton(
            onPressed: () {
              onPickupPassenger(rideRequest);
              Navigator.pop(context);
            },
            child: const Text("Pick Up"),
          ),
        ],
      ),
    );
  }

  Marker _createDestinationMarker(latlng.LatLng point) {
    return Marker(
      point: point,
      width: 80,
      height: 80,
      child: RotationAwareMarker(
        mapController: mapController,
        color: Colors.red.shade800,
        size: 45,
        icon: Icons.location_on,
      ),
    );
  }

  Marker _createDriverMarker(latlng.LatLng point, String tooltipMessage) {
    return Marker(
      point: point,
      width: 80,
      height: 80,
      child: Tooltip(
        message: tooltipMessage,
        child: RotationAwareMarker(
          mapController: mapController,
          color: Colors.orange.shade800,
          size: 40,
          icon: Icons.drive_eta,
        ),
      ),
    );
  }
}

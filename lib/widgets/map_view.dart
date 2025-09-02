import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart' as latlng;
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../utils/app_state.dart';
import '../models/place_suggestion.dart';
import 'pulsing_dot.dart';
import 'rotation_aware_marker.dart';

class MapView extends StatelessWidget {
  final MapController mapController;
  final latlng.LatLng? currentLocation;
  final List<latlng.LatLng> routePoints;
  final PlaceSuggestion? selectedPlace;
  final AppState appState;
  final List<DocumentSnapshot> relevantRideRequests;
  final List<DocumentSnapshot> availableDrivers;
  final Function(bool) onMapReady;
  final Function(DocumentSnapshot) onPickupPassenger;

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
        initialCenter: currentLocation!,
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
    markers.add(Marker(
      point: currentLocation!,
      width: 80,
      height: 80,
      child: const PulsingDot(),
    ));

    // 2. Destination marker
    if (selectedPlace != null) {
      markers.add(_createDestinationMarker(latlng.LatLng(
        selectedPlace!.latitude,
        selectedPlace!.longitude,
      )));
    }

    // 3. Passenger (ride request) markers for drivers
    if (appState == AppState.driving) {
      for (var doc in relevantRideRequests) {
        final data = doc.data() as Map<String, dynamic>;
        final geoPoint = data['location'] as GeoPoint;
        markers.add(Marker(
          point: latlng.LatLng(geoPoint.latitude, geoPoint.longitude),
          width: 80,
          height: 80,
          child: GestureDetector(
            onTap: () => _showPickupDialog(context, doc),
            child: Tooltip(
              message: "To: ${data['destination']}",
              child: Icon(Icons.hail, color: Colors.purple.shade600, size: 40),
            ),
          ),
        ));
      }
    }

    // 4. Driver markers for passengers
    if (appState == AppState.searching) {
      for (var doc in availableDrivers) {
        final data = doc.data() as Map<String, dynamic>;
        final geoPoint = data['location'] as GeoPoint;
        markers.add(_createDriverMarker(
          latlng.LatLng(geoPoint.latitude, geoPoint.longitude),
          "To: ${data['destination_name']}",
        ));
      }
    }
    return markers;
  }

  void _showPickupDialog(BuildContext context, DocumentSnapshot rideRequest) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Pick up passenger?"),
        content: Text(
          "This passenger wants to go to ${rideRequest['destination']}.",
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
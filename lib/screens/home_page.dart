import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart' as latlng;
import 'package:location/location.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../models/place_suggestion.dart';
import '../utils/app_state.dart';
import '../widgets/map_view.dart';
import '../widgets/control_panel.dart';
import '../widgets/profile_button.dart';
import '../widgets/wallet_bottom_sheet.dart';


class RouteMateHomePage extends StatefulWidget {
  const RouteMateHomePage({super.key});

  @override
  State<RouteMateHomePage> createState() => _RouteMateHomePageState();
}

class _RouteMateHomePageState extends State<RouteMateHomePage> {
  // App State & Controllers
  AppState _appState = AppState.initial;
  final TextEditingController _destinationController = TextEditingController();
  final MapController _mapController = MapController();
  bool _isMapReady = false;

  // Firebase & Location
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final Location _locationService = Location();
  StreamSubscription? _locationSubscription;
  User? _currentUser;

  // App Data
  int _walletPoints = 100;
  latlng.LatLng? _currentLocation;
  List<latlng.LatLng> _routePoints = [];

  // Search-specific state
  List<PlaceSuggestion> _suggestions = [];
  PlaceSuggestion? _selectedPlace;
  bool _isSearching = false;
  Timer? _debounce;

  // Realtime subscriptions and data lists
  StreamSubscription? _rideRequestsSubscription;
  StreamSubscription? _driversSubscription;
  List<DocumentSnapshot> _relevantRideRequests = [];
  List<DocumentSnapshot> _availableDrivers = [];
  static const double proximityThreshold = 3000; // 3km in meters

  @override
  void initState() {
    super.initState();
    _initializeApp();
  }

  // --- CORE LOGIC & STATE MANAGEMENT ---

  Future<void> _initializeApp() async {
    await _signInAnonymously();
    await _requestLocationPermission();
    _listenToLocationChanges();
    _fetchWalletPoints();
  }

  Future<void> _signInAnonymously() async {
    try {
      final userCredential = await _auth.signInAnonymously();
      setState(() => _currentUser = userCredential.user);
    } catch (e) {
      _showMessage("Error signing in. Please restart the app.");
    }
  }

  Future<void> _requestLocationPermission() async {
    bool serviceEnabled = await _locationService.serviceEnabled();
    if (!serviceEnabled) {
      serviceEnabled = await _locationService.requestService();
      if (!serviceEnabled) return;
    }
    PermissionStatus permission = await _locationService.hasPermission();
    if (permission == PermissionStatus.denied) {
      permission = await _locationService.requestPermission();
      if (permission != PermissionStatus.granted) return;
    }
  }

  void _listenToLocationChanges() {
    _locationSubscription =
        _locationService.onLocationChanged.listen((LocationData newLocation) {
      if (!mounted ||
          newLocation.latitude == null ||
          newLocation.longitude == null) {return;}

      final newPos = latlng.LatLng(newLocation.latitude!, newLocation.longitude!);
      setState(() => _currentLocation = newPos);

      if (_isMapReady && _appState != AppState.driving) {
        _mapController.move(newPos, _mapController.camera.zoom);
      }
      _updateUserLocationInDb();
    });
  }

  void _updateUserLocationInDb() {
    if (_currentUser == null || _currentLocation == null) return;
    _firestore.collection('users').doc(_currentUser!.uid).set({
      'location':
          GeoPoint(_currentLocation!.latitude, _currentLocation!.longitude),
      'last_seen': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));
  }

  void _fetchWalletPoints() {
    if (_currentUser == null) return;
    _firestore
        .collection('users')
        .doc(_currentUser!.uid)
        .snapshots()
        .listen((doc) {
      if (doc.exists && doc.data()!.containsKey('wallet_points')) {
        if (mounted) setState(() => _walletPoints = doc.data()!['wallet_points']);
      } else {
        _firestore
            .collection('users')
            .doc(_currentUser!.uid)
            .set({'wallet_points': 100}, SetOptions(merge: true));
      }
    });
  }

  void _onSearchChanged(String query) {
    if (_debounce?.isActive ?? false) _debounce!.cancel();
    _debounce = Timer(const Duration(milliseconds: 500), () {
      if (query.length > 2) {
        _performSearch(query);
      } else {
        setState(() => _suggestions = []);
      }
    });
  }

  void _handleSuggestionSelected(PlaceSuggestion suggestion) {
    setState(() {
      _destinationController.text = suggestion.displayName;
      _selectedPlace = suggestion;
      _suggestions = [];
    });
    FocusScope.of(context).unfocus();
  }

  void _resetApp() {
    if (_appState == AppState.searching) {
      _firestore.collection('ride_requests').doc(_currentUser?.uid).delete();
    }
    if (_appState == AppState.driving && _currentUser != null) {
      _firestore.collection('users').doc(_currentUser!.uid).update({
        'status': 'idle',
        'destination_name': null,
        'destination_location': null,
      });
    }
    _rideRequestsSubscription?.cancel();
    _driversSubscription?.cancel();
    setState(() {
      _appState = AppState.initial;
      _destinationController.clear();
      _suggestions = [];
      _selectedPlace = null;
      _routePoints = [];
      _relevantRideRequests = [];
      _availableDrivers = [];
    });
  }

  void _handlePassengerPickup(DocumentSnapshot rideRequest) {
    rideRequest.reference.update({
      'status': 'picked_up',
      'driver_id': _currentUser!.uid,
    });
    _showMessage("Passenger picked up!");
  }


  // --- ASYNC OPERATIONS & API CALLS ---

  Future<void> _performSearch(String query) async {
    setState(() => _isSearching = true);
    try {
      final uri = Uri.parse(
          'https://nominatim.openstreetmap.org/search?q=$query&format=json&limit=5');
      final response =
          await http.get(uri, headers: {'User-Agent': 'com.routemate.app'});
      if (response.statusCode == 200) {
        final List results = json.decode(response.body);
        setState(() => _suggestions =
            results.map((e) => PlaceSuggestion.fromJson(e)).toList());
      } else {
        _showMessage("Error fetching locations.");
      }
    } catch (e) {
      _showMessage("Could not connect to location service.");
    } finally {
      if (mounted) setState(() => _isSearching = false);
    }
  }

  Future<void> _getRoute() async {
    if (_currentLocation == null || _selectedPlace == null) return;
    final start = _currentLocation!;
    final end = latlng.LatLng(_selectedPlace!.latitude, _selectedPlace!.longitude);
    final url =
        'http://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson';
    try {
      final response = await http.get(Uri.parse(url));
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final geometry = data['routes'][0]['geometry']['coordinates'];
        final points = geometry
            .map<latlng.LatLng>((coord) => latlng.LatLng(coord[1], coord[0]))
            .toList();
        setState(() => _routePoints = points);
        if (_routePoints.isNotEmpty && _isMapReady) {
          final bounds = LatLngBounds.fromPoints(_routePoints);
          _mapController.fitCamera(CameraFit.bounds(
            bounds: bounds,
            padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 80),
          ));
        }
      } else {
        _showMessage("Could not get route.");
      }
    } catch (e) {
      _showMessage("Error connecting to routing service.");
    }
  }

  Future<void> _startDriving() async {
    if (_selectedPlace == null || _currentUser == null) {
      _showMessage("Please select a destination.");
      return;
    }
    _showMessage('Fetching route...');
    await _getRoute();
    if (_routePoints.isNotEmpty) {
      await _firestore.collection('users').doc(_currentUser!.uid).update({
        'status': 'driving',
        'destination_name': _selectedPlace!.displayName,
        'destination_location':
            GeoPoint(_selectedPlace!.latitude, _selectedPlace!.longitude),
      });
      setState(() => _appState = AppState.driving);
      _listenForRideRequests();
      _showMessage("You are now driving.");
    }
  }

  void _findRide() {
    if (_selectedPlace == null || _currentLocation == null) {
      _showMessage("Please select a destination.");
      return;
    }
    _firestore.collection('ride_requests').doc(_currentUser!.uid).set({
      'passenger_id': _currentUser!.uid,
      'location': GeoPoint(_currentLocation!.latitude, _currentLocation!.longitude),
      'destination': _selectedPlace!.displayName,
      'destination_location': GeoPoint(_selectedPlace!.latitude, _selectedPlace!.longitude),
      'status': 'waiting',
      'timestamp': FieldValue.serverTimestamp(),
    });
    setState(() => _appState = AppState.searching);
    _listenForDrivers();
    _showMessage("Requesting a ride...");
  }

  // --- REALTIME LISTENERS ---

  void _listenForRideRequests() {
    _rideRequestsSubscription?.cancel();
    if (_appState != AppState.driving || _selectedPlace == null) return;
    _rideRequestsSubscription = _firestore
        .collection('ride_requests')
        .where('status', isEqualTo: 'waiting')
        .snapshots()
        .listen((snapshot) {
      if (!mounted) return;
      final driverDest = _selectedPlace!;
      List<DocumentSnapshot> relevant = snapshot.docs.where((doc) {
        final destPoint = doc.data()['destination_location'] as GeoPoint;
        return _calculateDistance(driverDest.latitude, driverDest.longitude,
                destPoint.latitude, destPoint.longitude) <=
            proximityThreshold;
      }).toList();
      setState(() => _relevantRideRequests = relevant);
    });
  }

  void _listenForDrivers() {
    _driversSubscription?.cancel();
    if (_appState != AppState.searching || _selectedPlace == null) return;
    _driversSubscription = _firestore
        .collection('users')
        .where('status', isEqualTo: 'driving')
        .snapshots()
        .listen((snapshot) {
      if (!mounted) return;
      final passengerDest = _selectedPlace!;
      List<DocumentSnapshot> matched = snapshot.docs.where((doc) {
        final data = doc.data();
        if (data['destination_location'] == null) return false;
        final destPoint = data['destination_location'] as GeoPoint;
        return _calculateDistance(passengerDest.latitude,
                passengerDest.longitude, destPoint.latitude, destPoint.longitude) <=
            proximityThreshold;
      }).toList();
      setState(() => _availableDrivers = matched);
    });
  }

  // --- UI & HELPERS ---

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _currentLocation == null
          ? const Center(child: CircularProgressIndicator())
          : Stack(
              children: [
                MapView(
                  mapController: _mapController,
                  currentLocation: _currentLocation,
                  routePoints: _routePoints,
                  selectedPlace: _selectedPlace,
                  appState: _appState,
                  relevantRideRequests: _relevantRideRequests,
                  availableDrivers: _availableDrivers,
                  onMapReady: (isReady) => setState(() => _isMapReady = isReady),
                  onPickupPassenger: _handlePassengerPickup,
                ),
                ControlPanel(
                  appState: _appState,
                  destinationController: _destinationController,
                  isSearching: _isSearching,
                  suggestions: _suggestions,
                  availableDrivers: _availableDrivers,
                  onSearchChanged: _onSearchChanged,
                  onSuggestionSelected: _handleSuggestionSelected,
                  onStartDriving: _startDriving,
                  onFindRide: _findRide,
                  onReset: _resetApp,
                ),
                ProfileButton(onPressed: _showWallet),
              ],
            ),
    );
  }

  void _showWallet() {
    showModalBottomSheet(
      context: context,
      builder: (context) => WalletBottomSheet(
        currentUser: _currentUser,
        walletPoints: _walletPoints,
      ),
    );
  }

  double _calculateDistance(lat1, lon1, lat2, lon2) {
    var p = 0.017453292519943295;
    var a = 0.5 -
        math.cos((lat2 - lat1) * p) / 2 +
        math.cos(lat1 * p) *
            math.cos(lat2 * p) *
            (1 - math.cos((lon2 - lon1) * p)) /
            2;
    return 12742 * 1000 * math.asin(math.sqrt(a));
  }

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(message),
      backgroundColor: Colors.black87,
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      margin: const EdgeInsets.all(16),
    ));
  }

  @override
  void dispose() {
    _locationSubscription?.cancel();
    _destinationController.dispose();
    _mapController.dispose();
    _debounce?.cancel();
    _rideRequestsSubscription?.cancel();
    _driversSubscription?.cancel();
    super.dispose();
  }
}
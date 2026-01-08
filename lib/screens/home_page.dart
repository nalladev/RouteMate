import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart' as latlng;
import 'package:provider/provider.dart';

import '../models/place_suggestion.dart';
import '../models/driver.dart';
import '../models/ride_request.dart';
import '../models/user_model.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../services/location_service.dart';
import '../utils/app_state.dart';
import '../widgets/map_view.dart';
import '../widgets/control_panel.dart';
import '../widgets/profile_button.dart';
import '../widgets/wallet_bottom_sheet.dart';
import './rewards_page.dart';

class RouteMateHomePage extends StatefulWidget {
  const RouteMateHomePage({super.key});

  @override
  State<RouteMateHomePage> createState() => _RouteMateHomePageState();
}

class _RouteMateHomePageState extends State<RouteMateHomePage> {
  // App State & Controllers
  AppState _appState = AppState.initial;
  int _selectedIndex = 0;
  final _destinationController = TextEditingController();
  final _mapController = MapController();
  bool _isMapReady = false;
  bool _loggedFirstLocation = false;

  // Services
  late ApiService _apiService;
  late AuthService _authService;
  late LocationService _locationService;
  StreamSubscription? _locationSubscription;

  // App Data
  UserModel? _currentUser;
  int _walletPoints = 0;
  latlng.LatLng? _currentLocation;
  List<latlng.LatLng> _routePoints = [];

  // Search-specific state
  List<PlaceSuggestion> _suggestions = [];
  PlaceSuggestion? _selectedPlace;
  bool _isSearching = false;
  Timer? _debounce;

  // Polling timers and data lists for real-time updates
  Timer? _rideRequestsPoller;
  Timer? _driversPoller;
  List<RideRequest> _relevantRideRequests = [];
  List<Driver> _availableDrivers = [];

  @override
  void initState() {
    super.initState();
    // Services are fetched from the Provider, not instantiated directly.
    _apiService = Provider.of<ApiService>(context, listen: false);
    _authService = Provider.of<AuthService>(context, listen: false);
    _locationService = LocationService();
    _currentUser = _authService.user;

    _initializeApp();
  }

  // --- CORE LOGIC & STATE MANAGEMENT ---

  Future<void> _initializeApp() async {
    _log('Initializing home page...');
    _fetchWalletPoints();
    // Initialize location service asynchronously - don't block UI
    _initializeLocationService();
  }

  void _initializeLocationService() async {
    try {
      final result = await _locationService.initialize();

      if (result.isSuccess) {
        setState(() {
          _currentLocation = result.position;
        });

        if (!_loggedFirstLocation && result.position != null) {
          _loggedFirstLocation = true;
          _log('First location fix: ${result.position!.latitude}, ${result.position!.longitude}');
        }

        // Start listening to location updates
        await _locationService.startLocationUpdates();
        _listenToLocationChanges();
      } else if (result.errorMessage != null) {
        _log('Location initialization failed: ${result.errorMessage}');
        // Don't show intrusive messages - just log for debugging
      }
    } catch (e) {
      _log('Location service initialization error: $e');
    }
  }

  void _listenToLocationChanges() {
    _locationSubscription = _locationService.locationStream.listen(
      (locationResult) {
        if (!mounted || !locationResult.isSuccess) return;

        final newPos = locationResult.position!;
        setState(() {
          _currentLocation = newPos;
        });

        if (_isMapReady && _appState != AppState.driving) {
          _mapController.move(newPos, _mapController.camera.zoom);
        }

        // Update location in database asynchronously without blocking UI
        _updateUserLocationInDb(newPos);
      },
      onError: (error) {
        _log('Location stream error: $error');
      },
    );
  }

  Future<void> _updateUserLocationInDb(latlng.LatLng location) async {
    if (_currentUser == null) return;
    try {
      await _apiService.updateUserLocation(location);
    } on ApiException catch (e) {
      // Silently fail - don't interrupt user experience with location update errors
      debugPrint("Failed to update location: ${e.message}");
    } catch (e) {
      // Handle any other exceptions silently
      debugPrint("Location update error: $e");
    }
  }

  Future<void> _fetchWalletPoints() async {
    if (_currentUser == null) return;
    try {
      final points = await _apiService.getWalletPoints();
      if (mounted) setState(() => _walletPoints = points);
    } on ApiException catch (e) {
      _showMessage("Could not fetch wallet balance: ${e.message}");
    }
  }

  void _onSearchChanged(String query) {
    if (_debounce?.isActive ?? false) _debounce!.cancel();
    _debounce = Timer(const Duration(milliseconds: 500), () {
      if (query.length > 2) {
        _performSearch(query);
      } else {
        if (mounted) setState(() => _suggestions = []);
      }
    });
  }

  void _handleSuggestionSelected(PlaceSuggestion suggestion) {
    if (!mounted) return;
    setState(() {
      _destinationController.text = suggestion.displayName;
      _selectedPlace = suggestion;
      _suggestions = [];
    });
    FocusScope.of(context).unfocus();
  }

  Future<void> _resetApp() async {
    try {
      if (_appState == AppState.searching) {
        await _apiService.cancelRideRequest();
      }
      if (_appState == AppState.driving) {
        await _apiService.stopDriving();
      }
    } on ApiException catch (e) {
      _showMessage("Error: ${e.message}");
    } finally {
      _stopPolling();
      if (mounted) {
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
    }
  }

  Future<void> _handlePassengerPickup(RideRequest rideRequest) async {
    try {
      await _apiService.acceptRide(rideRequest.id);
      _showMessage("Passenger picked up! Route is being updated.");
      // In a real app, you might re-calculate the route to the passenger's destination
    } on ApiException catch (e) {
      _showMessage("Error picking up passenger: ${e.message}");
    }
  }

  // --- ASYNC OPERATIONS & API CALLS ---

  Future<void> _performSearch(String query) async {
    if (!mounted) return;
    setState(() => _isSearching = true);
    try {
      final results = await _apiService.searchPlaces(query);
      if (mounted) setState(() => _suggestions = results);
    } on ApiException catch (e) {
      _showMessage(e.message);
    } finally {
      if (mounted) setState(() => _isSearching = false);
    }
  }

  Future<void> _getRoute() async {
    if (_selectedPlace == null) {
      _showMessage("Please select a destination first.");
      return;
    }

    // Use current location if available, otherwise use a default location
    final start = _currentLocation ?? _locationService.getDefaultCenter();
    final end = latlng.LatLng(
      _selectedPlace!.latitude,
      _selectedPlace!.longitude,
    );

    try {
      final points = await _apiService.getRoute(start, end);
      if (mounted) {
        setState(() => _routePoints = points);
        _log('Route received with ${points.length} points.');
        if (_routePoints.isNotEmpty && _isMapReady) {
          final bounds = LatLngBounds.fromPoints(_routePoints);
          _mapController.fitCamera(
            CameraFit.bounds(
              bounds: bounds,
              padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 80),
            ),
          );
        }
      }
    } on ApiException catch (e) {
      _showMessage("Could not get route: ${e.message}");
    }
  }

  Future<void> _startDriving() async {
    if (_selectedPlace == null) {
      _showMessage("Please select a destination.");
      return;
    }
    _showMessage('Setting you as "driving"...');
    try {
      await _apiService.startDriving(_selectedPlace!);
      await _getRoute(); // Also fetch the route for the driver
      if (mounted) {
        setState(() => _appState = AppState.driving);
        _startPollingForRideRequests();
        _showMessage("You are now driving.");
      }
    } on ApiException catch (e) {
      _showMessage("Failed to start driving: ${e.message}");
    }
  }

  Future<void> _findRide() async {
    if (_selectedPlace == null) {
      _showMessage("Please select a destination.");
      return;
    }

    if (_currentLocation == null) {
      _showMessage("Location not available. Please enable GPS or try again.");
      return;
    }

    _showMessage("Requesting a ride...");
    try {
      await _apiService.createRideRequest(
        _selectedPlace!,
        _currentLocation!,
      );
      if (mounted) {
        setState(() => _appState = AppState.searching);
        _startPollingForDrivers();
      }
    } on ApiException catch (e) {
      _showMessage("Failed to request ride: ${e.message}");
    }
  }

  // --- POLLING FOR REALTIME UPDATES ---

  void _startPollingForRideRequests() {
    _rideRequestsPoller?.cancel();
    _rideRequestsPoller = Timer.periodic(const Duration(seconds: 10), (
      timer,
    ) async {
      if (!mounted || _appState != AppState.driving) {
        timer.cancel();
        return;
      }
      try {
        final requests = await _apiService.getRelevantRideRequests();
        if (mounted) setState(() => _relevantRideRequests = requests);
      } on ApiException catch (e) {
        debugPrint("Failed to poll for ride requests: ${e.message}");
      }
    });
  }

  void _startPollingForDrivers() {
    _driversPoller?.cancel();
    _driversPoller = Timer.periodic(const Duration(seconds: 10), (timer) async {
      if (!mounted || _appState != AppState.searching) {
        timer.cancel();
        return;
      }
      try {
        final drivers = await _apiService.getAvailableDrivers();
        if (mounted) setState(() => _availableDrivers = drivers);
      } on ApiException catch (e) {
        debugPrint("Failed to poll for drivers: ${e.message}");
      }
    });
  }

  void _stopPolling() {
    _rideRequestsPoller?.cancel();
    _driversPoller?.cancel();
  }

  // --- UI & HELPERS ---

  Widget _buildHomeContent() {
    return Stack(
      children: [
        MapView(
          mapController: _mapController,
          currentLocation: _currentLocation, // Can be null, map will handle it
          routePoints: _routePoints,
          selectedPlace: _selectedPlace,
          appState: _appState,
          relevantRideRequests: _relevantRideRequests,
          availableDrivers: _availableDrivers,
          onMapReady: (isReady) {
            _log('Map ready: $isReady');
            if (mounted) setState(() => _isMapReady = isReady);
          },
          onPickupPassenger: (rideRequest) =>
              _handlePassengerPickup(rideRequest),
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
        // Show location status indicator when location is not available
        if (_currentLocation == null)
          Positioned(
            top: 100,
            left: 16,
            right: 16,
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.orange.shade100,
                border: Border.all(color: Colors.orange.shade300),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(Icons.location_off, color: Colors.orange.shade700),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _locationService.getStatusMessage(),
                      style: TextStyle(color: Colors.orange.shade700),
                    ),
                  ),
                  TextButton(
                    onPressed: () async {
                      final result = await _locationService.retryPermission();
                      if (result.isSuccess) {
                        setState(() {
                          _currentLocation = result.position;
                        });
                        await _locationService.startLocationUpdates();
                        _listenToLocationChanges();
                      }
                    },
                    child: const Text('Retry'),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final List<Widget> pages = [_buildHomeContent(), const RewardsPage()];

    return Scaffold(
      body: pages[_selectedIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (int index) {
          if (mounted) setState(() => _selectedIndex = index);
        },
        destinations: const [
          NavigationDestination(icon: Icon(Icons.map), label: 'Map'),
          NavigationDestination(icon: Icon(Icons.stars), label: 'Rewards'),
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

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.black87,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  @override
  void dispose() {
    _locationSubscription?.cancel();
    _locationService.stopLocationUpdates();
    _destinationController.dispose();
    _mapController.dispose();
    _debounce?.cancel();
    _stopPolling();
    super.dispose();
  }

  void _log(String message) {
    if (kDebugMode) {
      debugPrint('[Home] $message');
    }
  }
}

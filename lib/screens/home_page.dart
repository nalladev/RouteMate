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
import '../services/comprehensive_auth_service.dart';
import '../services/location_service.dart';
import '../utils/app_state.dart';
import '../widgets/map_view.dart';
import '../widgets/control_panel.dart';
import '../widgets/profile_button.dart';
import '../widgets/wallet_bottom_sheet.dart';
import '../widgets/rider_connection_panel.dart';
import '../services/location_update_manager.dart';
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
  late ComprehensiveAuthService _authService;
  late LocationService _locationService;
  late LocationUpdateManager _locationUpdateManager;
  StreamSubscription? _locationSubscription;
  bool _followLocation = true;

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
  
  // Ride request tracking for passenger
  String? _activeRideRequestId;

  @override
  void initState() {
    super.initState();
    // Services are fetched from the Provider, not instantiated directly.
    _apiService = Provider.of<ApiService>(context, listen: false);
    _authService = Provider.of<ComprehensiveAuthService>(context, listen: false);
    _locationService = LocationService();
    _locationUpdateManager = LocationUpdateManager(_apiService);
    _currentUser = _authService.backendUser;

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

        if (_isMapReady && _followLocation) {
          _mapController.move(newPos, _mapController.camera.zoom);
        }

        // Update user status for smart location updates
        _locationUpdateManager.setUserStatus(_getUserStatusString());

        // Use smart location update manager
        _locationUpdateManager.updateLocation(newPos).then((updated) {
          if (updated) {
            debugPrint('Location updated on server');
          }
        });
      },
      onError: (error) {
        _log('Location stream error: $error');
      },
    );
  }

  String _getUserStatusString() {
    switch (_appState) {
      case AppState.idle:
        return 'idle';
      case AppState.driving:
        return 'driving';
      case AppState.searching:
        return 'searching';
      case AppState.initial:
        return 'idle';
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
          _activeRideRequestId = null;
          _followLocation = true;
        });
      }
    }
  }

  Future<void> _handlePassengerPickup(RideRequest rideRequest) async {
    try {
      // Note: acceptRide endpoint not available in backend
      // Auto-accept is handled server-side during ride matching
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
      // OSRM returns 404 for impossible/very long over-water routes; show a helpful message
      if (e.message.toLowerCase().contains('route not found')) {
        if (mounted) {
          setState(() => _routePoints = [start, end]);
        }
        _showMessage("No driving route found between these locations. Showing a straight-line preview.");
      } else {
        _showMessage("Could not get route: ${e.message}");
      }
    }
  }

  Future<void> _startDriving() async {
    if (_selectedPlace == null) {
      _showMessage("Please select a destination.");
      return;
    }
    // Ensure backend has a current location stored before starting session
    if (_currentLocation != null) {
      await _apiService.updateUserLocation(_currentLocation!);
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
      final requestId = await _apiService.createRideRequestNew(
        pickup: _currentLocation!,
        destination: _selectedPlace!,
      );
      if (mounted) {
        setState(() {
          _appState = AppState.searching;
          _activeRideRequestId = requestId;
        });
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
        final drivers = await _apiService.getNearbyDrivers();
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

  Future<void> _matchWithDriver(Driver driver) async {
    _showMessage('Connecting with driver...');
    try {
      final rideId = await _apiService.matchRide(
        requestId: _activeRideRequestId!,
        sessionId: driver.sessionId!,
      );
      
      if (mounted) {
        _showMessage('Connected with driver! Ride ID: $rideId');
        // Stop polling as ride is now matched
        _stopPolling();
        setState(() {
          _appState = AppState.initial;
          _destinationController.clear();
          _suggestions = [];
          _selectedPlace = null;
          _routePoints = [];
          _relevantRideRequests = [];
          _availableDrivers = [];
          _activeRideRequestId = null;
          _followLocation = true;
        });
      }
    } on ApiException catch (e) {
      _showMessage("Failed to connect with driver: ${e.message}");
    }
  }

  // Manual refresh methods for UI
  Future<void> _refreshDriversList() async {
    try {
      final drivers = await _apiService.getNearbyDrivers();
      if (mounted) setState(() => _availableDrivers = drivers);
      _showMessage('Found ${drivers.length} driver${drivers.length == 1 ? '' : 's'} nearby');
    } on ApiException catch (e) {
      _showMessage("Failed to refresh drivers: ${e.message}");
    }
  }

  Future<void> _refreshRequestsList() async {
    try {
      final requests = await _apiService.getRelevantRideRequests();
      if (mounted) setState(() => _relevantRideRequests = requests);
      _showMessage('Found ${requests.length} ride request${requests.length == 1 ? '' : 's'} nearby');
    } on ApiException catch (e) {
      _showMessage("Failed to refresh requests: ${e.message}");
    }
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
              onUserPan: () {
                if (mounted) setState(() => _followLocation = false);
              },
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
        Positioned(
          top: 110, // sits just below the profile button
          right: 16,
          child: FloatingActionButton.small(
            heroTag: 'recenter',
            onPressed: () {
              if (_currentLocation != null) {
                setState(() => _followLocation = true);
                _mapController.move(_currentLocation!, _mapController.camera.zoom);
              }
            },
            child: const Icon(Icons.my_location),
          ),
        ),
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
                      if (result.isSuccess && result.position != null) {
                        setState(() {
                          _currentLocation = result.position;
                          _loggedFirstLocation = false;
                        });
                        // Restart location updates and listening
                        await _locationService.startLocationUpdates();
                        if (_locationSubscription != null) {
                          await _locationSubscription!.cancel();
                        }
                        _listenToLocationChanges();
                      } else {
                        setState(() {}); // Force UI update even if permission was denied
                      }
                    },
                    child: const Text('Retry'),
                  ),
                ],
              ),
            ),
          ),
        // Draggable panel showing available riders/passengers
        RiderConnectionPanel(
          appState: _appState,
          availableDrivers: _availableDrivers,
          availableRequests: _relevantRideRequests,
          onRefresh: () {
            if (_appState == AppState.searching) {
              _refreshDriversList();
            } else if (_appState == AppState.driving) {
              _refreshRequestsList();
            }
          },
          onDriverSelected: (driver) {
            if (_activeRideRequestId == null) {
              _showMessage('No active ride request. Please request a ride first.');
              return;
            }
            if (driver.sessionId == null) {
              _showMessage('Driver session information unavailable.');
              return;
            }
            _matchWithDriver(driver);
          },
          onRequestSelected: (request) {
            _handlePassengerPickup(request);
          },
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

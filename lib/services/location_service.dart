import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:location/location.dart';
import 'package:latlong2/latlong.dart' as latlng;

enum LocationStatus {
  unknown,
  disabled,
  denied,
  deniedForever,
  granted,
  serviceDisabled,
  timeout,
  error,
}

class LocationResult {
  final LocationStatus status;
  final latlng.LatLng? position;
  final String? errorMessage;

  const LocationResult({
    required this.status,
    this.position,
    this.errorMessage,
  });

  bool get isSuccess => status == LocationStatus.granted && position != null;
  bool get hasPermission => status == LocationStatus.granted;
}

class LocationService with ChangeNotifier {
  static final LocationService _instance = LocationService._internal();
  factory LocationService() => _instance;
  LocationService._internal();

  final Location _locationService = Location();
  StreamSubscription<LocationData>? _locationSubscription;

  // Current state
  LocationStatus _status = LocationStatus.unknown;
  latlng.LatLng? _currentLocation;
  String? _lastErrorMessage;
  bool _isInitialized = false;
  bool _isListening = false;

  // Stream controllers for reactive updates
  final StreamController<LocationResult> _locationController =
      StreamController<LocationResult>.broadcast();
  final StreamController<LocationStatus> _statusController =
      StreamController<LocationStatus>.broadcast();

  // Getters
  LocationStatus get status => _status;
  latlng.LatLng? get currentLocation => _currentLocation;
  String? get lastErrorMessage => _lastErrorMessage;
  bool get isInitialized => _isInitialized;
  bool get isListening => _isListening;
  bool get hasValidLocation => _currentLocation != null && _status == LocationStatus.granted;

  // Streams
  Stream<LocationResult> get locationStream => _locationController.stream;
  Stream<LocationStatus> get statusStream => _statusController.stream;

  /// Initialize location service - non-blocking, handles all edge cases gracefully
  Future<LocationResult> initialize() async {
    if (_isInitialized) {
      return LocationResult(
        status: _status,
        position: _currentLocation,
        errorMessage: _lastErrorMessage,
      );
    }

    try {
      final result = await _checkPermissions();
      _updateStatus(result.status, result.errorMessage);

      if (result.hasPermission) {
        await _getCurrentLocation();
      }

      _isInitialized = true;
      return LocationResult(
        status: _status,
        position: _currentLocation,
        errorMessage: _lastErrorMessage,
      );
    } catch (e) {
      _updateStatus(LocationStatus.error, 'Failed to initialize location service: $e');
      _isInitialized = true;
      return LocationResult(
        status: LocationStatus.error,
        errorMessage: _lastErrorMessage,
      );
    }
  }

  /// Check and request location permissions
  Future<LocationResult> _checkPermissions() async {
    if (kIsWeb) {
      // On web, skip explicit permission checks as they can be unreliable
      return const LocationResult(status: LocationStatus.granted);
    }

    try {
      // Check if location service is enabled
      bool serviceEnabled = await _locationService.serviceEnabled().timeout(
        const Duration(seconds: 3),
        onTimeout: () => false,
      );

      if (!serviceEnabled) {
        serviceEnabled = await _locationService.requestService().timeout(
          const Duration(seconds: 5),
          onTimeout: () => false,
        );

        if (!serviceEnabled) {
          return const LocationResult(
            status: LocationStatus.serviceDisabled,
            errorMessage: 'Location services are disabled. Please enable GPS.',
          );
        }
      }

      // Check permissions
      PermissionStatus permission = await _locationService.hasPermission();
      if (permission == PermissionStatus.denied) {
        permission = await _locationService.requestPermission();
      }

      switch (permission) {
        case PermissionStatus.granted:
        case PermissionStatus.grantedLimited:
          return const LocationResult(status: LocationStatus.granted);

        case PermissionStatus.denied:
          return const LocationResult(
            status: LocationStatus.denied,
            errorMessage: 'Location permission denied. Enable it for better experience.',
          );

        case PermissionStatus.deniedForever:
          return const LocationResult(
            status: LocationStatus.deniedForever,
            errorMessage: 'Location permission permanently denied. Enable it in system settings.',
          );
      }
    } on TimeoutException {
      return const LocationResult(
        status: LocationStatus.timeout,
        errorMessage: 'Location permission request timed out.',
      );
    } catch (e) {
      return LocationResult(
        status: LocationStatus.error,
        errorMessage: 'Permission check failed: $e',
      );
    }
  }

  /// Get current location once
  Future<LocationResult> getCurrentLocation() async {
    if (!_isInitialized) {
      await initialize();
    }

    if (_status != LocationStatus.granted) {
      return LocationResult(
        status: _status,
        errorMessage: _lastErrorMessage ?? 'Location permission not granted',
      );
    }

    return await _getCurrentLocation();
  }

  Future<LocationResult> _getCurrentLocation() async {
    try {
      final locationData = await _locationService.getLocation().timeout(
        const Duration(seconds: 10),
        onTimeout: () => throw TimeoutException('Location request timed out'),
      );

      if (locationData.latitude != null && locationData.longitude != null) {
        final position = latlng.LatLng(
          locationData.latitude!,
          locationData.longitude!,
        );

        _currentLocation = position;
        _updateStatus(LocationStatus.granted, null);

        return LocationResult(
          status: LocationStatus.granted,
          position: position,
        );
      } else {
        return const LocationResult(
          status: LocationStatus.error,
          errorMessage: 'Invalid location data received',
        );
      }
    } on TimeoutException {
      return const LocationResult(
        status: LocationStatus.timeout,
        errorMessage: 'Location request timed out',
      );
    } catch (e) {
      return LocationResult(
        status: LocationStatus.error,
        errorMessage: 'Failed to get location: $e',
      );
    }
  }

  /// Start listening to location updates
  Future<void> startLocationUpdates() async {
    if (_isListening || _status != LocationStatus.granted) return;

    try {
      _locationSubscription = _locationService.onLocationChanged.listen(
        (LocationData locationData) {
          if (locationData.latitude != null && locationData.longitude != null) {
            final position = latlng.LatLng(
              locationData.latitude!,
              locationData.longitude!,
            );

            _currentLocation = position;
            _locationController.add(LocationResult(
              status: LocationStatus.granted,
              position: position,
            ));

            notifyListeners();
          }
        },
        onError: (error) {
          debugPrint('Location stream error: $error');
          _updateStatus(LocationStatus.error, 'Location updates failed: $error');

          _locationController.add(LocationResult(
            status: LocationStatus.error,
            errorMessage: 'Location updates failed: $error',
          ));
        },
      );

      _isListening = true;
      debugPrint('Location updates started');
    } catch (e) {
      debugPrint('Failed to start location updates: $e');
      _updateStatus(LocationStatus.error, 'Failed to start location updates: $e');
    }
  }

  /// Stop listening to location updates
  void stopLocationUpdates() {
    _locationSubscription?.cancel();
    _locationSubscription = null;
    _isListening = false;
    debugPrint('Location updates stopped');
  }

  /// Retry getting location permission (useful for retry buttons)
  Future<LocationResult> retryPermission() async {
    _isInitialized = false;
    _updateStatus(LocationStatus.unknown, null);
    return await initialize();
  }

  /// Update status and notify listeners
  void _updateStatus(LocationStatus newStatus, String? errorMessage) {
    if (_status != newStatus || _lastErrorMessage != errorMessage) {
      _status = newStatus;
      _lastErrorMessage = errorMessage;
      _statusController.add(_status);
      notifyListeners();
    }
  }

  /// Get a default center location (San Francisco) for when location is not available
  latlng.LatLng getDefaultCenter() {
    return const latlng.LatLng(37.7749, -122.4194); // San Francisco
  }

  /// Get the best available location (current or default)
  latlng.LatLng getBestLocation() {
    return _currentLocation ?? getDefaultCenter();
  }

  /// Check if location features should be available
  bool get canUseLocationFeatures =>
      _status == LocationStatus.granted && _currentLocation != null;

  /// Get human-readable status message
  String getStatusMessage() {
    switch (_status) {
      case LocationStatus.unknown:
        return 'Checking location permission...';
      case LocationStatus.disabled:
        return 'Location is disabled';
      case LocationStatus.denied:
        return 'Location permission denied';
      case LocationStatus.deniedForever:
        return 'Location permission permanently denied';
      case LocationStatus.granted:
        return _currentLocation != null ? 'Location active' : 'Getting location...';
      case LocationStatus.serviceDisabled:
        return 'GPS is turned off';
      case LocationStatus.timeout:
        return 'Location request timed out';
      case LocationStatus.error:
        return _lastErrorMessage ?? 'Location error occurred';
    }
  }

  @override
  void dispose() {
    stopLocationUpdates();
    _locationController.close();
    _statusController.close();
    super.dispose();
  }
}

import 'package:latlong2/latlong.dart';
import 'package:flutter/foundation.dart';
import 'api_service.dart';

/// Smart Location Update Manager
/// Implements conditional location updates to reduce server load
/// while maintaining accuracy based on user state
class LocationUpdateManager {
  final ApiService _apiService;
  
  LatLng? _lastUpdatedLocation;
  DateTime? _lastUpdateTime;
  String _userStatus = 'idle'; // idle, searching, driving
  
  // Update intervals in seconds based on user status
  static const int _driverUpdateInterval = 10;
  static const int _passengerUpdateInterval = 15;
  static const int _idleUpdateInterval = 30;
  
  // Minimum distance change to trigger update (in meters)
  static const double _minDistanceChange = 50.0;

  LocationUpdateManager(this._apiService);

  /// Set the current user status (idle, searching, driving)
  void setUserStatus(String status) {
    _userStatus = status;
  }

  /// Smart location update - only updates server when necessary
  Future<bool> updateLocation(
    LatLng newLocation, {
    double? heading,
    double? speed,
    double? accuracy,
    bool forceUpdate = false,
  }) async {
    // Force update if explicitly requested
    if (forceUpdate) {
      return await _performUpdate(newLocation, heading, speed, accuracy);
    }

    // Always update if this is the first location
    if (_lastUpdatedLocation == null || _lastUpdateTime == null) {
      return await _performUpdate(newLocation, heading, speed, accuracy);
    }

    final now = DateTime.now();
    final timeSinceUpdate = now.difference(_lastUpdateTime!).inSeconds;

    // Check time-based conditions
    bool shouldUpdateByTime = false;
    switch (_userStatus) {
      case 'driving':
        shouldUpdateByTime = timeSinceUpdate >= _driverUpdateInterval;
        break;
      case 'searching':
      case 'passenger':
        shouldUpdateByTime = timeSinceUpdate >= _passengerUpdateInterval;
        break;
      case 'idle':
      default:
        shouldUpdateByTime = timeSinceUpdate >= _idleUpdateInterval;
        break;
    }

    if (shouldUpdateByTime) {
      return await _performUpdate(newLocation, heading, speed, accuracy);
    }

    // Check distance-based conditions
    final distance = _calculateDistance(_lastUpdatedLocation!, newLocation);
    if (distance > _minDistanceChange) {
      debugPrint('Location update triggered by distance: ${distance.toStringAsFixed(1)}m');
      return await _performUpdate(newLocation, heading, speed, accuracy);
    }

    // Update not needed
    return false;
  }

  /// Perform the actual location update
  Future<bool> _performUpdate(
    LatLng location,
    double? heading,
    double? speed,
    double? accuracy,
  ) async {
    try {
      await _apiService.updateUserLocation(
        location,
        heading: heading,
        speed: speed,
        accuracy: accuracy,
      );
      
      _lastUpdatedLocation = location;
      _lastUpdateTime = DateTime.now();
      
      return true;
    } catch (e) {
      debugPrint('Failed to update location: $e');
      return false;
    }
  }

  /// Calculate distance between two points in meters
  double _calculateDistance(LatLng point1, LatLng point2) {
    const Distance distance = Distance();
    return distance.as(LengthUnit.Meter, point1, point2);
  }

  /// Reset update manager (useful when user logs out)
  void reset() {
    _lastUpdatedLocation = null;
    _lastUpdateTime = null;
    _userStatus = 'idle';
  }

  /// Get time since last update
  Duration? getTimeSinceLastUpdate() {
    if (_lastUpdateTime == null) return null;
    return DateTime.now().difference(_lastUpdateTime!);
  }

  /// Check if update is due based on current status
  bool isUpdateDue() {
    if (_lastUpdateTime == null) return true;
    
    final timeSinceUpdate = DateTime.now().difference(_lastUpdateTime!).inSeconds;
    
    switch (_userStatus) {
      case 'driving':
        return timeSinceUpdate >= _driverUpdateInterval;
      case 'searching':
      case 'passenger':
        return timeSinceUpdate >= _passengerUpdateInterval;
      case 'idle':
      default:
        return timeSinceUpdate >= _idleUpdateInterval;
    }
  }
}

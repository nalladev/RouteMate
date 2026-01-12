import 'dart:convert';
import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';

// Updated models for new structure
import '../models/place_suggestion.dart';
import '../models/driver.dart';
import '../models/ride_request.dart';
import '../models/reward.dart';
import '../models/user_model.dart';

import '../models/active_ride.dart';
import '../config/api_config.dart';

class ApiService {
  // Use the centralized API configuration
  String get _baseUrl => ApiConfig.baseUrl;
  String? _token;

  // Sets the authentication token for all subsequent requests.
  void setAuthToken(String? token) {
    _token = token;
  }

  // --- Core HTTP Methods ---

  Future<dynamic> _get(String endpoint) async {
    try {
      final response = await http.get(
        Uri.parse('$_baseUrl/$endpoint'),
        headers: _getHeaders(),
      );
      return _handleResponse(response);
    } catch (e, st) {
      _logError('GET $endpoint failed', e, st);
      throw ApiException('Failed to connect to the server. Please check your network connection.');
    }
  }

  Future<dynamic> _post(String endpoint, Map<String, dynamic> data) async {
    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/$endpoint'),
        headers: _getHeaders(),
        body: json.encode(data),
      );
      return _handleResponse(response);
    } catch (e, st) {
      _logError('POST $endpoint failed', e, st, payload: data);
      throw ApiException('Failed to connect to the server. Please check your network connection.');
    }
  }

  Future<dynamic> _put(String endpoint, [Map<String, dynamic>? data]) async {
    try {
      final response = await http.put(
        Uri.parse('$_baseUrl/$endpoint'),
        headers: _getHeaders(),
        body: data != null ? json.encode(data) : null,
      );
      return _handleResponse(response);
    } catch (e, st) {
      _logError('PUT $endpoint failed', e, st, payload: data);
      throw ApiException('Failed to connect to the server. Please check your network connection.');
    }
  }

  Future<dynamic> _delete(String endpoint) async {
    try {
      final response = await http.delete(
        Uri.parse('$_baseUrl/$endpoint'),
        headers: _getHeaders(),
      );
      return _handleResponse(response);
    } catch (e, st) {
      _logError('DELETE $endpoint failed', e, st);
      throw ApiException('Failed to connect to the server. Please check your network connection.');
    }
  }

  Map<String, String> _getHeaders() {
    return {
      'Content-Type': 'application/json; charset=UTF-8',
      if (_token != null) 'Authorization': 'Bearer $_token',
    };
  }

  dynamic _handleResponse(http.Response response) {
    final dynamic body;
    try {
      body = json.decode(response.body);
    } catch(e, st) {
      _logError('Response decode failed (${response.statusCode})', e, st, rawBody: response.body);
      throw ApiException('Invalid response from server.');
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return body;
    } else {
      _logError(
        'Request failed (${response.statusCode})',
        body,
        null,
        rawBody: response.body,
      );
      throw ApiException(body['message'] ?? 'An unknown server error occurred.');
    }
  }

  /// Logs detailed errors only in debug mode to avoid leaking in release builds.
  void _logError(String context, Object error, StackTrace? stackTrace, {Object? payload, String? rawBody}) {
    if (!kDebugMode) return;

    final buffer = StringBuffer('[$context] $error');
    if (payload != null) buffer.write(' | payload: $payload');
    if (rawBody != null) buffer.write(' | rawBody: $rawBody');

    // Use debugPrint to avoid truncated logs.
    debugPrint(buffer.toString());
    if (stackTrace != null) {
      debugPrint(stackTrace.toString());
    }
  }

  // --- Authentication API ---

  /// Logs in with phone number and returns both Firebase and backend tokens.
  /// Returns: {'firebaseToken': String, 'backendToken': String, 'uid': String}
  Future<Map<String, String>> login(String phone) async {
    final result = await _post('auth/login', {'phone': phone});
    if (result['firebaseToken'] is! String || result['backendToken'] is! String) {
      throw ApiException('Invalid tokens received from server.');
    }
    return {
      'firebaseToken': result['firebaseToken'] as String,
      'backendToken': result['backendToken'] as String,
      'uid': result['uid'] as String? ?? '',
    };
  }

  /// Authenticates with Firebase token and returns both the Firebase custom token and backend token.
  /// Returns: {'firebaseToken': String, 'backendToken': String, 'uid': String}
  Future<Map<String, String>?> authenticateWithFirebaseToken(String firebaseIdToken) async {
    try {
      final result = await _post('auth/firebase', {'firebaseToken': firebaseIdToken});
      if (result['firebaseToken'] is String && result['backendToken'] is String) {
        return {
          'firebaseToken': result['firebaseToken'] as String,
          'backendToken': result['backendToken'] as String,
          'uid': result['uid'] as String? ?? '',
        };
      }
      return null;
    } catch (e) {
      debugPrint('Firebase token authentication failed: $e');
      return null;
    }
  }

  /// Authenticates with phone.email JWT token and returns both tokens.
  /// Returns: {'firebaseToken': String, 'backendToken': String, 'uid': String}
  Future<Map<String, String>?> authenticateWithPhoneEmail(String jwtToken) async {
    try {
      final result = await _post('auth/phone-email', {'jwtToken': jwtToken});
      if (result['firebaseToken'] is String && result['backendToken'] is String) {
        return {
          'firebaseToken': result['firebaseToken'] as String,
          'backendToken': result['backendToken'] as String,
          'uid': result['uid'] as String? ?? '',
        };
      }
      return null;
    } catch (e) {
      debugPrint('Phone.email authentication failed: $e');
      return null;
    }
  }

  // --- User API ---

  Future<void> updateUserLocation(LatLng location, {double? heading, double? speed, double? accuracy}) async {
    await _put('user/location', {
      'location': {
        'latitude': location.latitude,
        'longitude': location.longitude
      },
      'heading': heading,
      'speed': speed,
      'accuracy': accuracy,
    });
  }

  Future<UserModel> getUserProfile() async {
    final result = await _get('user/profile');
    return UserModel.fromJson(result['profile'] as Map<String, dynamic>);
  }

  Future<int> getWalletPoints() async {
    final result = await _get('user/wallet');
    return result['walletPoints'];
  }

  Future<List<Reward>> getRewards() async {
    final result = await _get('user/rewards');
    return (result['rewards'] as List).map((r) => Reward.fromJson(r)).toList();
  }

  // --- Driver API ---

  Future<void> startDriving(PlaceSuggestion destination) async {
    // Use the /session endpoint which automatically gets current location from DB
    await _post('driver/session', {
      'destination': {
        'displayName': destination.displayName,
        'latitude': destination.latitude,
        'longitude': destination.longitude,
      }
    });
  }

  Future<void> stopDriving() async {
    await _delete('driver/session');
  }

  Future<String> startDrivingSession({
    required LatLng startLocation,
    required PlaceSuggestion destination,
    int capacity = 4,
    Map<String, dynamic>? preferences,
  }) async {
    final result = await _post('driver/start-session', {
      'startLocation': {
        'latitude': startLocation.latitude,
        'longitude': startLocation.longitude,
      },
      'destination': {
        'name': destination.displayName,
        'latitude': destination.latitude,
        'longitude': destination.longitude,
        'placeId': destination.placeId,
      },
      'capacity': capacity,
      'preferences': preferences ?? {
        'allowDetours': true,
        'maxDetourDistance': 5.0,
        'passengerTypes': ['any']
      },
    });
    return result['sessionId'] as String;
  }

  Future<void> updateDriverLocation(LatLng location, {double? heading, double? speed}) async {
    await _put('driver/update-location', {
      'location': {
        'latitude': location.latitude,
        'longitude': location.longitude
      },
      'heading': heading,
      'speed': speed,
    });
  }

  Future<List<RideRequest>> getRelevantRideRequests({double? radius}) async {
    final queryParams = radius != null ? '?radius=$radius' : '';
    final result = await _get('driver/nearby-requests$queryParams');
    return (result['requests'] as List).map((r) => RideRequest.fromJson(r)).toList();
  }

  Future<List<RideRequest>> getNearbyRideRequests({double? radius}) async {
    final queryParams = radius != null ? '?radius=$radius' : '';
    final result = await _get('driver/nearby-requests$queryParams');
    return (result['requests'] as List).map((r) => RideRequest.fromJson(r)).toList();
  }

  Future<void> endDrivingSession() async {
    await _delete('driver/end-session');
  }

  // --- Passenger API ---

  Future<void> createRideRequest(PlaceSuggestion destination, LatLng pickup) async {
    await _post('passenger/request-ride', {
      'destination': {
        'name': destination.displayName,
        'latitude': destination.latitude,
        'longitude': destination.longitude,
        'placeId': destination.placeId,
      },
      'pickup': {
        'name': 'Current Location',
        'latitude': pickup.latitude,
        'longitude': pickup.longitude,
        'placeId': null,
      }
    });
  }

  Future<String> createRideRequestNew({
    required LatLng pickup,
    required PlaceSuggestion destination,
    String? pickupName,
    Map<String, dynamic>? preferences,
  }) async {
    final result = await _post('passenger/request-ride', {
      'pickup': {
        'name': pickupName ?? 'Pickup Location',
        'latitude': pickup.latitude,
        'longitude': pickup.longitude,
      },
      'destination': {
        'name': destination.displayName,
        'latitude': destination.latitude,
        'longitude': destination.longitude,
        'placeId': destination.placeId,
      },
      'preferences': preferences ?? {
        'maxWaitTime': 10,
        'maxWalkDistance': 500,
      },
    });
    return result['requestId'] as String;
  }

  // Note: This endpoint is not available in the backend
  // Use getNearbyDrivers() instead
  // Future<List<Driver>> getAvailableDrivers() async {
  //   final result = await _get('passenger/drivers');
  //   return (result['drivers'] as List).map((d) => Driver.fromJson(d)).toList();
  // }

  Future<List<Driver>> getNearbyDrivers({double? radius}) async {
    final queryParams = radius != null ? '?radius=$radius' : '';
    final result = await _get('passenger/nearby-drivers$queryParams');
    return (result['drivers'] as List).map((d) => Driver.fromJson(d)).toList();
  }

  Future<Map<String, dynamic>?> getRideRequestStatus() async {
    try {
      final result = await _get('passenger/request-status');
      return result['request'] as Map<String, dynamic>;
    } on ApiException catch (e) {
      // Return null if no active ride request found
      if (e.message.contains('No active ride request')) {
        return null;
      }
      rethrow;
    }
  }

  Future<void> cancelRideRequest() async {
    await _delete('passenger/cancel-request');
  }

  // --- Ride Management API ---
  // Note: acceptRide and completeRide endpoints are not available in the backend
  // The current backend doesn't implement driver ride acceptance/completion endpoints
  // 
  // Future<void> acceptRide(String rideRequestId) async {
  //   await _put('driver/ride-requests/$rideRequestId/accept');
  // }
  //
  // Future<Map<String, dynamic>> completeRide(String rideRequestId) async {
  //   final result = await _put('driver/ride-requests/$rideRequestId/complete');
  //   return result as Map<String, dynamic>;
  // }

  Future<String> matchRide({required String requestId, required String sessionId}) async {
    final result = await _post('rides/match', {
      'requestId': requestId,
      'sessionId': sessionId,
    });
    return result['rideId'] as String;
  }

  Future<void> updateRideStatus(String rideId, String status) async {
    await _put('rides/$rideId/status', {'status': status});
  }

  Future<ActiveRide> getRideDetails(String rideId) async {
    final result = await _get('rides/$rideId');
    return ActiveRide.fromJson(result['ride'] as Map<String, dynamic>);
  }

  // --- Proxy Services ---

  Future<List<PlaceSuggestion>> searchPlaces(String query) async {
    final results = await _get('proxy/search-places?q=${Uri.encodeQueryComponent(query)}');
    return (results['places'] as List)
        .map((p) => PlaceSuggestion.fromNominatimJson(p))
        .toList();
  }

  Future<List<LatLng>> getRoute(LatLng start, LatLng end) async {
    final result = await _get('proxy/route?start=${start.longitude},${start.latitude}&end=${end.longitude},${end.latitude}');
    final points = (result['points'] as List)
        .map<LatLng>((coord) => LatLng(coord[1].toDouble(), coord[0].toDouble()))
        .toList();
    return points;
  }

  // --- Helper Methods ---


  /// Stream for real-time location updates (would use WebSocket in production)
  Stream<UserLocation> startLocationTracking() async* {
    // This would typically use WebSocket or Server-Sent Events
    // For now, we'll simulate with periodic API calls
    yield* Stream.periodic(const Duration(seconds: 5), (_) async {
      try {
        final profile = await getUserProfile();
        return profile.location;
      } catch (e) {
        return null;
      }
    }).asyncMap((future) => future).where((location) => location != null).cast<UserLocation>();
  }

  /// Stop location tracking
  void stopLocationTracking() {
    // Implementation would close WebSocket connection
  }

  /// Health check endpoint
  Future<bool> checkHealth() async {
    try {
      await _get('health');
      return true;
    } catch (e) {
      return false;
    }
  }
}

/// Custom exception for API-related errors.
class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final String? errorCode;

  ApiException(this.message, [this.statusCode, this.errorCode]);

  @override
  String toString() => message;

  bool get isNetworkError => message.contains('network') || message.contains('connection');
  bool get isServerError => statusCode != null && statusCode! >= 500;
  bool get isClientError => statusCode != null && statusCode! >= 400 && statusCode! < 500;
  bool get isUnauthorized => statusCode == 401;
  bool get isForbidden => statusCode == 403;
  bool get isNotFound => statusCode == 404;
}

/// Response wrapper for paginated results
class PaginatedResponse<T> {
  final List<T> data;
  final int totalCount;
  final int page;
  final int pageSize;
  final bool hasMore;

  PaginatedResponse({
    required this.data,
    required this.totalCount,
    required this.page,
    required this.pageSize,
    required this.hasMore,
  });

  factory PaginatedResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Map<String, dynamic>) fromJson,
  ) {
    final data = (json['data'] as List)
        .map((item) => fromJson(item as Map<String, dynamic>))
        .toList();

    return PaginatedResponse(
      data: data,
      totalCount: json['totalCount'] ?? data.length,
      page: json['page'] ?? 1,
      pageSize: json['pageSize'] ?? data.length,
      hasMore: json['hasMore'] ?? false,
    );
  }
}

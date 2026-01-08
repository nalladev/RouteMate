import 'dart:convert';
import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';

// These models will be created in the next steps.
import '../models/place_suggestion.dart';
import '../models/driver.dart';
import '../models/ride_request.dart';
import '../models/reward.dart';
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

  // --- API Methods ---

  // Auth
  Future<String> login(String phone) async {
    final result = await _post('auth/login', {'phone': phone});
    if (result['token'] is! String) {
      throw ApiException('Invalid token received from server.');
    }
    return result['token'];
  }
  
  // User
  Future<String> setRole(String role) async {
    final result = await _post('user/set-role', {'role': role});
    if (result['token'] is! String) {
      throw ApiException('Invalid token received from server after setting role.');
    }
    return result['token'];
  }

  Future<void> updateUserLocation(LatLng location) async {
    await _put('user/location', {'location': {'latitude': location.latitude, 'longitude': location.longitude}});
  }

  Future<int> getWalletPoints() async {
    final result = await _get('user/wallet');
    return result['walletPoints'];
  }

  Future<List<Reward>> getRewards() async {
     final result = await _get('user/rewards');
     return (result['rewards'] as List).map((r) => Reward.fromJson(r)).toList();
  }

  Future<Map<String, dynamic>> getUserProfile() async {
    final result = await _get('user/profile');
    return result['profile'] as Map<String, dynamic>;
  }

  // Driving
  Future<void> startDriving(PlaceSuggestion destination) async {
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
  
  Future<List<RideRequest>> getRelevantRideRequests() async {
    final result = await _get('driver/ride-requests');
    return (result['rideRequests'] as List).map((r) => RideRequest.fromJson(r)).toList();
  }

  Future<void> acceptRide(String rideRequestId) async {
    await _put('driver/ride-requests/$rideRequestId/accept');
  }

  Future<Map<String, dynamic>> completeRide(String rideRequestId) async {
    final result = await _put('driver/ride-requests/$rideRequestId/complete');
    return result as Map<String, dynamic>;
  }

  // Passenger
  Future<void> createRideRequest(PlaceSuggestion destination, LatLng pickup) async {
    await _post('passenger/ride-request', {
      'destination': {
        'displayName': destination.displayName,
        'latitude': destination.latitude,
        'longitude': destination.longitude,
      },
      'pickup': {
         'latitude': pickup.latitude,
         'longitude': pickup.longitude,
      }
    });
  }

  Future<void> cancelRideRequest() async {
    await _delete('passenger/ride-request');
  }

  Future<Map<String, dynamic>?> getRideRequestStatus() async {
    try {
      final result = await _get('passenger/ride-request/status');
      return result['rideRequest'] as Map<String, dynamic>;
    } on ApiException catch (e) {
      // Return null if no active ride request found
      if (e.message.contains('No active ride request')) {
        return null;
      }
      rethrow;
    }
  }

  Future<List<Driver>> getAvailableDrivers() async {
    final result = await _get('passenger/drivers');
    return (result['drivers'] as List).map((d) => Driver.fromJson(d)).toList();
  }
  
  // Proxied Services
  Future<List<PlaceSuggestion>> searchPlaces(String query) async {
    final results = await _get('proxy/search-places?q=$query');
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
}

/// Custom exception for API-related errors.
class ApiException implements Exception {
  final String message;
  ApiException(this.message);

  @override
  String toString() => message;
}

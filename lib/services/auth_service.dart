import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:jwt_decoder/jwt_decoder.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_service.dart';
import '../models/user_model.dart';

class AuthService {
  final ApiService _apiService;

  AuthService(this._apiService); // Constructor no longer calls tryAutoLogin

  static Future<AuthService> create(ApiService apiService) async {
    final authService = AuthService(apiService);
    // Trigger initial authentication check but don't await it directly.
    // Instead, we await the first emission from the stream.
    // The _tryAutoLogin will eventually push a value into _userController.
    authService._tryAutoLogin(); 
    // Wait until the initial user state has been determined and emitted.
    await authService.authStateChanges.first;
    return authService;
  }

  static const _tokenKey = 'authToken';

  UserModel? _user;
  UserModel? get user => _user;

  final StreamController<UserModel?> _userController =
      StreamController<UserModel?>.broadcast();

  /// A stream that emits the user model when the authentication state changes.
  /// Emits a [UserModel] if the user is logged in, otherwise emits `null`.
  Stream<UserModel?> get authStateChanges => _userController.stream;

  String? get currentUserRole => _user?.activeRole;

  bool get isLoggedIn => _user != null;

  void dispose() {
    _userController.close();
  }

  Future<void> _saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);

    try {
      Map<String, dynamic> decodedToken = JwtDecoder.decode(token);
      final String uid = decodedToken['uid'];
      final String? role = decodedToken['role'];

      _user = UserModel(uid: uid, activeRole: role);
      _userController.add(_user);
      _apiService.setAuthToken(token);
    } catch (e) {
      debugPrint("Failed to decode token: $e");
      await _clearToken();
    }
  }
  
  Future<void> updateTokenAndRole(String newToken) async {
    await _saveToken(newToken);
  }

  Future<void> _clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    _user = null;
    _userController.add(null);
    _apiService.setAuthToken(null);
  }

  // Renamed to private as it's now called internally by AuthService.create
  Future<void> _tryAutoLogin() async { 
    final prefs = await SharedPreferences.getInstance();
    if (prefs.containsKey(_tokenKey)) {
      final token = prefs.getString(_tokenKey)!;

      if (JwtDecoder.isExpired(token)) {
        await _clearToken();
        return;
      }
      await _saveToken(token);
    } else {
      // Ensure that on startup, if there's no token, we explicitly signal a logged-out state.
      _userController.add(null);
    }
  }

  Future<void> login(String phone) async {
    try {
      final token = await _apiService.login(phone);
      await _saveToken(token);
    } catch (e) {
      rethrow;
    }
  }

  Future<void> logout() async {
    await _clearToken();
  }

  Future<void> setRole(String role) async {
    try {
      final newToken = await _apiService.setUserRole(role);
      await _saveToken(newToken);
    } catch (e) {
      debugPrint("Failed to set role: $e");
      rethrow;
    }
  }
}

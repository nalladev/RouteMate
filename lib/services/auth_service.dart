import 'package:flutter/foundation.dart';
import 'package:jwt_decoder/jwt_decoder.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_service.dart';
import '../models/user_model.dart';

class AuthService with ChangeNotifier {
  final ApiService _apiService;

  AuthService(this._apiService);

  static const _tokenKey = 'authToken';

  UserModel? _user;
  UserModel? get user => _user;
  
  // Getter to access the current user's role from the state.
  // Returns the role as a String, or null if the user is not logged in.
  String? get currentUserRole => _user?.activeRole;

  bool get isLoggedIn => _user != null;

  /// Decodes the JWT, saves it to persistent storage, and updates the app state.
  /// The role is extracted from the JWT payload and stored in the UserModel.
  Future<void> _saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);

    try {
      // Decode the JWT to access its payload.
      Map<String, dynamic> decodedToken = JwtDecoder.decode(token);
      final String uid = decodedToken['uid'];
      // Extract the 'role' from the payload.
      final String? role = decodedToken['role'];

      // Store the user's data, including the role, in the state.
      _user = UserModel(uid: uid, activeRole: role ?? 'passenger');

      _apiService.setAuthToken(token);
      notifyListeners();
    } catch (e) {
      debugPrint("Failed to decode token: $e");
      await _clearToken(); // Clear invalid token
    }
  }

  /// A public method to update the token and role after a role change.
  /// This is called after the backend provides a new JWT with the updated role.
  Future<void> updateTokenAndRole(String newToken) async {
    await _saveToken(newToken);
  }

  /// Clears the authentication token from persistent storage and updates the app state.
  Future<void> _clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    _user = null;
    _apiService.setAuthToken(null);
    notifyListeners();
  }

  /// Checks for a saved token and attempts to log the user in automatically.
  Future<void> tryAutoLogin() async {
    final prefs = await SharedPreferences.getInstance();
    if (prefs.containsKey(_tokenKey)) {
      final token = prefs.getString(_tokenKey)!;

      if (JwtDecoder.isExpired(token)) {
        await _clearToken();
        return;
      }
      
      // Use the same save token logic to decode and set user
      await _saveToken(token);
    }
  }

  /// Logs the user in with a phone number and saves the received token.
  Future<void> login(String phone) async {
    try {
      final token = await _apiService.login(phone);
      await _saveToken(token);
    } catch (e) {
      // Re-throw the exception to be handled by the UI layer.
      rethrow;
    }
  }

  /// Logs the user out.
  Future<void> logout() async {
    // In a real app, you might want to notify the backend to invalidate the token.
    await _clearToken();
  }
}


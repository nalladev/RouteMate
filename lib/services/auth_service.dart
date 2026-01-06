import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_service.dart';
import '../models/user_model.dart';

class AuthService with ChangeNotifier {
  final ApiService _apiService;
  
  AuthService(this._apiService);

  static const _tokenKey = 'authToken';
  
  UserModel? _user;
  UserModel? get user => _user;
  
  bool get isLoggedIn => _user != null;

  /// Saves the authentication token to persistent storage and updates the app state.
  Future<void> _saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
    
    // In a real app, you would decode the JWT to get the user ID and other claims.
    // For this example, we'll use a placeholder ID.
    _user = UserModel(
      uid: 'user_from_backend_token',
      phone: '',
      walletPoints: 0,
      createdAt: DateTime.now(),
      stats: UserStats.empty(),
    ); 
    
    _apiService.setAuthToken(token);
    notifyListeners();
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
      // In a real app, you should add token validation logic here to check for expiry.
      _user = UserModel(
        uid: 'user_from_backend_token',
        phone: '',
        walletPoints: 0,
        createdAt: DateTime.now(),
        stats: UserStats.empty(),
      );
      _apiService.setAuthToken(token);
      notifyListeners();
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

import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:phone_email_auth/phone_email_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_service.dart';
import '../models/user_model.dart';

enum AuthMethod {
  phone,
  email,
  google,
}

class AuthResult {
  final bool success;
  final String? message;
  final User? firebaseUser;
  final AuthMethod method;

  AuthResult.success(this.firebaseUser, this.method)
      : success = true,
        message = null;

  AuthResult.failure(this.message, this.method)
      : success = false,
        firebaseUser = null;
}

class ComprehensiveAuthService with ChangeNotifier {
  static const String _phoneEmailClientId = '11787517661743701617';
  static const String _backendTokenKey = 'backend_auth_token';

  final FirebaseAuth _firebaseAuth = FirebaseAuth.instance;
  final GoogleSignIn _googleSignIn;
  final ApiService _apiService;

  // Current user state
  User? _firebaseUser;
  UserModel? _backendUser;
  bool _isInitialized = false;

  ComprehensiveAuthService(this._apiService) : _googleSignIn = GoogleSignIn() {
    _initializePhoneEmail();
    _setupAuthListener();
  }

  // Getters
  User? get firebaseUser => _firebaseUser;
  UserModel? get backendUser => _backendUser;
  bool get isLoggedIn => _firebaseUser != null && _backendUser != null;
  bool get isInitialized => _isInitialized;

  void _initializePhoneEmail() {
    try {
      PhoneEmail.initializeApp(clientId: _phoneEmailClientId);
    } catch (e) {
      debugPrint('Failed to initialize phone.email: $e');
    }
  }

  void _setupAuthListener() {
    _firebaseAuth.authStateChanges().listen((User? user) async {
      _firebaseUser = user;

      if (user != null) {
        // User signed in to Firebase, now authenticate with backend
        await _authenticateWithBackend();
      } else {
        // User signed out
        _backendUser = null;
        await _clearBackendToken();
      }

      _isInitialized = true;
      notifyListeners();
    });
  }

  Future<void> _authenticateWithBackend() async {
    try {
      if (_firebaseUser == null) return;

      // Get Firebase ID token
      final idToken = await _firebaseUser!.getIdToken();

      if (idToken == null) {
        debugPrint('Failed to get Firebase ID token');
        return;
      }

      // Authenticate with backend using Firebase token
      final backendToken = await _apiService.authenticateWithFirebaseToken(idToken);

      if (backendToken != null && backendToken.isNotEmpty) {
        await _saveBackendToken(backendToken);
        _apiService.setAuthToken(backendToken);

        // Get user profile from backend
        try {
          _backendUser = await _apiService.getUserProfile();
        } catch (e) {
          debugPrint('Failed to get user profile: $e');
          // Clear invalid token
          await _clearBackendToken();
        }
      }
    } catch (e) {
      debugPrint('Backend authentication failed: $e');
    }
  }

  Future<void> _saveBackendToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_backendTokenKey, token);
  }

  Future<void> _clearBackendToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_backendTokenKey);
    _apiService.setAuthToken(null);
  }

  // Phone.email authentication
  Future<AuthResult> signInWithPhone() async {
    try {
      // Use phone.email service for phone authentication
      // This will handle OTP flow internally
      // Note: In a real implementation, you'd integrate with phone.email's callback
      // For now, we'll assume the phone login is handled by PhoneLoginButton widget

      return AuthResult.success(_firebaseUser, AuthMethod.phone);
    } catch (e) {
      return AuthResult.failure('Phone authentication failed: $e', AuthMethod.phone);
    }
  }

  Future<AuthResult> signInWithEmail() async {
    try {
      // Use phone.email service for email authentication
      // This will handle OTP flow internally
      // Note: In a real implementation, you'd integrate with phone.email's callback
      // For now, we'll assume the email login is handled by EmailLoginButton widget

      return AuthResult.success(_firebaseUser, AuthMethod.email);
    } catch (e) {
      return AuthResult.failure('Email authentication failed: $e', AuthMethod.email);
    }
  }

  // Google Sign-In
  Future<AuthResult> signInWithGoogle() async {
    try {
      // Trigger the authentication flow
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();

      if (googleUser == null) {
        return AuthResult.failure('Google Sign-In was cancelled', AuthMethod.google);
      }

      // Obtain the auth details from the request
      final GoogleSignInAuthentication googleAuth = googleUser.authentication;

      // Create a new credential
      final credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );

      // Sign in to Firebase with the credential
      final userCredential = await _firebaseAuth.signInWithCredential(credential);

      return AuthResult.success(userCredential.user, AuthMethod.google);
    } catch (e) {
      return AuthResult.failure('Google Sign-In failed: $e', AuthMethod.google);
    }
  }

  // Handle phone.email authentication success
  Future<void> handlePhoneEmailSuccess(String accessToken, String jwtToken) async {
    try {
      // Get user info from phone.email
      PhoneEmailUserModel? userInfo;

      PhoneEmail.getUserInfo(
        accessToken: accessToken,
        clientId: _phoneEmailClientId,
        onSuccess: (info) async {
          userInfo = info;

          // Create or sign in to Firebase using phone number or email
          if (userInfo?.phoneNumber != null) {
            await _createFirebaseUserFromPhoneEmail(userInfo!);
          }
        },
      );
    } catch (e) {
      debugPrint('Failed to handle phone.email success: $e');
    }
  }

  Future<void> _createFirebaseUserFromPhoneEmail(PhoneEmailUserModel userInfo) async {
    try {
      // For phone.email integration, we'll create a custom Firebase user
      // In a production app, you'd typically use Firebase's phone auth or custom tokens

      // Create a custom token using your backend if needed
      // For now, we'll use email/password as a fallback

      final email = '${userInfo.phoneNumber}@phoneemail.app';
      final password = 'phoneEmailAuth123!'; // In production, use secure token-based auth

      try {
        // Try to sign in first
        await _firebaseAuth.signInWithEmailAndPassword(
          email: email,
          password: password,
        );
      } catch (e) {
        // If sign in fails, create new account
        await _firebaseAuth.createUserWithEmailAndPassword(
          email: email,
          password: password,
        );

        // Update user profile
        await _firebaseAuth.currentUser?.updateDisplayName(
          '${userInfo.firstName ?? ''} ${userInfo.lastName ?? ''}'.trim(),
        );
      }
    } catch (e) {
      debugPrint('Failed to create Firebase user from phone.email: $e');
    }
  }

  // Sign out
  Future<void> signOut() async {
    try {
      // Sign out from all services
      await Future.wait([
        _firebaseAuth.signOut(),
        _googleSignIn.signOut(),
      ]);

      // Clear backend token
      await _clearBackendToken();

      _firebaseUser = null;
      _backendUser = null;
      notifyListeners();
    } catch (e) {
      debugPrint('Sign out failed: $e');
    }
  }

  // Auto login on app start
  Future<void> tryAutoLogin() async {
    try {
      // Firebase auth state will be handled by the listener
      // Check if we have a valid backend token
      final prefs = await SharedPreferences.getInstance();
      final backendToken = prefs.getString(_backendTokenKey);

      if (backendToken != null && _firebaseUser != null) {
        _apiService.setAuthToken(backendToken);
        try {
          _backendUser = await _apiService.getUserProfile();
        } catch (e) {
          // Token might be expired, clear it
          await _clearBackendToken();
        }
      }
    } catch (e) {
      debugPrint('Auto login failed: $e');
    } finally {
      _isInitialized = true;
      notifyListeners();
    }
  }

}

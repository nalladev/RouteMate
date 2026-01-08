import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';
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
  static const String _backendTokenKey = 'backend_auth_token';

  final FirebaseAuth _firebaseAuth = FirebaseAuth.instance;
  late final GoogleSignIn _googleSignIn;
  final ApiService _apiService;

  // Current user state
  User? _firebaseUser;
  UserModel? _backendUser;
  bool _isInitialized = false;

  ComprehensiveAuthService(this._apiService) {
    _initializeGoogleSignIn();
    _setupAuthListener();
  }

  void _initializeGoogleSignIn() {
    _googleSignIn = GoogleSignIn(
      scopes: [
        'email',
        'profile',
      ],
    );
  }

  // Getters
  User? get firebaseUser => _firebaseUser;
  UserModel? get backendUser => _backendUser;
  bool get isLoggedIn => _firebaseUser != null && _backendUser != null;
  bool get isInitialized => _isInitialized;

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

  // Phone authentication using Firebase Auth
  Future<AuthResult> signInWithPhone(String phoneNumber) async {
    try {
      final completer = Completer<AuthResult>();

      await _firebaseAuth.verifyPhoneNumber(
        phoneNumber: phoneNumber,
        verificationCompleted: (PhoneAuthCredential credential) async {
          try {
            final userCredential = await _firebaseAuth.signInWithCredential(credential);
            completer.complete(AuthResult.success(userCredential.user, AuthMethod.phone));
          } catch (e) {
            completer.complete(AuthResult.failure('Auto-verification failed: $e', AuthMethod.phone));
          }
        },
        verificationFailed: (FirebaseAuthException e) {
          completer.complete(AuthResult.failure('Verification failed: ${e.message}', AuthMethod.phone));
        },
        codeSent: (String verificationId, int? resendToken) {
          // Store verification ID for later use in verifyOTP
          _storeVerificationId(verificationId);
          completer.complete(AuthResult.success(null, AuthMethod.phone));
        },
        codeAutoRetrievalTimeout: (String verificationId) {
          // Auto-retrieval timed out
          debugPrint('Code auto-retrieval timeout');
        },
      );

      return completer.future;
    } catch (e) {
      return AuthResult.failure('Phone authentication failed: $e', AuthMethod.phone);
    }
  }

  Future<void> _storeVerificationId(String verificationId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('verification_id', verificationId);
  }

  Future<AuthResult> verifyOTP(String otp) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final verificationId = prefs.getString('verification_id');

      if (verificationId == null) {
        return AuthResult.failure('No verification ID found', AuthMethod.phone);
      }

      final credential = PhoneAuthProvider.credential(
        verificationId: verificationId,
        smsCode: otp,
      );

      final userCredential = await _firebaseAuth.signInWithCredential(credential);
      return AuthResult.success(userCredential.user, AuthMethod.phone);
    } catch (e) {
      return AuthResult.failure('OTP verification failed: $e', AuthMethod.phone);
    }
  }

  // Email authentication (using Firebase Auth email/password)
  Future<AuthResult> signInWithEmail(String email, String password) async {
    try {
      final userCredential = await _firebaseAuth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
      return AuthResult.success(userCredential.user, AuthMethod.email);
    } catch (e) {
      return AuthResult.failure('Email authentication failed: $e', AuthMethod.email);
    }
  }

  Future<AuthResult> createAccountWithEmail(String email, String password) async {
    try {
      final userCredential = await _firebaseAuth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );
      return AuthResult.success(userCredential.user, AuthMethod.email);
    } catch (e) {
      return AuthResult.failure('Account creation failed: $e', AuthMethod.email);
    }
  }

  // Google Sign-In - Simplified implementation
  Future<AuthResult> signInWithGoogle() async {
    try {
      // Check if Google Sign-In is available
      if (!await _googleSignIn.isSignedIn()) {
        // Sign out any existing user first
        await _googleSignIn.signOut();
      }

      // Attempt to sign in
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();

      if (googleUser == null) {
        return AuthResult.failure('Google Sign-In was cancelled', AuthMethod.google);
      }

      // Get authentication details
      final GoogleSignInAuthentication googleAuth = googleUser.authentication;

      // Check if we have valid tokens
      if (googleAuth.accessToken == null || googleAuth.idToken == null) {
        return AuthResult.failure('Failed to get Google authentication tokens', AuthMethod.google);
      }

      // Create Firebase credential
      final credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );

      // Sign in to Firebase with the credential
      final userCredential = await _firebaseAuth.signInWithCredential(credential);

      return AuthResult.success(userCredential.user, AuthMethod.google);
    } catch (e) {
      debugPrint('Google Sign-In error: $e');
      return AuthResult.failure('Google Sign-In failed: $e', AuthMethod.google);
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

      // Clear backend token and verification ID
      await _clearBackendToken();
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('verification_id');

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

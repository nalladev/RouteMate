import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart';
import 'package:routemate/config/api_config.dart';

class PhoneEmailOTPService {
  // Use the configured backend as proxy instead of calling phone.email directly
  static String get _apiBaseUrl => ApiConfig.baseUrl; // Points to production/base API
  
  final String phoneNumber;
  String? _requestId;
  Timer? _resendTimer;
  int _resendCount = 0;
  static const int _maxResends = 3;
  
  PhoneEmailOTPService({required this.phoneNumber});
  
  /// Send OTP to the phone number via backend proxy
  Future<bool> sendOTP() async {
    try {
      debugPrint('Sending OTP to $phoneNumber via backend');
      
      final response = await http.post(
        Uri.parse('$_apiBaseUrl/auth/send-otp'),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: jsonEncode({
          'phone_number': phoneNumber,
        }),
      ).timeout(const Duration(seconds: 30));
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _requestId = data['request_id'];
        _resendCount = 0;
        debugPrint('OTP sent successfully. Request ID: $_requestId');
        return true;
      } else {
        debugPrint('Failed to send OTP: ${response.statusCode} ${response.body}');
        return false;
      }
    } catch (e) {
      debugPrint('Error sending OTP: $e');
      return false;
    }
  }
  
  /// Verify the OTP entered by user via backend proxy
  Future<OTPVerificationResult> verifyOTP(String otp) async {
    if (_requestId == null) {
      return OTPVerificationResult(
        success: false,
        message: 'No OTP request found. Please request OTP again.',
      );
    }
    
    try {
      debugPrint('Verifying OTP for request ID: $_requestId');
      
      final response = await http.post(
        Uri.parse('$_apiBaseUrl/auth/verify-otp'),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: jsonEncode({
          'request_id': _requestId,
          'otp': otp,
        }),
      ).timeout(const Duration(seconds: 30));
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        debugPrint('OTP verified successfully');
        return OTPVerificationResult(
          success: true,
          message: 'OTP verified successfully',
          accessToken: data['access_token'],
          jwtToken: data['jwt_token'],
          userInfo: data['user'] != null ? PhoneEmailUserInfo.fromJson(data['user']) : null,
        );
      } else {
        final data = jsonDecode(response.body);
        final message = data['message'] ?? 'Invalid OTP. Please try again.';
        debugPrint('OTP verification failed: $message');
        return OTPVerificationResult(
          success: false,
          message: message,
        );
      }
    } catch (e) {
      debugPrint('Error verifying OTP: $e');
      return OTPVerificationResult(
        success: false,
        message: 'Error verifying OTP: $e',
      );
    }
  }
  
  /// Resend OTP
  Future<bool> resendOTP() async {
    if (_resendCount >= _maxResends) {
      debugPrint('Maximum resend attempts reached');
      return false;
    }
    
    _resendCount++;
    return sendOTP();
  }
  
  /// Get remaining resend attempts
  int getRemainingResends() => _maxResends - _resendCount;
  
  /// Clear the service
  void dispose() {
    _resendTimer?.cancel();
    _requestId = null;
    _resendCount = 0;
  }
}

class OTPVerificationResult {
  final bool success;
  final String message;
  final String? accessToken;
  final String? jwtToken;
  final PhoneEmailUserInfo? userInfo;

  OTPVerificationResult({
    required this.success,
    required this.message,
    this.accessToken,
    this.jwtToken,
    this.userInfo,
  });
}

class PhoneEmailUserInfo {
  final String phoneNumber;
  final String? email;

  PhoneEmailUserInfo({
    required this.phoneNumber,
    this.email,
  });

  factory PhoneEmailUserInfo.fromJson(Map<String, dynamic> json) {
    return PhoneEmailUserInfo(
      phoneNumber: json['phone_number'] ?? '',
      email: json['email'],
    );
  }
}

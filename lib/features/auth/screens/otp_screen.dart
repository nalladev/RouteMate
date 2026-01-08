import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:routemate/services/phone_email_otp_service.dart';
import 'package:routemate/services/comprehensive_auth_service.dart';

class OTPScreen extends StatefulWidget {
  final String phoneNumber;
  const OTPScreen({super.key, required this.phoneNumber});

  @override
  State<OTPScreen> createState() => _OTPScreenState();
}

class _OTPScreenState extends State<OTPScreen> {
  final _otpController = TextEditingController();
  late PhoneEmailOTPService _otpService;
  bool _isLoading = false;
  bool _codeSent = false;
  String? _errorMessage;
  int _resendTimer = 30;
  bool _canResend = false;

  @override
  void initState() {
    super.initState();
    _otpService = PhoneEmailOTPService(phoneNumber: widget.phoneNumber);
    _sendOTP();
  }

  Future<void> _sendOTP() async {
    if (!mounted) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final success = await _otpService.sendOTP();

    if (!mounted) return;

    if (success) {
      setState(() {
        _codeSent = true;
        _isLoading = false;
        _resendTimer = 30;
        _canResend = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('OTP sent successfully!'),
          backgroundColor: Colors.green,
        ),
      );

      // Start resend timer
      Future.delayed(const Duration(seconds: 1), _updateResendTimer);
    } else {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Failed to send OTP. Please try again.';
      });
    }
  }

  void _updateResendTimer() {
    if (!mounted || _resendTimer <= 0) {
      setState(() {
        _canResend = true;
      });
      return;
    }

    setState(() {
      _resendTimer--;
    });

    Future.delayed(const Duration(seconds: 1), _updateResendTimer);
  }

  Future<void> _verifyOTP() async {
    if (_otpController.text.trim().isEmpty) {
      setState(() {
        _errorMessage = 'Please enter the OTP';
      });
      return;
    }

    if (_otpController.text.trim().length != 6) {
      setState(() {
        _errorMessage = 'OTP must be 6 digits';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final result = await _otpService.verifyOTP(_otpController.text.trim());

    if (!mounted) return;

    if (result.success) {
      // Create Firebase session using phone.email OTP verification
      final authService = Provider.of<ComprehensiveAuthService>(context, listen: false);
      final authResult = await authService.handlePhoneEmailOTPSuccess(
        widget.phoneNumber,
        result.accessToken,
        result.jwtToken,
      );

      if (!mounted) return;

      if (authResult.success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Phone number verified successfully!'),
            backgroundColor: Colors.green,
          ),
        );

        setState(() {
          _isLoading = false;
        });

        // Pass success back to login screen
        Navigator.of(context).pop({
          'success': true,
          'phoneNumber': widget.phoneNumber,
          'accessToken': result.accessToken,
          'jwtToken': result.jwtToken,
          'userInfo': result.userInfo,
        });
      } else {
        setState(() {
          _isLoading = false;
          _errorMessage = authResult.message ?? 'Failed to create session. Please try again.';
        });
      }
    } else {
      setState(() {
        _isLoading = false;
        _errorMessage = result.message;
      });
    }
  }

  Future<void> _resendOTP() async {
    if (!_canResend) return;

    final remaining = _otpService.getRemainingResends();
    if (remaining <= 0) {
      setState(() {
        _errorMessage = 'Maximum resend attempts reached. Please try again later.';
      });
      return;
    }

    await _sendOTP();
  }

  @override
  void dispose() {
    _otpController.dispose();
    _otpService.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black87),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'Verify OTP',
          style: TextStyle(color: Colors.black87, fontWeight: FontWeight.bold),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Title
              Text(
                'Enter OTP',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).primaryColor,
                ),
              ),
              const SizedBox(height: 16),

              // Subtitle
              Text(
                'We sent a 6-digit code to ${widget.phoneNumber}',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: Colors.grey[600],
                ),
              ),
              const SizedBox(height: 48),

              // Error Message
              if (_errorMessage != null)
                Container(
                  width: double.infinity,
                  margin: const EdgeInsets.only(bottom: 24),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    border: Border.all(color: Colors.red.shade200),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.error_outline, color: Colors.red.shade700, size: 20),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          _errorMessage!,
                          style: TextStyle(
                            color: Colors.red.shade700,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

              // OTP Input
              TextField(
                controller: _otpController,
                keyboardType: TextInputType.number,
                textAlign: TextAlign.center,
                maxLength: 6,
                enabled: !_isLoading && _codeSent,
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 8,
                ),
                decoration: InputDecoration(
                  labelText: 'OTP Code',
                  hintText: '000000',
                  counterText: '',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: Colors.grey.shade300),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(
                      color: Theme.of(context).primaryColor,
                      width: 2,
                    ),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: Colors.grey.shade300),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 16,
                  ),
                ),
                onSubmitted: (_) => !_isLoading && _codeSent ? _verifyOTP() : null,
              ),
              const SizedBox(height: 32),

              // Verify Button
              ElevatedButton(
                onPressed: (!_isLoading && _codeSent) ? _verifyOTP : null,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  backgroundColor: Theme.of(context).primaryColor,
                  foregroundColor: Colors.white,
                  elevation: 2,
                ),
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text(
                        'Verify OTP',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
              ),
              const SizedBox(height: 24),

              // Resend OTP
              Center(
                child: Column(
                  children: [
                    Text(
                      'Didn\'t receive the code?',
                      style: TextStyle(color: Colors.grey[600]),
                    ),
                    const SizedBox(height: 8),
                    if (_canResend)
                      GestureDetector(
                        onTap: _resendOTP,
                        child: Text(
                          'Resend OTP (${_otpService.getRemainingResends()} attempts left)',
                          style: TextStyle(
                            color: Theme.of(context).primaryColor,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      )
                    else
                      Text(
                        'Resend in ${_resendTimer}s',
                        style: TextStyle(color: Colors.grey[500]),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _otpController = TextEditingController();
  final FirebaseAuth _auth = FirebaseAuth.instance;
  String? _verificationId;
  bool _otpSent = false;
  bool _loading = false;
  String? _error;

  bool _quotaExceeded = false;

  Future<void> _sendOTP() async {
    setState(() { _loading = true; _error = null; });
    // Add the '+' prefix to the phone number
    final String phoneNumber = '+${_phoneController.text.trim()}';
    
    await _auth.verifyPhoneNumber(
      phoneNumber: phoneNumber,
      verificationCompleted: (PhoneAuthCredential credential) async {
        // Auto-detect OTP and sign in
        await _auth.signInWithCredential(credential);
      },
      verificationFailed: (FirebaseAuthException e) {
        if (e.code == 'too-many-requests') {
          setState(() {
            _quotaExceeded = true;
            _otpSent = true;
            _loading = false;
            _error = 'SMS quota exceeded. Use 123456 as OTP.';
          });
        } else {
          setState(() { _error = e.message; _loading = false; });
        }
      },
      codeSent: (String verificationId, int? resendToken) {
        setState(() {
          _verificationId = verificationId;
          _otpSent = true;
          _loading = false;
        });
      },
      codeAutoRetrievalTimeout: (String verificationId) {
        setState(() { _verificationId = verificationId; });
      },
    );
  }

  Future<void> _verifyOTP() async {
    setState(() { _loading = true; _error = null; });
    if (_quotaExceeded && _otpController.text.trim() == '123456') {
      // Simulate successful login with fallback OTP
      await _auth.signInAnonymously();
      setState(() { _loading = false; });
      return;
    }
    try {
      final credential = PhoneAuthProvider.credential(
        verificationId: _verificationId!,
        smsCode: _otpController.text.trim(),
      );
      await _auth.signInWithCredential(credential);
    } catch (e) {
      setState(() { _error = 'Invalid OTP'; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('Login with Phone', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 24),
              TextField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Phone Number',
                  prefixText: '+',
                  border: OutlineInputBorder(),
                ),
              ),
              if (_otpSent) ...[
                const SizedBox(height: 16),
                TextField(
                  controller: _otpController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'OTP',
                    border: OutlineInputBorder(),
                  ),
                ),
              ],
              const SizedBox(height: 24),
              if (_error != null) ...[
                Text(_error!, style: const TextStyle(color: Colors.red)),
                const SizedBox(height: 8),
              ],
              _loading
                  ? const CircularProgressIndicator()
                  : ElevatedButton(
                      onPressed: _otpSent ? _verifyOTP : _sendOTP,
                      child: Text(_otpSent ? 'Verify OTP' : 'Send OTP'),
                    ),
            ],
          ),
        ),
      ),
    );
  }
}

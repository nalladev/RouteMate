import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:phone_email_auth/phone_email_auth.dart';
import 'package:routemate/features/auth/screens/otp_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _phoneController = TextEditingController();
  final _phoneFocusNode = FocusNode();

  final bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    // Initialize phone.email service
    PhoneEmail.initializeApp(clientId: '11787517661743701617');
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _phoneFocusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Welcome to RouteMate'),
        centerTitle: true,
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_errorMessage != null)
              Container(
                width: double.infinity,
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  border: Border.all(color: Colors.red.shade200),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(Icons.error_outline, color: Colors.red.shade700),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _errorMessage!,
                        style: TextStyle(
                          color: Colors.red.shade700,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                    IconButton(
                      icon: Icon(Icons.close, color: Colors.red.shade700),
                      onPressed: () {
                        setState(() {
                          _errorMessage = null;
                        });
                      },
                    ),
                  ],
                ),
              ),
            const Text(
              'Enter your phone number to continue',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 24),
            TextField(
              controller: _phoneController,
              focusNode: _phoneFocusNode,
              keyboardType: TextInputType.phone,
              textInputAction: TextInputAction.done,
              decoration: InputDecoration(
                labelText: 'Phone Number',
                hintText: '+1 (555) 123-4567',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
                prefixIcon: const Icon(Icons.phone),
                enabled: !_isLoading,
              ),
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp(r'[0-9+\-\(\)\s]')),
              ],
            ),
            const SizedBox(height: 24),
            _isLoading
                ? const Center(child: CircularProgressIndicator())
                : PhoneLoginButton(
                    borderRadius: 8,
                    buttonColor: Colors.blue.shade300,
                    label: 'Get OTP',
                    onSuccess: (String accessToken, String jwtToken) {
                      if (mounted) {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => OTPScreen(
                              phoneNumber: _phoneController.text,
                            ),
                          ),
                        );
                      }
                    },
                  ),
          ],
        ),
      ),
    );
  }
}
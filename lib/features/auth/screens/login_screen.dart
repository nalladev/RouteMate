import 'package:flutter/material.dart';
import 'package:phone_email_auth/phone_email_auth.dart';
import 'package:provider/provider.dart';
import 'package:routemate/services/comprehensive_auth_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _phoneController = TextEditingController();
  final _phoneFocusNode = FocusNode();
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    // Initialize phone.email with your client ID
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
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Logo or App Icon
              Icon(
                Icons.route,
                size: 120,
                color: Theme.of(context).primaryColor,
              ),
              const SizedBox(height: 32),

              // App Title
              Text(
                'Welcome to RouteMate',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).primaryColor,
                ),
              ),
              const SizedBox(height: 16),

              // Subtitle
              Text(
                'Sign in with your phone number',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: Colors.grey[600],
                ),
              ),
              const SizedBox(height: 48),

              // Phone Login Button (opens native phone.email UI)
              PhoneLoginButton(
                borderRadius: 12,
                buttonColor: Theme.of(context).primaryColor,
                label: 'Sign in with Phone',
                onSuccess: (String accessToken, String jwtToken) {
                  // Handle successful phone authentication
                  if (mounted) {
                    _handlePhoneAuthSuccess(accessToken, jwtToken);
                  }
                },
              ),
              const SizedBox(height: 32),

              // Divider
              Row(
                children: [
                  Expanded(child: Divider(color: Colors.grey[300])),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Text('OR', style: TextStyle(color: Colors.grey[600])),
                  ),
                  Expanded(child: Divider(color: Colors.grey[300])),
                ],
              ),
              const SizedBox(height: 32),

              // Error Message
              if (_errorMessage != null)
                Container(
                  width: double.infinity,
                  margin: const EdgeInsets.only(bottom: 16),
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
                      GestureDetector(
                        onTap: () {
                          setState(() {
                            _errorMessage = null;
                          });
                        },
                        child: Icon(
                          Icons.close,
                          color: Colors.red.shade700,
                          size: 20,
                        ),
                      ),
                    ],
                  ),
                ),

              // Terms and Privacy
              const Spacer(),
              Text(
                'By continuing, you agree to our Terms of Service and Privacy Policy',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Colors.grey[600],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _handlePhoneAuthSuccess(String accessToken, String jwtToken) async {
    // Create Firebase session from phone.email authentication
    final authService = Provider.of<ComprehensiveAuthService>(context, listen: false);
    
    setState(() {
      _errorMessage = null;
    });

    try {
      // Use the phone.email tokens to create a Firebase session
      final result = await authService.handlePhoneEmailOTPSuccess(
        _phoneController.text,
        accessToken,
        jwtToken,
      );

      if (!mounted) return;

      if (result.success) {
        // Navigate to home page
        Navigator.of(context).pushReplacementNamed('/home');
      } else {
        setState(() {
          _errorMessage = result.message;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Authentication failed: $e';
        });
      }
    }
  }
}


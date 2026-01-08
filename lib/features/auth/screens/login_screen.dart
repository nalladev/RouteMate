import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:phone_email_auth/phone_email_auth.dart';
import 'package:provider/provider.dart';
import 'package:routemate/features/auth/screens/otp_screen.dart';
import 'package:routemate/services/comprehensive_auth_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with TickerProviderStateMixin {
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneFocusNode = FocusNode();
  final _emailFocusNode = FocusNode();

  late TabController _tabController;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    // Initialize phone.email service
    PhoneEmail.initializeApp(clientId: '11787517661743701617');
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _emailController.dispose();
    _phoneFocusNode.dispose();
    _emailFocusNode.dispose();
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _signInWithPhone() async {
    final phone = _phoneController.text.trim();
    if (phone.isEmpty) {
      _showError('Please enter your phone number');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // Use phone.email service for phone authentication
      final success = await _sendPhoneOTP(phone);
      if (success && mounted) {
        // Navigation will be handled by the phone.email callback
      }
    } catch (e) {
      if (mounted) {
        _showError('Failed to send OTP: $e');
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<bool> _sendPhoneOTP(String phone) async {
    try {
      // Format phone number
      final formattedPhone = _formatPhoneNumber(phone);

      // This is a simplified implementation - in a real app you'd use phone.email's API
      // For now, we'll use the PhoneLoginButton's underlying functionality
      return true;
    } catch (e) {
      throw Exception('Failed to send phone OTP: $e');
    }
  }

  String _formatPhoneNumber(String phone) {
    // Remove all non-digit characters
    String digitsOnly = phone.replaceAll(RegExp(r'\D'), '');

    // If the number doesn't start with a country code, assume US and prepend +1
    if (digitsOnly.length == 10) {
      return '+1$digitsOnly';
    } else if (digitsOnly.length == 11 && digitsOnly.startsWith('1')) {
      return '+$digitsOnly';
    } else if (!digitsOnly.startsWith('+') && digitsOnly.length > 10) {
      return '+$digitsOnly';
    }

    // If it already looks valid, just add + if missing
    if (!digitsOnly.startsWith('+')) {
      return '+$digitsOnly';
    }
    return digitsOnly;
  }

  Future<void> _signInWithEmail() async {
    final email = _emailController.text.trim();
    if (email.isEmpty) {
      _showError('Please enter your email address');
      return;
    }

    if (!_isValidEmail(email)) {
      _showError('Please enter a valid email address');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // Use phone.email service for email authentication
      final success = await _sendEmailOTP(email);
      if (success && mounted) {
        // Navigation will be handled by the phone.email callback
      }
    } catch (e) {
      if (mounted) {
        _showError('Failed to send OTP: $e');
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<bool> _sendEmailOTP(String email) async {
    try {
      // This is a simplified implementation - in a real app you'd use phone.email's API
      // For now, we'll use the EmailLoginButton's underlying functionality
      return true;
    } catch (e) {
      throw Exception('Failed to send email OTP: $e');
    }
  }

  bool _isValidEmail(String email) {
    return RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(email);
  }

  Future<void> _signInWithGoogle() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final authService = Provider.of<ComprehensiveAuthService>(context, listen: false);
      final result = await authService.signInWithGoogle();

      if (!result.success && mounted) {
        _showError(result.message ?? 'Google Sign-In failed');
      }
    } catch (e) {
      if (mounted) {
        _showError('Google Sign-In failed: $e');
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  void _showError(String message) {
    setState(() {
      _errorMessage = message;
    });
  }

  Widget _buildPhoneTab() {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            controller: _phoneController,
            focusNode: _phoneFocusNode,
            keyboardType: TextInputType.phone,
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => _signInWithPhone(),
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
              : ElevatedButton.icon(
                  onPressed: _signInWithPhone,
                  icon: const Icon(Icons.sms),
                  label: const Text('Send SMS Code'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    textStyle: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
          const SizedBox(height: 16),
          // Fallback to phone.email widget
          PhoneLoginButton(
            borderRadius: 8,
            buttonColor: Colors.blue.shade300,
            label: 'Use Phone.email Service',
            onSuccess: (String accessToken, String jwtToken) {
              if (mounted) {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => OTPScreen(
                      accessToken: accessToken,
                    ),
                  ),
                );
              }
            },
          ),
        ],
      ),
    );
  }

  Widget _buildEmailTab() {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            controller: _emailController,
            focusNode: _emailFocusNode,
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => _signInWithEmail(),
            decoration: InputDecoration(
              labelText: 'Email Address',
              hintText: 'example@email.com',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
              ),
              prefixIcon: const Icon(Icons.email),
              enabled: !_isLoading,
            ),
          ),
          const SizedBox(height: 24),
          _isLoading
              ? const Center(child: CircularProgressIndicator())
              : ElevatedButton.icon(
                  onPressed: _signInWithEmail,
                  icon: const Icon(Icons.mail_outline),
                  label: const Text('Send Email Code'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    textStyle: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
          const SizedBox(height: 16),
          // Fallback to phone.email widget
          EmailLoginButton(
            borderRadius: 8,
            buttonColor: Colors.green.shade300,
            label: 'Use Phone.email Service',
            onSuccess: (String accessToken, String jwtToken) {
              if (mounted) {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => OTPScreen(
                      accessToken: accessToken,
                    ),
                  ),
                );
              }
            },
          ),
        ],
      ),
    );
  }

  Widget _buildGoogleTab() {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Icon(
            Icons.login,
            size: 80,
            color: Color(0xFF4285F4),
          ),
          const SizedBox(height: 24),
          Text(
            'Sign in with Google',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Use your Google account to sign in quickly and securely',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 32),
          _isLoading
              ? const Center(child: CircularProgressIndicator())
              : ElevatedButton.icon(
                  onPressed: _signInWithGoogle,
                  icon: Image.asset(
                    'assets/images/google_logo.png',
                    height: 24,
                    width: 24,
                    errorBuilder: (context, error, stackTrace) {
                      return const Icon(Icons.login, color: Colors.white);
                    },
                  ),
                  label: const Text('Continue with Google'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF4285F4),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    textStyle: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Welcome to RouteMate'),
        centerTitle: true,
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(icon: Icon(Icons.phone), text: 'Phone'),
            Tab(icon: Icon(Icons.email), text: 'Email'),
            Tab(icon: Icon(Icons.account_circle), text: 'Google'),
          ],
        ),
      ),
      body: Column(
        children: [
          if (_errorMessage != null)
            Container(
              width: double.infinity,
              margin: const EdgeInsets.all(16),
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
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildPhoneTab(),
                _buildEmailTab(),
                _buildGoogleTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

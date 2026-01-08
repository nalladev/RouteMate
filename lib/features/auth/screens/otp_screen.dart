import 'package:flutter/material.dart';
import 'package:phone_email_auth/phone_email_auth.dart';
import 'package:provider/provider.dart';
import 'package:routemate/screens/home_page.dart';
import 'package:routemate/services/comprehensive_auth_service.dart';

class OTPScreen extends StatefulWidget {
  const OTPScreen({super.key, required this.accessToken});
  final String accessToken;

  @override
  State<OTPScreen> createState() => _OTPScreenState();
}

class _OTPScreenState extends State<OTPScreen> {
  PhoneEmailUserModel? _phoneEmailUserModel;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _getUserInfo();
  }

  void _getUserInfo() {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      PhoneEmail.getUserInfo(
        accessToken: widget.accessToken,
        clientId: '11787517661743701617',
        onSuccess: (userInfo) {
          if (mounted) {
            setState(() {
              _phoneEmailUserModel = userInfo;
              _isLoading = false;
            });
            // Handle authentication with comprehensive auth service
            _handleAuthenticationSuccess();
          }
        },
      );
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Failed to get user info: $e';
          _isLoading = false;
        });
      }
    }
  }

  void _handleAuthenticationSuccess() async {
    if (_phoneEmailUserModel != null) {
      final authService = Provider.of<ComprehensiveAuthService>(context, listen: false);
      await authService.handlePhoneEmailSuccess(widget.accessToken, '');

      // Navigate to home after successful authentication
      _navigateToHome();
    }
  }

  void _navigateToHome() {
    // Navigate to home and remove all previous routes
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(
        builder: (context) => const RouteMateHomePage(),
      ),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('User Profile'),
      ),
      body: Center(
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircularProgressIndicator(),
          SizedBox(height: 16),
          Text('Getting user information...'),
        ],
      );
    } else if (_error != null) {
      return Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: Colors.red,
            ),
            const SizedBox(height: 16),
            Text(
              _error!,
              style: const TextStyle(color: Colors.red, fontSize: 16),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _getUserInfo, // Retry fetching user info
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    } else if (_phoneEmailUserModel != null) {
      return Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Icon(
              Icons.check_circle,
              size: 64,
              color: Colors.green,
            ),
            const SizedBox(height: 16),
            const Text(
              'Authentication Successful!',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            _buildUserInfoTile('Country Code', _phoneEmailUserModel!.countryCode),
            _buildUserInfoTile('Phone Number', _phoneEmailUserModel!.phoneNumber),
            _buildUserInfoTile('First Name', _phoneEmailUserModel!.firstName),
            _buildUserInfoTile('Last Name', _phoneEmailUserModel!.lastName),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _navigateToHome,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                textStyle: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              child: const Text('Continue to App'),
            ),
          ],
        ),
      );
    } else {
      return const Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.info_outline,
            size: 64,
            color: Colors.grey,
          ),
          SizedBox(height: 16),
          Text(
            'No user information available.',
            style: TextStyle(fontSize: 16),
          ),
        ],
      );
    }
  }

  Widget _buildUserInfoTile(String title, String? value) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8.0),
      child: ListTile(
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(value ?? 'N/A', style: const TextStyle(fontSize: 16)),
        leading: Icon(
          title.toLowerCase().contains('phone') ? Icons.phone :
          title.toLowerCase().contains('name') ? Icons.person :
          title.toLowerCase().contains('country') ? Icons.flag :
          Icons.info,
          color: Theme.of(context).primaryColor,
        ),
      ),
    );
  }
}

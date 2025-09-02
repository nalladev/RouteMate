import 'package:flutter/material.dart';
import 'package:phone_email_auth/phone_email_auth.dart';

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
      return const CircularProgressIndicator();
    } else if (_error != null) {
      return Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
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
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildUserInfoTile('Country Code', _phoneEmailUserModel!.countryCode),
            _buildUserInfoTile('Phone Number', _phoneEmailUserModel!.phoneNumber),
            _buildUserInfoTile('First Name', _phoneEmailUserModel!.firstName),
            _buildUserInfoTile('Last Name', _phoneEmailUserModel!.lastName),
          ],
        ),
      );
    } else {
      return const Text('No user information available.');
    }
  }

  Widget _buildUserInfoTile(String title, String? value) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8.0),
      child: ListTile(
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(value ?? 'N/A', style: const TextStyle(fontSize: 16)),
      ),
    );
  }
}

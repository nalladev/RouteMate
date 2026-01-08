
import 'package:flutter/material.dart';
import 'package:phone_email_auth/phone_email_auth.dart';

class OTPScreen extends StatefulWidget {
  final String phoneNumber;
  const OTPScreen({super.key, required this.phoneNumber});

  @override
  State<OTPScreen> createState() => _OTPScreenState();
}

class _OTPScreenState extends State<OTPScreen> {
  final _otpController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _sendOtp();
  }

  void _sendOtp() async {
    // Corrected method name to camelCase
    PhoneEmail.sendOtp(
      phone: widget.phoneNumber,
    );
  }

  void _verifyOtp(String otp) async {
    // Corrected method name to camelCase
    final res = await PhoneEmail.verifyOtp(
      phone: widget.phoneNumber,
      otp: otp,
    );
    if (!mounted) return;

    if (res.success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('OTP Verified Successfully!')),
      );
      Navigator.of(context).pop();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('OTP Verification Failed: ${res.message}')),
      );
    }
  }

  @override
  void dispose() {
    _otpController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('OTP Verification'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Enter the OTP sent to ${widget.phoneNumber}.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 24),
            TextField(
              controller: _otpController,
              keyboardType: TextInputType.number,
              textAlign: TextAlign.center,
              decoration: InputDecoration(
                labelText: 'OTP',
                hintText: '123456',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () {
                if (_otpController.text.isNotEmpty) {
                  _verifyOtp(_otpController.text);
                }
              },
              child: const Text('Verify OTP'),
            ),
          ],
        ),
      ),
    );
  }
}

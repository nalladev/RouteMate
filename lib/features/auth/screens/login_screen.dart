import 'package:flutter/material.dart';
import 'package:phone_email_auth/phone_email_auth.dart';
import 'package:routemate/features/auth/screens/otp_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _phoneNumberController = TextEditingController();
  final PhoneEmailAuthController _auth = PhoneEmailAuthController();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Login'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            TextField(
              controller: _phoneNumberController,
              decoration: const InputDecoration(
                labelText: 'Phone Number',
              ),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () async {
                final scaffoldMessenger = ScaffoldMessenger.of(context);
                final navigator = Navigator.of(context);

                bool success = await _auth.sendOtp(
                  phone: _phoneNumberController.text,
                  userType: UserType.user,
                );

                if (success) {
                  navigator.push(
                    MaterialPageRoute(
                      builder: (context) => OtpScreen(
                        phone: _phoneNumberController.text,
                      ),
                    ),
                  );
                } else {
                  scaffoldMessenger.showSnackBar(
                    const SnackBar(
                      content: Text('Failed to send OTP. Please try again.'),
                    ),
                  );
                }
              },
              child: const Text('Send OTP'),
            ),
          ],
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:routemate/services/auth_service.dart';
import 'package:routemate/features/auth/screens/login_screen.dart';
import 'package:routemate/screens/home_page.dart';

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  late Future<void> _autoLoginFuture;

  @override
  void initState() {
    super.initState();
    // Attempt to log in automatically when the widget is first created.
    _autoLoginFuture = Provider.of<AuthService>(context, listen: false).tryAutoLogin();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: _autoLoginFuture,
      builder: (context, snapshot) {
        // While waiting for the auto-login attempt to complete, show a loading screen.
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            body: Center(
              child: CircularProgressIndicator(),
            ),
          );
        }

        // After the attempt, rely on the AuthService to determine the UI.
        return Consumer<AuthService>(
          builder: (context, authService, child) {
            if (authService.isLoggedIn) {
              return const RouteMateHomePage();
            } else {
              return const LoginScreen();
            }
          },
        );
      },
    );
  }
}

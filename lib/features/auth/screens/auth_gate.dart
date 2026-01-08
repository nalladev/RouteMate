import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:routemate/features/auth/screens/login_screen.dart';
import 'package:routemate/screens/home_page.dart';
import 'package:routemate/services/comprehensive_auth_service.dart';

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  @override
  void initState() {
    super.initState();
    // Try auto login when the widget is first created
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<ComprehensiveAuthService>(context, listen: false).tryAutoLogin();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<ComprehensiveAuthService>(
      builder: (context, authService, child) {
        // Show loading screen while initializing
        if (!authService.isInitialized) {
          return const Scaffold(
            body: Center(
              child: CircularProgressIndicator(),
            ),
          );
        }

        // Show appropriate screen based on auth state
        if (authService.isLoggedIn) {
          return const RouteMateHomePage();
        } else {
          return const LoginScreen();
        }
      },
    );
  }
}

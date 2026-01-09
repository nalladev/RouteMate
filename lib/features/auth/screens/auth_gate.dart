import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:routemate/services/auth_service.dart';
import 'package:routemate/features/auth/screens/login_screen.dart';
import 'package:routemate/screens/home_page.dart';
import 'package:routemate/features/auth/screens/role_selection_screen.dart';

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
              // If user is logged in, check if they have a role.
              final role = authService.currentUserRole;
              if (role == null || role.isEmpty) {
                // If no role is assigned, direct to RoleSelectionScreen.
                return const RoleSelectionScreen();
              } else {
                // If a role exists, proceed to the main app homepage.
                return const RouteMateHomePage();
              }
            } else {
              // If user is not logged in, show the LoginScreen.
              return const LoginScreen();
            }
          },
        );
      },
    );
  }
}

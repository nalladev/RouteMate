import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:routemate/features/auth/screens/login_screen.dart';
import 'package:routemate/features/auth/screens/role_selection_screen.dart';
import 'package:routemate/screens/home_page.dart';
import 'package:routemate/services/auth_service.dart';

/// AuthGate is the root widget that handles the initial navigation flow
/// based on the user's authentication state and role.
class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    final authService = Provider.of<AuthService>(context);

    return StreamBuilder(
      // Re-evaluates the UI whenever the authentication state changes.
      stream: authService.authStateChanges,
      builder: (context, snapshot) {
        // While waiting for the initial auth state, show a loading indicator.
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        // Decision Branch 1: Check if the user is logged in.
        if (authService.isLoggedIn) {
          final role = authService.currentUserRole;

          // Decision Branch 2: User is logged in, now check for a role.
          if (role != null && role.isNotEmpty) {
            // Outcome A: User is logged in and has a role. Navigate to the main application.
            return const RouteMateHomePage();
          } else {
            // Outcome B: User is logged in but has NOT selected a role.
            // Navigate to the RoleSelectionScreen to enforce a choice.
            return const RoleSelectionScreen();
          }
        } else {
          // Outcome C: User is not logged in. Navigate to the LoginScreen.
          return const LoginScreen();
        }
      },
    );
  }
}

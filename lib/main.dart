import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:routemate/features/auth/screens/auth_gate.dart';
import 'package:routemate/services/api_service.dart';
import 'package:routemate/services/auth_service.dart';

void main() {
  runApp(const AppProviders());
}

class AppProviders extends StatelessWidget {
  const AppProviders({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        // ApiService is provided as a singleton-like service.
        Provider<ApiService>(
          create: (_) => ApiService(),
        ),
        // AuthService is provided via a FutureProvider, ensuring it's fully initialized
        // (i.e., tryAutoLogin has completed) before any dependent widgets are built.
        FutureProvider<AuthService?>(
          create: (context) => AuthService.create(context.read<ApiService>()),
          initialData: null, // Indicate that AuthService is not yet ready
          lazy: false, // Ensure the FutureProvider starts immediately
          // The Provider package automatically calls the 'dispose' method on objects
          // returned by the 'create' function if they have one.
        ),
      ],
      child: const MyApp(),
    );
  }
}


class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Route Mate',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFFF97316)),
        useMaterial3: true,
        fontFamily: 'Inter',
      ),
      // Use a Consumer to wait for AuthService to be initialized
      home: Consumer<AuthService?>(
        builder: (context, authService, _) {
          if (authService == null) {
            // Show a loading indicator while AuthService is being initialized
            return const Scaffold(
              body: Center(
                child: CircularProgressIndicator(),
              ),
            );
          }
          // Once AuthService is ready, render the AuthGate
          return const AuthGate();
        },
      ),
      debugShowCheckedModeBanner: false,
    );
  }
}

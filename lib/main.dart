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
        // AuthService depends on ApiService and will notify listeners of auth changes.
        ChangeNotifierProvider<AuthService>(
          create: (context) => AuthService(context.read<ApiService>()),
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
      home: const AuthGate(),
      debugShowCheckedModeBanner: false,
    );
  }
}

import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:provider/provider.dart';
import 'package:routemate/features/auth/screens/auth_gate.dart';
import 'package:routemate/services/comprehensive_auth_service.dart';
import 'package:routemate/services/api_service.dart';
import 'firebase_options.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  runApp(const AppProviders());
}

class AppProviders extends StatelessWidget {
  const AppProviders({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        // ApiService is provided as a singleton-like service
        Provider<ApiService>(
          create: (_) => ApiService(),
        ),
        // ComprehensiveAuthService depends on ApiService
        ChangeNotifierProvider<ComprehensiveAuthService>(
          create: (context) => ComprehensiveAuthService(context.read<ApiService>()),
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

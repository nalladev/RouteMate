import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart' as latlng;
import 'package:location/location.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';

// It's highly recommended to use the flutterfire_cli and the generated firebase_options.dart file.
// If you have it, uncomment the following lines.
/*
import 'firebase_options.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  runApp(const MyApp());
}
*/

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  runApp(const MyApp());
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
      home: const RouteMateHomePage(),
      debugShowCheckedModeBanner: false,
    );
  }
}

enum AppState { initial, driving, searching }

class RouteMateHomePage extends StatefulWidget {
  const RouteMateHomePage({super.key});

  @override
  State<RouteMateHomePage> createState() => _RouteMateHomePageState();
}

class _RouteMateHomePageState extends State<RouteMateHomePage> {
  // App State & Controllers
  AppState _appState = AppState.initial;
  final TextEditingController _destinationController = TextEditingController();
  final MapController _mapController = MapController();
  bool _isMapReady = false;

  // Firebase & Location Services
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final Location _locationService = Location();
  StreamSubscription? _locationSubscription;
  User? _currentUser;

  // App Data
  int _walletPoints = 100;
  latlng.LatLng? _currentLocation;

  @override
  void initState() {
    super.initState();
    _initializeApp();
  }

  Future<void> _initializeApp() async {
    await _signInAnonymously();
    await _requestLocationPermission();
    _listenToLocationChanges();
    _fetchWalletPoints();
  }

  Future<void> _signInAnonymously() async {
    try {
      final userCredential = await _auth.signInAnonymously();
      setState(() {
        _currentUser = userCredential.user;
      });
    } catch (e) {
      _showMessage("Error signing in. Please restart the app.");
    }
  }

  Future<void> _requestLocationPermission() async {
    var serviceEnabled = await _locationService.serviceEnabled();
    if (!serviceEnabled) {
      serviceEnabled = await _locationService.requestService();
      if (!serviceEnabled) return;
    }

    var permissionGranted = await _locationService.hasPermission();
    if (permissionGranted == PermissionStatus.denied) {
      permissionGranted = await _locationService.requestPermission();
      if (permissionGranted != PermissionStatus.granted) return;
    }
  }

  void _listenToLocationChanges() {
    _locationSubscription = _locationService.onLocationChanged.listen((
      LocationData newLocation,
    ) {
      if (mounted &&
          newLocation.latitude != null &&
          newLocation.longitude != null) {
        final newPos = latlng.LatLng(
          newLocation.latitude!,
          newLocation.longitude!,
        );
        setState(() {
          _currentLocation = newPos;
        });

        // STRATEGIC FIX 1: Prevent crash by ensuring map is ready before moving it.
        if (_isMapReady) {
          _mapController.move(newPos, _mapController.camera.zoom);
        }

        _updateUserLocationInDb();
      }
    });
  }

  void _updateUserLocationInDb() {
    if (_currentUser != null && _currentLocation != null) {
      _firestore.collection('users').doc(_currentUser!.uid).set({
        'location': GeoPoint(
          _currentLocation!.latitude,
          _currentLocation!.longitude,
        ),
        'last_seen': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));
    }
  }

  void _fetchWalletPoints() {
    if (_currentUser == null) return;
    _firestore.collection('users').doc(_currentUser!.uid).snapshots().listen((
      doc,
    ) {
      if (doc.exists && doc.data()!.containsKey('wallet_points')) {
        if (mounted) {
          setState(() => _walletPoints = doc.data()!['wallet_points']);
        }
      } else {
        _firestore.collection('users').doc(_currentUser!.uid).set({
          'wallet_points': 100,
        }, SetOptions(merge: true));
      }
    });
  }

  void _startDriving() {
    final destinationName = _destinationController.text;
    if (destinationName.isEmpty) {
      _showMessage("Please enter a destination.");
      return;
    }
    setState(() => _appState = AppState.driving);
    _showMessage("You are now driving.");
  }

  void _findRide() {
    final destinationName = _destinationController.text;
    if (destinationName.isEmpty || _currentLocation == null) {
      _showMessage(
        "Please enter a destination and ensure location is enabled.",
      );
      return;
    }
    _firestore.collection('ride_requests').doc(_currentUser!.uid).set({
      'passenger_id': _currentUser!.uid,
      'location': GeoPoint(
        _currentLocation!.latitude,
        _currentLocation!.longitude,
      ),
      'destination': destinationName,
      'status': 'waiting',
      'timestamp': FieldValue.serverTimestamp(),
    });
    setState(() => _appState = AppState.searching);
    _showMessage("Requesting a ride...");
  }

  void _resetApp() {
    if (_appState == AppState.searching) {
      _firestore.collection('ride_requests').doc(_currentUser!.uid).delete();
    }
    setState(() {
      _appState = AppState.initial;
      _destinationController.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _currentLocation == null
          ? const Center(child: CircularProgressIndicator())
          : Stack(
              children: [
                _buildMapView(),
                _buildControlPanel(),
                _buildProfileButton(),
              ],
            ),
    );
  }

  Widget _buildMapView() {
    return StreamBuilder<QuerySnapshot>(
      stream: _firestore
          .collection('ride_requests')
          .where('status', isEqualTo: 'waiting')
          .snapshots(),
      builder: (context, snapshot) {
        List<Marker> markers = [];

        if (_currentLocation != null) {
          markers.add(
            Marker(
              width: 80.0,
              height: 80.0,
              point: _currentLocation!,
              child: Icon(
                _appState == AppState.driving
                    ? Icons.drive_eta
                    : Icons.person_pin_circle,
                color: _appState == AppState.driving
                    ? Colors.orange.shade800
                    : Colors.blue.shade800,
                size: 40,
              ),
            ),
          );
        }

        if (snapshot.hasData) {
          for (var doc in snapshot.data!.docs) {
            if (doc.id == _currentUser?.uid) {
              continue;
            }
            final data = doc.data() as Map<String, dynamic>;
            final geoPoint = data['location'] as GeoPoint;
            markers.add(
              Marker(
                width: 80.0,
                height: 80.0,
                point: latlng.LatLng(geoPoint.latitude, geoPoint.longitude),
                child: GestureDetector(
                  onTap: _appState == AppState.driving
                      ? () => _showPickupDialog(doc)
                      : null,
                  child: Tooltip(
                    message: "To: ${data['destination']}",
                    child: Icon(Icons.hail, color: Colors.green, size: 40),
                  ),
                ),
              ),
            );
          }
        }

        return FlutterMap(
          mapController: _mapController,
          options: MapOptions(
            initialCenter: _currentLocation!,
            initialZoom: 15.0,
            onMapReady: () {
              setState(() {
                _isMapReady = true;
              });
            },
          ),
          children: [
            TileLayer(
              // STRATEGIC FIX 2: Address OSM warnings.
              urlTemplate: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
              userAgentPackageName: 'com.example.myapp',
            ),
            MarkerLayer(markers: markers),
          ],
        );
      },
    );
  }

  void _showPickupDialog(DocumentSnapshot rideRequest) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Pick up passenger?"),
        content: Text(
          "This passenger wants to go to ${rideRequest['destination']}.",
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text("Ignore"),
          ),
          ElevatedButton(
            onPressed: () {
              rideRequest.reference.update({
                'status': 'picked_up',
                'driver_id': _currentUser!.uid,
              });
              _showMessage("Passenger picked up!");
              Navigator.pop(context);
            },
            child: const Text("Pick Up"),
          ),
        ],
      ),
    );
  }

  Widget _buildProfileButton() {
    return Positioned(
      top: 50,
      right: 16,
      child: FloatingActionButton(
        onPressed: _showWallet,
        mini: true,
        backgroundColor: Colors.white,
        child: const Icon(Icons.person),
      ),
    );
  }

  Widget _buildControlPanel() {
    return Positioned(
      top: 50,
      left: 16,
      right: 70,
      child: Material(
        elevation: 4,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.95),
            borderRadius: BorderRadius.circular(16),
          ),
          child: _appState == AppState.initial
              ? _buildInitialStateUI()
              : _buildActiveStateUI(),
        ),
      ),
    );
  }

  Widget _buildInitialStateUI() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        TextField(
          controller: _destinationController,
          decoration: InputDecoration(
            hintText: "Where are you going?",
            filled: true,
            fillColor: Colors.grey[100],
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16),
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: ElevatedButton(
                onPressed: _startDriving,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFEA580C),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text('Start Driving'),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: ElevatedButton(
                onPressed: _findRide,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.black87,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text('Find a Ride'),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildActiveStateUI() {
    String message = _appState == AppState.driving
        ? "You are driving"
        : "Waiting for a ride...";
    return Row(
      children: [
        Expanded(
          child: Text(
            message,
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
        ),
        TextButton(
          onPressed: _resetApp,
          child: const Text('Cancel', style: TextStyle(color: Colors.red)),
        ),
      ],
    );
  }

  void _showWallet() {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Profile & Wallet',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            if (_currentUser != null)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey[200],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'User ID',
                      style: TextStyle(color: Colors.black54),
                    ),
                    Text(
                      _currentUser!.uid,
                      style: const TextStyle(
                        fontFamily: 'monospace',
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 20),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF7ED),
                border: Border.all(color: const Color(0xFFFED7AA)),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  const Text(
                    'YOUR BALANCE',
                    style: TextStyle(
                      color: Color(0xFF9A3412),
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    '$_walletPoints pts',
                    style: const TextStyle(
                      fontSize: 36,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFFC2410C),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => Navigator.pop(context),
              style: ElevatedButton.styleFrom(
                minimumSize: const Size(double.infinity, 50),
                backgroundColor: Colors.black87,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text('Close'),
            ),
          ],
        ),
      ),
    );
  }

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.black87,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  @override
  void dispose() {
    _locationSubscription?.cancel();
    _destinationController.dispose();
    _mapController.dispose();
    super.dispose();
  }
}

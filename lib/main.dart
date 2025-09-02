import 'dart:async';
import 'dart:convert';
import 'dart:math'; // NEW import for distance calculation
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart' as latlng;
import 'package:location/location.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
// REMOVED: import 'package:geolocator/geolocator.dart';


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

// A simple data model for location suggestions
class PlaceSuggestion {
  final String displayName;
  final double latitude;
  final double longitude;

  PlaceSuggestion({
    required this.displayName,
    required this.latitude,
    required this.longitude,
  });

  factory PlaceSuggestion.fromJson(Map<String, dynamic> json) {
    return PlaceSuggestion(
      displayName: json['display_name'],
      latitude: double.parse(json['lat']),
      longitude: double.parse(json['lon']),
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
      home: const RouteMateHomePage(),
      debugShowCheckedModeBanner: false,
    );
  }
}

enum AppState { initial, driving, searching }

// NEW WIDGET for the pulsing blue dot
class PulsingDot extends StatefulWidget {
  const PulsingDot({super.key});

  @override
  State<PulsingDot> createState() => _PulsingDotState();
}

class _PulsingDotState extends State<PulsingDot>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );

    _animation = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeOut),
    );

    _animationController.repeat();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      alignment: Alignment.center,
      children: [
        FadeTransition(
          opacity: _animation.drive(Tween<double>(begin: 1.0, end: 0.0)),
          child: ScaleTransition(
            scale: _animation,
            child: Container(
              width: 50.0,
              height: 50.0,
              decoration: BoxDecoration(
                color: Colors.blue.withAlpha(128),
                shape: BoxShape.circle,
              ),
            ),
          ),
        ),
        Container(
          width: 20.0,
          height: 20.0,
          decoration: BoxDecoration(
            color: Colors.blue.shade700,
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 2.5),
          ),
        ),
      ],
    );
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }
}

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
  List<latlng.LatLng> _routePoints = [];

  // Search-specific state
  List<PlaceSuggestion> _suggestions = [];
  PlaceSuggestion? _selectedPlace;
  bool _isSearching = false;
  Timer? _debounce;

  // Realtime subscriptions and data lists for matching
  StreamSubscription? _rideRequestsSubscription;
  StreamSubscription? _driversSubscription;
  List<DocumentSnapshot> _relevantRideRequests = [];
  List<DocumentSnapshot> _availableDrivers = [];
  static const double proximityThreshold = 3000; // 3km in meters

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

        if (_isMapReady && _appState != AppState.driving) {
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

  void _onSearchChanged(String query) {
    if (_debounce?.isActive ?? false) _debounce!.cancel();
    _debounce = Timer(const Duration(milliseconds: 500), () {
      if (query.length > 2) {
        _performSearch(query);
      } else {
        setState(() {
          _suggestions = [];
        });
      }
    });
  }

  Future<void> _performSearch(String query) async {
    setState(() {
      _isSearching = true;
    });

    try {
      final uri = Uri.parse(
        'https://nominatim.openstreetmap.org/search?q=$query&format=json&limit=5',
      );
      final response = await http.get(
        uri,
        headers: {
          'User-Agent':
              'com.routemate.app', // Required by Nominatim's Usage Policy
        },
      );

      if (response.statusCode == 200) {
        final List results = json.decode(response.body);
        setState(() {
          _suggestions = results
              .map((e) => PlaceSuggestion.fromJson(e))
              .toList();
        });
      } else {
        _showMessage("Error fetching locations.");
      }
    } catch (e) {
      _showMessage("Could not connect to location service.");
    } finally {
      setState(() {
        _isSearching = false;
      });
    }
  }

  Future<void> _getRoute() async {
    if (_currentLocation == null || _selectedPlace == null) return;

    final start = _currentLocation!;
    final end = latlng.LatLng(_selectedPlace!.latitude, _selectedPlace!.longitude);

    final url = 'http://router.project-osrm.org/route/v1/driving/'
        '${start.longitude},${start.latitude};${end.longitude},${end.latitude}'
        '?overview=full&geometries=geojson';

    try {
      final response = await http.get(Uri.parse(url));
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final geometry = data['routes'][0]['geometry']['coordinates'];
        final List<latlng.LatLng> points = geometry
            .map<latlng.LatLng>((coord) => latlng.LatLng(coord[1], coord[0]))
            .toList();

        setState(() {
          _routePoints = points;
        });
        
        if (_routePoints.isNotEmpty && _isMapReady) {
          final bounds = LatLngBounds.fromPoints(_routePoints);
          _mapController.fitCamera(
            CameraFit.bounds(
              bounds: bounds,
              padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 80),
            ),
          );
        }
      } else {
        _showMessage("Could not get route. Please try again.");
      }
    } catch (e) {
      _showMessage("Error connecting to routing service.");
    }
  }

  Future<void> _startDriving() async {
    if (_selectedPlace == null || _currentUser == null) {
      _showMessage("Please select a destination from the list.");
      return;
    }
    
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Fetching route...')),
    );

    await _getRoute(); 

    if (_routePoints.isNotEmpty) {
      await _firestore.collection('users').doc(_currentUser!.uid).update({
        'status': 'driving',
        'destination_name': _selectedPlace!.displayName,
        'destination_location': GeoPoint(
          _selectedPlace!.latitude,
          _selectedPlace!.longitude,
        ),
      });

      setState(() => _appState = AppState.driving);
      _listenForRideRequests();
      _showMessage("You are now driving.");
    }
  }

  void _findRide() {
    if (_selectedPlace == null || _currentLocation == null) {
      _showMessage("Please select a destination from the list.");
      return;
    }
    _firestore.collection('ride_requests').doc(_currentUser!.uid).set({
      'passenger_id': _currentUser!.uid,
      'location': GeoPoint(
        _currentLocation!.latitude,
        _currentLocation!.longitude,
      ),
      'destination': _selectedPlace!.displayName,
      'destination_location': GeoPoint(
        _selectedPlace!.latitude,
        _selectedPlace!.longitude,
      ),
      'status': 'waiting',
      'timestamp': FieldValue.serverTimestamp(),
    });

    setState(() => _appState = AppState.searching);
    _listenForDrivers();
    _showMessage("Requesting a ride...");
  }

  void _resetApp() {
    if (_appState == AppState.searching) {
      _firestore.collection('ride_requests').doc(_currentUser!.uid).delete();
    }
    if (_appState == AppState.driving && _currentUser != null) {
      _firestore.collection('users').doc(_currentUser!.uid).update({
        'status': 'idle',
        'destination_name': null,
        'destination_location': null,
      });
    }

    _rideRequestsSubscription?.cancel();
    _driversSubscription?.cancel();

    setState(() {
      _appState = AppState.initial;
      _destinationController.clear();
      _suggestions = [];
      _selectedPlace = null;
      _routePoints = [];
      _relevantRideRequests = [];
      _availableDrivers = [];
    });
  }
  
  // NEW: Manual distance calculation to avoid external packages
  double _calculateDistanceInMeters(lat1, lon1, lat2, lon2) {
    var p = 0.017453292519943295; // Math.PI / 180
    var a = 0.5 -
        cos((lat2 - lat1) * p) / 2 +
        cos(lat1 * p) * cos(lat2 * p) * (1 - cos((lon2 - lon1) * p)) / 2;
    return 12742 * 1000 * asin(sqrt(a)); // 2 * R * 1000; R = 6371 km
  }

  void _listenForRideRequests() {
    _rideRequestsSubscription?.cancel();
    if (_appState != AppState.driving || _selectedPlace == null) return;

    _rideRequestsSubscription = _firestore
        .collection('ride_requests')
        .where('status', isEqualTo: 'waiting')
        .snapshots()
        .listen((snapshot) {
      if (!mounted) return;
      final driverDestination = _selectedPlace!;
      List<DocumentSnapshot> relevantRequests = [];

      for (var doc in snapshot.docs) {
        final data = doc.data();
        final destPoint = data['destination_location'] as GeoPoint;
        
        // REPLACED Geolocator with manual calculation
        double distance = _calculateDistanceInMeters(
          driverDestination.latitude,
          driverDestination.longitude,
          destPoint.latitude,
          destPoint.longitude,
        );

        if (distance <= proximityThreshold) {
          relevantRequests.add(doc);
        }
      }
      setState(() {
        _relevantRideRequests = relevantRequests;
      });
    });
  }

  void _listenForDrivers() {
    _driversSubscription?.cancel();
    if (_appState != AppState.searching || _selectedPlace == null) return;

    _driversSubscription = _firestore
        .collection('users')
        .where('status', isEqualTo: 'driving')
        .snapshots()
        .listen((snapshot) {
      if (!mounted) return;
      final passengerDestination = _selectedPlace!;
      List<DocumentSnapshot> matchedDrivers = [];

      for (var doc in snapshot.docs) {
        final data = doc.data();
        if (data['destination_location'] == null) continue;
        final destPoint = data['destination_location'] as GeoPoint;

        // REPLACED Geolocator with manual calculation
        double distance = _calculateDistanceInMeters(
          passengerDestination.latitude,
          passengerDestination.longitude,
          destPoint.latitude,
          destPoint.longitude,
        );
        
        if (distance <= proximityThreshold) {
          matchedDrivers.add(doc);
        }
      }
      setState(() {
        _availableDrivers = matchedDrivers;
      });
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
    List<Marker> markers = [];

    // 1. Add the user's current location marker (always a pulsing dot)
    if (_currentLocation != null) {
      markers.add(
        Marker(
          width: 80.0,
          height: 80.0,
          point: _currentLocation!,
          child: const PulsingDot(),
        ),
      );
    }
    
    // 2. Add other markers based on the app's state
    switch (_appState) {
      case AppState.initial:
        // No other markers are needed in the initial state.
        break;
      case AppState.driving:
        // Add destination marker
        if (_selectedPlace != null) {
          markers.add(
            Marker(
              width: 80.0,
              height: 80.0,
              point: latlng.LatLng(
                _selectedPlace!.latitude,
                _selectedPlace!.longitude,
              ),
              child: Icon(Icons.location_on, color: Colors.red.shade800, size: 45),
            ),
          );
        }
        // Add relevant ride request markers
        for (var doc in _relevantRideRequests) {
          final data = doc.data() as Map<String, dynamic>;
          final geoPoint = data['location'] as GeoPoint;
          markers.add(
            Marker(
              width: 80.0,
              height: 80.0,
              point: latlng.LatLng(geoPoint.latitude, geoPoint.longitude),
              child: GestureDetector(
                onTap: () => _showPickupDialog(doc),
                child: Tooltip(
                  message: "To: ${data['destination']}",
                  child: Icon(Icons.hail, color: Colors.purple.shade600, size: 40),
                ),
              ),
            ),
          );
        }
        break;
      case AppState.searching:
        // Add destination marker
        if (_selectedPlace != null) {
          markers.add(
            Marker(
              width: 80.0,
              height: 80.0,
              point: latlng.LatLng(
                _selectedPlace!.latitude,
                _selectedPlace!.longitude,
              ),
              child: Icon(Icons.location_on, color: Colors.red.shade800, size: 45),
            ),
          );
        }
        // Add available driver markers
        for (var doc in _availableDrivers) {
          final data = doc.data() as Map<String, dynamic>;
          final geoPoint = data['location'] as GeoPoint;
          markers.add(
            Marker(
              width: 80.0,
              height: 80.0,
              point: latlng.LatLng(geoPoint.latitude, geoPoint.longitude),
              child: Tooltip(
                message: "To: ${data['destination_name']}",
                child: Icon(Icons.drive_eta, color: Colors.orange.shade800, size: 40),
              ),
            ),
          );
        }
        break;
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
          urlTemplate: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          userAgentPackageName: 'com.routemate.app',
        ),
        if (_routePoints.isNotEmpty)
          PolylineLayer(
            polylines: [
              // Main route line
              Polyline(
                points: _routePoints,
                strokeWidth: 5.0,
                color: const Color(0xFF0284C7),
                borderColor: const Color(0xFF0369A1),
                borderStrokeWidth: 1.0,
              ),
              // Dotted line from user to route start
              if (_currentLocation != null)
                Polyline(
                  points: [
                    _currentLocation!,
                    _routePoints.first,
                  ],
                  strokeWidth: 3.0,
                  color: Colors.grey.shade600,
                  dotted: true, // <-- Use dotted parameter for dotted/dashed effect
                  strokeCap: StrokeCap.round,
                ),
              // Dotted line from route end to destination
              if (_selectedPlace != null)
                Polyline(
                  points: [
                    _routePoints.last,
                    latlng.LatLng(_selectedPlace!.latitude, _selectedPlace!.longitude),
                  ],
                  strokeWidth: 3.0,
                  color: Colors.grey.shade600,
                  dotted: true, // <-- Use dotted parameter for dotted/dashed effect
                  strokeCap: StrokeCap.round,
                ),
            ],
          ),
        MarkerLayer(markers: markers),
      ],
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
      bottom: 20,
      left: 16,
      right: 16,
      child: Material(
        elevation: 4,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color.fromRGBO(255, 255, 255, 0.95),
            borderRadius: BorderRadius.circular(16),
          ),
          child: AnimatedSize(
            duration: const Duration(milliseconds: 300),
            child: _appState == AppState.initial
                ? _buildInitialStateUI()
                : _buildActiveStateUI(),
          ),
        ),
      ),
    );
  }

  Widget _buildInitialStateUI() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextField(
          controller: _destinationController,
          onChanged: _onSearchChanged,
          decoration: InputDecoration(
            hintText: "Where are you going?",
            filled: true,
            fillColor: Colors.grey[100],
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16),
            suffixIcon: _isSearching
                ? const Padding(
                    padding: EdgeInsets.all(12.0),
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : null,
          ),
        ),
        if (_suggestions.isNotEmpty)
          SizedBox(
            height: 150,
            child: ListView.builder(
              itemCount: _suggestions.length,
              itemBuilder: (context, index) {
                final suggestion = _suggestions[index];
                return ListTile(
                  title: Text(
                    suggestion.displayName,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  onTap: () {
                    setState(() {
                      _destinationController.text = suggestion.displayName;
                      _selectedPlace = suggestion;
                      _suggestions = [];
                    });
                    FocusScope.of(context).unfocus();
                  },
                );
              },
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
    if (_appState == AppState.driving) {
      return Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Text("You are driving", style: TextStyle(fontWeight: FontWeight.bold)),
          TextButton(
            onPressed: _resetApp,
            child: const Text('Cancel', style: TextStyle(color: Colors.red)),
          ),
        ],
      );
    }

    if (_appState == AppState.searching) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text("Searching for drivers...", style: TextStyle(fontWeight: FontWeight.bold)),
              TextButton(
                onPressed: _resetApp,
                child: const Text('Cancel', style: TextStyle(color: Colors.red)),
              ),
            ],
          ),
          const SizedBox(height: 10),
          _availableDrivers.isEmpty
          ? const Padding(
              padding: EdgeInsets.all(8.0),
              child: Text("No nearby drivers found yet."),
            )
          : ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 150),
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: _availableDrivers.length,
                itemBuilder: (context, index) {
                  final driver = _availableDrivers[index].data() as Map<String, dynamic>;
                  return Card(
                    child: ListTile(
                      leading: Icon(Icons.drive_eta, color: Colors.orange.shade800),
                      title: const Text("Driver nearby"),
                      subtitle: Text("Heading to: ${driver['destination_name']}"),
                    ),
                  );
                },
              ),
            ),
        ],
      );
    }
    return const SizedBox.shrink(); // Should not happen
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
    _debounce?.cancel();
    _rideRequestsSubscription?.cancel();
    _driversSubscription?.cancel();
    super.dispose();
  }
}

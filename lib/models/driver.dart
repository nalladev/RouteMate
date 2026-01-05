import 'package:latlong2/latlong.dart';

class Driver {
  final String id;
  final LatLng location;
  final String destinationName;
  final LatLng? destinationLocation;
  final String? status;

  Driver({
    required this.id,
    required this.location,
    required this.destinationName,
    this.destinationLocation,
    this.status,
  });

  factory Driver.fromJson(Map<String, dynamic> json) {
    // Parse location
    final locationData = json['location'] as Map<String, dynamic>;
    
    // Parse destination if present
    final destination = json['destination'] as Map<String, dynamic>?;
    LatLng? destLocation;
    String destName = 'Unknown';
    
    if (destination != null) {
      destName = destination['displayName'] as String? ?? 'Unknown';
      final destLoc = destination['location'] as Map<String, dynamic>?;
      if (destLoc != null) {
        destLocation = LatLng(
          destLoc['latitude'] as double,
          destLoc['longitude'] as double
        );
      }
    }
    
    return Driver(
      id: json['id'] as String,
      location: LatLng(
        locationData['latitude'] as double, 
        locationData['longitude'] as double
      ),
      destinationName: destName,
      destinationLocation: destLocation,
      status: json['status'] as String?,
    );
  }
}

import 'package:latlong2/latlong.dart';

class RideRequest {
  final String id;
  final String passengerId;
  final LatLng pickupLocation;
  final LatLng destinationLocation;
  final String destinationName;
  final String? status;
  final String? driverId;

  RideRequest({
    required this.id,
    required this.passengerId,
    required this.pickupLocation,
    required this.destinationLocation,
    required this.destinationName,
    this.status,
    this.driverId,
  });

  factory RideRequest.fromJson(Map<String, dynamic> json) {
    // Handle pickup location
    final pickup = json['pickup'] as Map<String, dynamic>;
    final pickupLoc = pickup['location'] as Map<String, dynamic>;
    
    // Handle destination
    final destination = json['destination'] as Map<String, dynamic>;
    final destLoc = destination['location'] as Map<String, dynamic>;
    
    return RideRequest(
      id: json['id'] as String,
      passengerId: json['passengerId'] as String,
      pickupLocation: LatLng(
        pickupLoc['latitude'] as double, 
        pickupLoc['longitude'] as double
      ),
      destinationLocation: LatLng(
        destLoc['latitude'] as double,
        destLoc['longitude'] as double
      ),
      destinationName: destination['displayName'] as String? ?? 'Unknown',
      status: json['status'] as String?,
      driverId: json['driverId'] as String?,
    );
  }
}

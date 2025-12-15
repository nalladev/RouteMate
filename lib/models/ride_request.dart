import 'package:latlong2/latlong.dart';

class RideRequest {
  final String id;
  final String passengerId;
  final LatLng location;
  final String destination;

  RideRequest({
    required this.id,
    required this.passengerId,
    required this.location,
    required this.destination,
  });

  factory RideRequest.fromJson(Map<String, dynamic> json) {
    final locationData = json['location'] as Map<String, dynamic>;
    return RideRequest(
      id: json['id'] as String,
      passengerId: json['passengerId'] as String,
      location: LatLng(locationData['latitude'] as double, locationData['longitude'] as double),
      destination: json['destination'] as String,
    );
  }
}

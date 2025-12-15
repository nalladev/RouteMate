import 'package:latlong2/latlong.dart';

class Driver {
  final String id;
  final LatLng location;
  final String destinationName;

  Driver({
    required this.id,
    required this.location,
    required this.destinationName,
  });

  factory Driver.fromJson(Map<String, dynamic> json) {
    final locationData = json['location'] as Map<String, dynamic>;
    return Driver(
      id: json['id'] as String,
      location: LatLng(locationData['latitude'] as double, locationData['longitude'] as double),
      destinationName: json['destinationName'] as String,
    );
  }
}

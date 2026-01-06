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
    // Handle both old and new formats
    LatLng pickupLocation;
    LatLng destinationLocation;
    String destinationName;

    // Check if it's the new format with pickup/destination objects
    if (json['pickup'] != null && json['pickup'] is Map) {
      final pickup = json['pickup'] as Map<String, dynamic>;
      if (pickup['latitude'] != null && pickup['longitude'] != null) {
        // New format: pickup has latitude/longitude directly
        pickupLocation = LatLng(
          (pickup['latitude'] ?? 0.0).toDouble(),
          (pickup['longitude'] ?? 0.0).toDouble(),
        );
      } else if (pickup['location'] != null && pickup['location'] is Map) {
        // New format: pickup has nested location object
        final pickupLoc = pickup['location'] as Map<String, dynamic>;
        pickupLocation = LatLng(
          (pickupLoc['latitude'] ?? 0.0).toDouble(),
          (pickupLoc['longitude'] ?? 0.0).toDouble(),
        );
      } else {
        pickupLocation = const LatLng(0.0, 0.0);
      }
    } else if (json['pickupLocation'] != null && json['pickupLocation'] is Map) {
      // Old format with pickupLocation object
      final pickupLoc = json['pickupLocation'] as Map<String, dynamic>;
      pickupLocation = LatLng(
        (pickupLoc['latitude'] ?? 0.0).toDouble(),
        (pickupLoc['longitude'] ?? 0.0).toDouble(),
      );
    } else {
      pickupLocation = const LatLng(0.0, 0.0);
    }

    // Handle destination
    if (json['destination'] != null && json['destination'] is Map) {
      final destination = json['destination'] as Map<String, dynamic>;
      destinationName = destination['name'] ?? destination['displayName'] ?? 'Unknown';
      
      if (destination['latitude'] != null && destination['longitude'] != null) {
        // New format: destination has latitude/longitude directly
        destinationLocation = LatLng(
          (destination['latitude'] ?? 0.0).toDouble(),
          (destination['longitude'] ?? 0.0).toDouble(),
        );
      } else if (destination['location'] != null && destination['location'] is Map) {
        // New format: destination has nested location object
        final destLoc = destination['location'] as Map<String, dynamic>;
        destinationLocation = LatLng(
          (destLoc['latitude'] ?? 0.0).toDouble(),
          (destLoc['longitude'] ?? 0.0).toDouble(),
        );
      } else {
        destinationLocation = const LatLng(0.0, 0.0);
      }
    } else {
      // Old format
      destinationName = json['destinationName'] ?? 'Unknown';
      
      if (json['destinationLocation'] != null && json['destinationLocation'] is Map) {
        final destLoc = json['destinationLocation'] as Map<String, dynamic>;
        destinationLocation = LatLng(
          (destLoc['latitude'] ?? 0.0).toDouble(),
          (destLoc['longitude'] ?? 0.0).toDouble(),
        );
      } else {
        destinationLocation = const LatLng(0.0, 0.0);
      }
    }
    
    return RideRequest(
      id: json['id'] ?? '',
      passengerId: json['passengerId'] ?? '',
      pickupLocation: pickupLocation,
      destinationLocation: destinationLocation,
      destinationName: destinationName,
      status: json['status']?.toString(),
      driverId: json['driverId']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'passengerId': passengerId,
      'pickupLocation': {
        'latitude': pickupLocation.latitude,
        'longitude': pickupLocation.longitude,
      },
      'destinationLocation': {
        'latitude': destinationLocation.latitude,
        'longitude': destinationLocation.longitude,
      },
      'destinationName': destinationName,
      'status': status,
      'driverId': driverId,
    };
  }

  RideRequest copyWith({
    String? id,
    String? passengerId,
    LatLng? pickupLocation,
    LatLng? destinationLocation,
    String? destinationName,
    String? status,
    String? driverId,
  }) {
    return RideRequest(
      id: id ?? this.id,
      passengerId: passengerId ?? this.passengerId,
      pickupLocation: pickupLocation ?? this.pickupLocation,
      destinationLocation: destinationLocation ?? this.destinationLocation,
      destinationName: destinationName ?? this.destinationName,
      status: status ?? this.status,
      driverId: driverId ?? this.driverId,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is RideRequest &&
        other.id == id &&
        other.passengerId == passengerId &&
        other.pickupLocation == pickupLocation &&
        other.destinationLocation == destinationLocation &&
        other.destinationName == destinationName &&
        other.status == status &&
        other.driverId == driverId;
  }

  @override
  int get hashCode {
    return id.hashCode ^
        passengerId.hashCode ^
        pickupLocation.hashCode ^
        destinationLocation.hashCode ^
        destinationName.hashCode ^
        status.hashCode ^
        driverId.hashCode;
  }

  @override
  String toString() {
    return 'RideRequest(id: $id, passengerId: $passengerId, pickupLocation: $pickupLocation, destinationLocation: $destinationLocation, destinationName: $destinationName, status: $status, driverId: $driverId)';
  }
}
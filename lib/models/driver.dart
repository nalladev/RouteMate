import 'package:latlong2/latlong.dart';

class Driver {
  final String id;
  final String? sessionId;
  final LatLng location;
  final String destinationName;
  final LatLng? destinationLocation;
  final String? status;
  final int? availableSeats;
  final double? estimatedArrival;

  Driver({
    required this.id,
    required this.location,
    required this.destinationName,
    this.sessionId,
    this.destinationLocation,
    this.status,
    this.availableSeats,
    this.estimatedArrival,
  });

  factory Driver.fromJson(Map<String, dynamic> json) {
    // Handle both old and new formats
    LatLng location;
    String destinationName;
    LatLng? destinationLocation;
    
    // Check if it's the new format with currentLocation object
    if (json['currentLocation'] != null && json['currentLocation'] is Map) {
      final currentLoc = json['currentLocation'] as Map<String, dynamic>;
      location = LatLng(
        (currentLoc['latitude'] ?? 0.0).toDouble(),
        (currentLoc['longitude'] ?? 0.0).toDouble(),
      );
    } else if (json['location'] != null && json['location'] is Map) {
      // Old format with location object
      final locationData = json['location'] as Map<String, dynamic>;
      location = LatLng(
        (locationData['latitude'] ?? 0.0).toDouble(),
        (locationData['longitude'] ?? 0.0).toDouble(),
      );
    } else {
      // Fallback
      location = const LatLng(0.0, 0.0);
    }

    // Handle destination name - new vs old format
    if (json['destination'] != null && json['destination'] is Map) {
      final dest = json['destination'] as Map<String, dynamic>;
      destinationName = dest['name'] ?? dest['displayName'] ?? 'Unknown';
      
      // Try to get destination location
      if (dest['latitude'] != null && dest['longitude'] != null) {
        destinationLocation = LatLng(
          (dest['latitude'] ?? 0.0).toDouble(),
          (dest['longitude'] ?? 0.0).toDouble(),
        );
      } else if (dest['location'] != null && dest['location'] is Map) {
        final destLoc = dest['location'] as Map<String, dynamic>;
        destinationLocation = LatLng(
          (destLoc['latitude'] ?? 0.0).toDouble(),
          (destLoc['longitude'] ?? 0.0).toDouble(),
        );
      }
    } else {
      destinationName = json['destinationName'] ?? 'Unknown';
      
      // Try to get destinationLocation from old format
      if (json['destinationLocation'] != null) {
        final destLoc = json['destinationLocation'] as Map<String, dynamic>;
        destinationLocation = LatLng(
          (destLoc['latitude'] ?? 0.0).toDouble(),
          (destLoc['longitude'] ?? 0.0).toDouble(),
        );
      }
    }
    
    return Driver(
      id: json['id'] ?? json['driverId'] ?? '',
      sessionId: json['sessionId']?.toString(),
      location: location,
      destinationName: destinationName,
      destinationLocation: destinationLocation,
      status: json['status']?.toString(),
      availableSeats: json['availableSeats'] as int?,
      estimatedArrival: (json['estimatedArrival'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'sessionId': sessionId,
      'location': {
        'latitude': location.latitude,
        'longitude': location.longitude,
      },
      'destinationName': destinationName,
      'destinationLocation': destinationLocation != null ? {
        'latitude': destinationLocation!.latitude,
        'longitude': destinationLocation!.longitude,
      } : null,
      'status': status,
      'availableSeats': availableSeats,
      'estimatedArrival': estimatedArrival,
    };
  }

  Driver copyWith({
    String? id,
    String? sessionId,
    LatLng? location,
    String? destinationName,
    LatLng? destinationLocation,
    String? status,
    int? availableSeats,
    double? estimatedArrival,
  }) {
    return Driver(
      id: id ?? this.id,
      sessionId: sessionId ?? this.sessionId,
      location: location ?? this.location,
      destinationName: destinationName ?? this.destinationName,
      destinationLocation: destinationLocation ?? this.destinationLocation,
      status: status ?? this.status,
      availableSeats: availableSeats ?? this.availableSeats,
      estimatedArrival: estimatedArrival ?? this.estimatedArrival,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is Driver &&
        other.id == id &&
        other.sessionId == sessionId &&
        other.location == location &&
        other.destinationName == destinationName &&
        other.destinationLocation == destinationLocation &&
        other.status == status &&
        other.availableSeats == availableSeats &&
        other.estimatedArrival == estimatedArrival;
  }

  @override
  int get hashCode {
    return id.hashCode ^
        sessionId.hashCode ^
        location.hashCode ^
        destinationName.hashCode ^
        destinationLocation.hashCode ^
        status.hashCode ^
        availableSeats.hashCode ^
        estimatedArrival.hashCode;
  }

  @override
  String toString() {
    return 'Driver(id: $id, location: $location, destinationName: $destinationName, destinationLocation: $destinationLocation, status: $status)';
  }
}
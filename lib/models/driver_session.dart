class DriverSession {
  final String id;
  final String driverId;
  final LocationPoint startLocation;
  final LocationPoint destination;
  final RouteInfo route;
  final int capacity;
  final DriverSessionStatus status;
  final DriverPreferences preferences;
  final DateTime createdAt;
  final DateTime updatedAt;
  final int currentPassengers;

  DriverSession({
    required this.id,
    required this.driverId,
    required this.startLocation,
    required this.destination,
    required this.route,
    required this.capacity,
    required this.status,
    required this.preferences,
    required this.createdAt,
    required this.updatedAt,
    this.currentPassengers = 0,
  });

  factory DriverSession.fromJson(Map<String, dynamic> json) {
    return DriverSession(
      id: json['id'] ?? '',
      driverId: json['driverId'] ?? '',
      startLocation: LocationPoint.fromJson(json['startLocation'] ?? {}),
      destination: LocationPoint.fromJson(json['destination'] ?? {}),
      route: RouteInfo.fromJson(json['route'] ?? {}),
      capacity: json['capacity'] ?? 4,
      status: DriverSessionStatus.fromString(json['status'] ?? 'active'),
      preferences: json['preferences'] != null 
          ? DriverPreferences.fromJson(json['preferences']) 
          : DriverPreferences.defaultPreferences(),
      createdAt: json['createdAt'] != null 
          ? DateTime.parse(json['createdAt']) 
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null 
          ? DateTime.parse(json['updatedAt']) 
          : DateTime.now(),
      currentPassengers: json['currentPassengers'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'driverId': driverId,
      'startLocation': startLocation.toJson(),
      'destination': destination.toJson(),
      'route': route.toJson(),
      'capacity': capacity,
      'status': status.toString(),
      'preferences': preferences.toJson(),
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'currentPassengers': currentPassengers,
    };
  }

  DriverSession copyWith({
    String? id,
    String? driverId,
    LocationPoint? startLocation,
    LocationPoint? destination,
    RouteInfo? route,
    int? capacity,
    DriverSessionStatus? status,
    DriverPreferences? preferences,
    DateTime? createdAt,
    DateTime? updatedAt,
    int? currentPassengers,
  }) {
    return DriverSession(
      id: id ?? this.id,
      driverId: driverId ?? this.driverId,
      startLocation: startLocation ?? this.startLocation,
      destination: destination ?? this.destination,
      route: route ?? this.route,
      capacity: capacity ?? this.capacity,
      status: status ?? this.status,
      preferences: preferences ?? this.preferences,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      currentPassengers: currentPassengers ?? this.currentPassengers,
    );
  }

  bool get isActive => status == DriverSessionStatus.active;
  bool get hasAvailableSeats => currentPassengers < capacity;
  int get availableSeats => capacity - currentPassengers;
}

class LocationPoint {
  final String name;
  final double latitude;
  final double longitude;
  final String? placeId;

  LocationPoint({
    required this.name,
    required this.latitude,
    required this.longitude,
    this.placeId,
  });

  factory LocationPoint.fromJson(Map<String, dynamic> json) {
    return LocationPoint(
      name: json['name'] ?? '',
      latitude: (json['latitude'] ?? 0.0).toDouble(),
      longitude: (json['longitude'] ?? 0.0).toDouble(),
      placeId: json['placeId'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'latitude': latitude,
      'longitude': longitude,
      'placeId': placeId,
    };
  }

  LocationPoint copyWith({
    String? name,
    double? latitude,
    double? longitude,
    String? placeId,
  }) {
    return LocationPoint(
      name: name ?? this.name,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      placeId: placeId ?? this.placeId,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is LocationPoint &&
        other.latitude == latitude &&
        other.longitude == longitude;
  }

  @override
  int get hashCode => latitude.hashCode ^ longitude.hashCode;

  @override
  String toString() => '$name ($latitude, $longitude)';
}

class RouteInfo {
  final List<LocationPoint> coordinates;
  final double distance; // in kilometers
  final int estimatedDuration; // in minutes

  RouteInfo({
    required this.coordinates,
    required this.distance,
    required this.estimatedDuration,
  });

  factory RouteInfo.fromJson(Map<String, dynamic> json) {
    return RouteInfo(
      coordinates: json['coordinates'] != null 
          ? (json['coordinates'] as List)
              .map((coord) => LocationPoint.fromJson(coord))
              .toList()
          : [],
      distance: (json['distance'] ?? 0.0).toDouble(),
      estimatedDuration: json['estimatedDuration'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'coordinates': coordinates.map((coord) => coord.toJson()).toList(),
      'distance': distance,
      'estimatedDuration': estimatedDuration,
    };
  }

  RouteInfo copyWith({
    List<LocationPoint>? coordinates,
    double? distance,
    int? estimatedDuration,
  }) {
    return RouteInfo(
      coordinates: coordinates ?? this.coordinates,
      distance: distance ?? this.distance,
      estimatedDuration: estimatedDuration ?? this.estimatedDuration,
    );
  }
}

class DriverPreferences {
  final bool allowDetours;
  final double maxDetourDistance; // in kilometers
  final List<String> passengerTypes;

  DriverPreferences({
    required this.allowDetours,
    required this.maxDetourDistance,
    required this.passengerTypes,
  });

  factory DriverPreferences.fromJson(Map<String, dynamic> json) {
    return DriverPreferences(
      allowDetours: json['allowDetours'] ?? true,
      maxDetourDistance: (json['maxDetourDistance'] ?? 5.0).toDouble(),
      passengerTypes: json['passengerTypes'] != null 
          ? List<String>.from(json['passengerTypes'])
          : ['any'],
    );
  }

  factory DriverPreferences.defaultPreferences() {
    return DriverPreferences(
      allowDetours: true,
      maxDetourDistance: 5.0,
      passengerTypes: ['any'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'allowDetours': allowDetours,
      'maxDetourDistance': maxDetourDistance,
      'passengerTypes': passengerTypes,
    };
  }

  DriverPreferences copyWith({
    bool? allowDetours,
    double? maxDetourDistance,
    List<String>? passengerTypes,
  }) {
    return DriverPreferences(
      allowDetours: allowDetours ?? this.allowDetours,
      maxDetourDistance: maxDetourDistance ?? this.maxDetourDistance,
      passengerTypes: passengerTypes ?? this.passengerTypes,
    );
  }
}

enum DriverSessionStatus {
  active,
  paused,
  completed;

  static DriverSessionStatus fromString(String status) {
    switch (status.toLowerCase()) {
      case 'active':
        return DriverSessionStatus.active;
      case 'paused':
        return DriverSessionStatus.paused;
      case 'completed':
        return DriverSessionStatus.completed;
      default:
        return DriverSessionStatus.active;
    }
  }

  @override
  String toString() {
    switch (this) {
      case DriverSessionStatus.active:
        return 'active';
      case DriverSessionStatus.paused:
        return 'paused';
      case DriverSessionStatus.completed:
        return 'completed';
    }
  }

  String get displayName {
    switch (this) {
      case DriverSessionStatus.active:
        return 'Active';
      case DriverSessionStatus.paused:
        return 'Paused';
      case DriverSessionStatus.completed:
        return 'Completed';
    }
  }
}
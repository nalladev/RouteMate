class Driver {
  final String driverId;
  final String sessionId;
  final LocationPoint currentLocation;
  final LocationPoint destination;
  final int availableSeats;
  final double estimatedArrival; // in minutes
  final DriverStatus status;
  final DriverPreferences preferences;
  final DriverStats stats;

  Driver({
    required this.driverId,
    required this.sessionId,
    required this.currentLocation,
    required this.destination,
    required this.availableSeats,
    required this.estimatedArrival,
    required this.status,
    required this.preferences,
    required this.stats,
  });

  factory Driver.fromJson(Map<String, dynamic> json) {
    return Driver(
      driverId: json['driverId'] ?? '',
      sessionId: json['sessionId'] ?? '',
      currentLocation: LocationPoint.fromJson(json['currentLocation'] ?? {}),
      destination: LocationPoint.fromJson(json['destination'] ?? {}),
      availableSeats: json['availableSeats'] ?? 0,
      estimatedArrival: (json['estimatedArrival'] ?? 0.0).toDouble(),
      status: DriverStatus.fromString(json['status'] ?? 'available'),
      preferences: json['preferences'] != null 
          ? DriverPreferences.fromJson(json['preferences']) 
          : DriverPreferences.defaultPreferences(),
      stats: json['stats'] != null 
          ? DriverStats.fromJson(json['stats']) 
          : DriverStats.empty(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'driverId': driverId,
      'sessionId': sessionId,
      'currentLocation': currentLocation.toJson(),
      'destination': destination.toJson(),
      'availableSeats': availableSeats,
      'estimatedArrival': estimatedArrival,
      'status': status.toString(),
      'preferences': preferences.toJson(),
      'stats': stats.toJson(),
    };
  }

  Driver copyWith({
    String? driverId,
    String? sessionId,
    LocationPoint? currentLocation,
    LocationPoint? destination,
    int? availableSeats,
    double? estimatedArrival,
    DriverStatus? status,
    DriverPreferences? preferences,
    DriverStats? stats,
  }) {
    return Driver(
      driverId: driverId ?? this.driverId,
      sessionId: sessionId ?? this.sessionId,
      currentLocation: currentLocation ?? this.currentLocation,
      destination: destination ?? this.destination,
      availableSeats: availableSeats ?? this.availableSeats,
      estimatedArrival: estimatedArrival ?? this.estimatedArrival,
      status: status ?? this.status,
      preferences: preferences ?? this.preferences,
      stats: stats ?? this.stats,
    );
  }

  bool get isAvailable => status == DriverStatus.available && availableSeats > 0;
  bool get isNearby => estimatedArrival <= 15.0; // Within 15 minutes
  String get formattedETA => '${estimatedArrival.round()} min';
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

class DriverPreferences {
  final bool allowDetours;
  final double maxDetourDistance; // in kilometers
  final List<String> passengerTypes;
  final bool acceptCashPayments;
  final bool acceptPointPayments;

  DriverPreferences({
    required this.allowDetours,
    required this.maxDetourDistance,
    required this.passengerTypes,
    this.acceptCashPayments = true,
    this.acceptPointPayments = true,
  });

  factory DriverPreferences.fromJson(Map<String, dynamic> json) {
    return DriverPreferences(
      allowDetours: json['allowDetours'] ?? true,
      maxDetourDistance: (json['maxDetourDistance'] ?? 5.0).toDouble(),
      passengerTypes: json['passengerTypes'] != null 
          ? List<String>.from(json['passengerTypes'])
          : ['any'],
      acceptCashPayments: json['acceptCashPayments'] ?? true,
      acceptPointPayments: json['acceptPointPayments'] ?? true,
    );
  }

  factory DriverPreferences.defaultPreferences() {
    return DriverPreferences(
      allowDetours: true,
      maxDetourDistance: 5.0,
      passengerTypes: ['any'],
      acceptCashPayments: true,
      acceptPointPayments: true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'allowDetours': allowDetours,
      'maxDetourDistance': maxDetourDistance,
      'passengerTypes': passengerTypes,
      'acceptCashPayments': acceptCashPayments,
      'acceptPointPayments': acceptPointPayments,
    };
  }

  DriverPreferences copyWith({
    bool? allowDetours,
    double? maxDetourDistance,
    List<String>? passengerTypes,
    bool? acceptCashPayments,
    bool? acceptPointPayments,
  }) {
    return DriverPreferences(
      allowDetours: allowDetours ?? this.allowDetours,
      maxDetourDistance: maxDetourDistance ?? this.maxDetourDistance,
      passengerTypes: passengerTypes ?? this.passengerTypes,
      acceptCashPayments: acceptCashPayments ?? this.acceptCashPayments,
      acceptPointPayments: acceptPointPayments ?? this.acceptPointPayments,
    );
  }
}

class DriverStats {
  final int totalTrips;
  final double rating;
  final int totalPassengers;
  final double totalDistanceDriven; // in kilometers
  final int totalPointsEarned;

  DriverStats({
    required this.totalTrips,
    required this.rating,
    required this.totalPassengers,
    required this.totalDistanceDriven,
    required this.totalPointsEarned,
  });

  factory DriverStats.fromJson(Map<String, dynamic> json) {
    return DriverStats(
      totalTrips: json['totalTrips'] ?? 0,
      rating: (json['rating'] ?? 5.0).toDouble(),
      totalPassengers: json['totalPassengers'] ?? 0,
      totalDistanceDriven: (json['totalDistanceDriven'] ?? 0.0).toDouble(),
      totalPointsEarned: json['totalPointsEarned'] ?? 0,
    );
  }

  factory DriverStats.empty() {
    return DriverStats(
      totalTrips: 0,
      rating: 5.0,
      totalPassengers: 0,
      totalDistanceDriven: 0.0,
      totalPointsEarned: 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'totalTrips': totalTrips,
      'rating': rating,
      'totalPassengers': totalPassengers,
      'totalDistanceDriven': totalDistanceDriven,
      'totalPointsEarned': totalPointsEarned,
    };
  }

  DriverStats copyWith({
    int? totalTrips,
    double? rating,
    int? totalPassengers,
    double? totalDistanceDriven,
    int? totalPointsEarned,
  }) {
    return DriverStats(
      totalTrips: totalTrips ?? this.totalTrips,
      rating: rating ?? this.rating,
      totalPassengers: totalPassengers ?? this.totalPassengers,
      totalDistanceDriven: totalDistanceDriven ?? this.totalDistanceDriven,
      totalPointsEarned: totalPointsEarned ?? this.totalPointsEarned,
    );
  }

  String get formattedRating => rating.toStringAsFixed(1);
  String get formattedDistance => '${totalDistanceDriven.toStringAsFixed(1)} km';
}

enum DriverStatus {
  available,
  busy,
  offline;

  static DriverStatus fromString(String status) {
    switch (status.toLowerCase()) {
      case 'available':
        return DriverStatus.available;
      case 'busy':
        return DriverStatus.busy;
      case 'offline':
        return DriverStatus.offline;
      default:
        return DriverStatus.available;
    }
  }

  @override
  String toString() {
    switch (this) {
      case DriverStatus.available:
        return 'available';
      case DriverStatus.busy:
        return 'busy';
      case DriverStatus.offline:
        return 'offline';
    }
  }

  String get displayName {
    switch (this) {
      case DriverStatus.available:
        return 'Available';
      case DriverStatus.busy:
        return 'Busy';
      case DriverStatus.offline:
        return 'Offline';
    }
  }

  bool get isOnline => this != DriverStatus.offline;
}
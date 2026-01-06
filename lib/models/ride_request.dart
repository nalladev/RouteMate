class RideRequest {
  final String id;
  final String passengerId;
  final LocationPoint pickup;
  final LocationPoint destination;
  final RidePreferences preferences;
  final RideRequestStatus status;
  final double estimatedDistance;
  final DateTime createdAt;
  final DateTime expiresAt;
  final String? rideId;
  final String? driverId;

  RideRequest({
    required this.id,
    required this.passengerId,
    required this.pickup,
    required this.destination,
    required this.preferences,
    required this.status,
    required this.estimatedDistance,
    required this.createdAt,
    required this.expiresAt,
    this.rideId,
    this.driverId,
  });

  factory RideRequest.fromJson(Map<String, dynamic> json) {
    return RideRequest(
      id: json['id'] ?? '',
      passengerId: json['passengerId'] ?? '',
      pickup: LocationPoint.fromJson(json['pickup'] ?? {}),
      destination: LocationPoint.fromJson(json['destination'] ?? {}),
      preferences: json['preferences'] != null 
          ? RidePreferences.fromJson(json['preferences']) 
          : RidePreferences.defaultPreferences(),
      status: RideRequestStatus.fromString(json['status'] ?? 'waiting'),
      estimatedDistance: (json['estimatedDistance'] ?? 0.0).toDouble(),
      createdAt: json['createdAt'] != null 
          ? DateTime.parse(json['createdAt']) 
          : DateTime.now(),
      expiresAt: json['expiresAt'] != null 
          ? DateTime.parse(json['expiresAt']) 
          : DateTime.now().add(const Duration(minutes: 30)),
      rideId: json['rideId'],
      driverId: json['driverId'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'passengerId': passengerId,
      'pickup': pickup.toJson(),
      'destination': destination.toJson(),
      'preferences': preferences.toJson(),
      'status': status.toString(),
      'estimatedDistance': estimatedDistance,
      'createdAt': createdAt.toIso8601String(),
      'expiresAt': expiresAt.toIso8601String(),
      'rideId': rideId,
      'driverId': driverId,
    };
  }

  RideRequest copyWith({
    String? id,
    String? passengerId,
    LocationPoint? pickup,
    LocationPoint? destination,
    RidePreferences? preferences,
    RideRequestStatus? status,
    double? estimatedDistance,
    DateTime? createdAt,
    DateTime? expiresAt,
    String? rideId,
    String? driverId,
  }) {
    return RideRequest(
      id: id ?? this.id,
      passengerId: passengerId ?? this.passengerId,
      pickup: pickup ?? this.pickup,
      destination: destination ?? this.destination,
      preferences: preferences ?? this.preferences,
      status: status ?? this.status,
      estimatedDistance: estimatedDistance ?? this.estimatedDistance,
      createdAt: createdAt ?? this.createdAt,
      expiresAt: expiresAt ?? this.expiresAt,
      rideId: rideId ?? this.rideId,
      driverId: driverId ?? this.driverId,
    );
  }

  bool get isExpired => DateTime.now().isAfter(expiresAt);
  bool get isActive => status == RideRequestStatus.waiting || status == RideRequestStatus.matched;
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

class RidePreferences {
  final int maxWaitTime; // minutes
  final int maxWalkDistance; // meters
  final PriceRange? priceRange;

  RidePreferences({
    required this.maxWaitTime,
    required this.maxWalkDistance,
    this.priceRange,
  });

  factory RidePreferences.fromJson(Map<String, dynamic> json) {
    return RidePreferences(
      maxWaitTime: json['maxWaitTime'] ?? 10,
      maxWalkDistance: json['maxWalkDistance'] ?? 500,
      priceRange: json['priceRange'] != null 
          ? PriceRange.fromJson(json['priceRange']) 
          : null,
    );
  }

  factory RidePreferences.defaultPreferences() {
    return RidePreferences(
      maxWaitTime: 10,
      maxWalkDistance: 500,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'maxWaitTime': maxWaitTime,
      'maxWalkDistance': maxWalkDistance,
      'priceRange': priceRange?.toJson(),
    };
  }

  RidePreferences copyWith({
    int? maxWaitTime,
    int? maxWalkDistance,
    PriceRange? priceRange,
  }) {
    return RidePreferences(
      maxWaitTime: maxWaitTime ?? this.maxWaitTime,
      maxWalkDistance: maxWalkDistance ?? this.maxWalkDistance,
      priceRange: priceRange ?? this.priceRange,
    );
  }
}

class PriceRange {
  final double min;
  final double max;
  final String currency;

  PriceRange({
    required this.min,
    required this.max,
    this.currency = 'USD',
  });

  factory PriceRange.fromJson(Map<String, dynamic> json) {
    return PriceRange(
      min: (json['min'] ?? 0.0).toDouble(),
      max: (json['max'] ?? 100.0).toDouble(),
      currency: json['currency'] ?? 'USD',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'min': min,
      'max': max,
      'currency': currency,
    };
  }
}

enum RideRequestStatus {
  waiting,
  matched,
  pickedUp,
  completed,
  cancelled;

  static RideRequestStatus fromString(String status) {
    switch (status.toLowerCase()) {
      case 'waiting':
        return RideRequestStatus.waiting;
      case 'matched':
        return RideRequestStatus.matched;
      case 'picked_up':
        return RideRequestStatus.pickedUp;
      case 'completed':
        return RideRequestStatus.completed;
      case 'cancelled':
        return RideRequestStatus.cancelled;
      default:
        return RideRequestStatus.waiting;
    }
  }

  @override
  String toString() {
    switch (this) {
      case RideRequestStatus.waiting:
        return 'waiting';
      case RideRequestStatus.matched:
        return 'matched';
      case RideRequestStatus.pickedUp:
        return 'picked_up';
      case RideRequestStatus.completed:
        return 'completed';
      case RideRequestStatus.cancelled:
        return 'cancelled';
    }
  }

  String get displayName {
    switch (this) {
      case RideRequestStatus.waiting:
        return 'Waiting for Driver';
      case RideRequestStatus.matched:
        return 'Driver Found';
      case RideRequestStatus.pickedUp:
        return 'On the Way';
      case RideRequestStatus.completed:
        return 'Completed';
      case RideRequestStatus.cancelled:
        return 'Cancelled';
    }
  }

  bool get isActive => this == RideRequestStatus.waiting || this == RideRequestStatus.matched || this == RideRequestStatus.pickedUp;
}
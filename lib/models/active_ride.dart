class ActiveRide {
  final String rideId;
  final String driverId;
  final String driverSessionId;
  final String passengerId;
  final String requestId;
  final LocationPoint pickup;
  final LocationPoint destination;
  final RideRoute route;
  final RideStatus status;
  final RideTimestamps timestamps;
  final RideFare? fare;
  final RideRating? rating;

  ActiveRide({
    required this.rideId,
    required this.driverId,
    required this.driverSessionId,
    required this.passengerId,
    required this.requestId,
    required this.pickup,
    required this.destination,
    required this.route,
    required this.status,
    required this.timestamps,
    this.fare,
    this.rating,
  });

  factory ActiveRide.fromJson(Map<String, dynamic> json) {
    return ActiveRide(
      rideId: json['rideId'] ?? '',
      driverId: json['driverId'] ?? '',
      driverSessionId: json['driverSessionId'] ?? '',
      passengerId: json['passengerId'] ?? '',
      requestId: json['requestId'] ?? '',
      pickup: LocationPoint.fromJson(json['pickup'] ?? {}),
      destination: LocationPoint.fromJson(json['destination'] ?? {}),
      route: RideRoute.fromJson(json['route'] ?? {}),
      status: RideStatus.fromString(json['status'] ?? 'matched'),
      timestamps: RideTimestamps.fromJson(json['timestamps'] ?? {}),
      fare: json['fare'] != null ? RideFare.fromJson(json['fare']) : null,
      rating: json['rating'] != null ? RideRating.fromJson(json['rating']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'rideId': rideId,
      'driverId': driverId,
      'driverSessionId': driverSessionId,
      'passengerId': passengerId,
      'requestId': requestId,
      'pickup': pickup.toJson(),
      'destination': destination.toJson(),
      'route': route.toJson(),
      'status': status.toString(),
      'timestamps': timestamps.toJson(),
      'fare': fare?.toJson(),
      'rating': rating?.toJson(),
    };
  }

  ActiveRide copyWith({
    String? rideId,
    String? driverId,
    String? driverSessionId,
    String? passengerId,
    String? requestId,
    LocationPoint? pickup,
    LocationPoint? destination,
    RideRoute? route,
    RideStatus? status,
    RideTimestamps? timestamps,
    RideFare? fare,
    RideRating? rating,
  }) {
    return ActiveRide(
      rideId: rideId ?? this.rideId,
      driverId: driverId ?? this.driverId,
      driverSessionId: driverSessionId ?? this.driverSessionId,
      passengerId: passengerId ?? this.passengerId,
      requestId: requestId ?? this.requestId,
      pickup: pickup ?? this.pickup,
      destination: destination ?? this.destination,
      route: route ?? this.route,
      status: status ?? this.status,
      timestamps: timestamps ?? this.timestamps,
      fare: fare ?? this.fare,
      rating: rating ?? this.rating,
    );
  }

  bool get isActive => status.isActive;
  bool get isCompleted => status == RideStatus.completed;
  Duration? get totalDuration {
    if (timestamps.matched != null && timestamps.completed != null) {
      return timestamps.completed!.difference(timestamps.matched!);
    }
    return null;
  }
}

class LocationPoint {
  final String name;
  final double latitude;
  final double longitude;
  final String? placeId;
  final DateTime? estimatedArrival;

  LocationPoint({
    required this.name,
    required this.latitude,
    required this.longitude,
    this.placeId,
    this.estimatedArrival,
  });

  factory LocationPoint.fromJson(Map<String, dynamic> json) {
    return LocationPoint(
      name: json['name'] ?? '',
      latitude: (json['latitude'] ?? 0.0).toDouble(),
      longitude: (json['longitude'] ?? 0.0).toDouble(),
      placeId: json['placeId'],
      estimatedArrival: json['estimatedArrival'] != null
          ? DateTime.parse(json['estimatedArrival'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'latitude': latitude,
      'longitude': longitude,
      'placeId': placeId,
      'estimatedArrival': estimatedArrival?.toIso8601String(),
    };
  }

  LocationPoint copyWith({
    String? name,
    double? latitude,
    double? longitude,
    String? placeId,
    DateTime? estimatedArrival,
  }) {
    return LocationPoint(
      name: name ?? this.name,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      placeId: placeId ?? this.placeId,
      estimatedArrival: estimatedArrival ?? this.estimatedArrival,
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

class RideRoute {
  final List<LocationPoint> pickupToDestination;
  final double totalDistance; // in kilometers
  final int estimatedDuration; // in minutes

  RideRoute({
    required this.pickupToDestination,
    required this.totalDistance,
    required this.estimatedDuration,
  });

  factory RideRoute.fromJson(Map<String, dynamic> json) {
    return RideRoute(
      pickupToDestination: json['pickupToDestination'] != null
          ? (json['pickupToDestination'] as List)
              .map((point) => LocationPoint.fromJson(point))
              .toList()
          : [],
      totalDistance: (json['totalDistance'] ?? 0.0).toDouble(),
      estimatedDuration: json['estimatedDuration'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'pickupToDestination': pickupToDestination.map((point) => point.toJson()).toList(),
      'totalDistance': totalDistance,
      'estimatedDuration': estimatedDuration,
    };
  }

  RideRoute copyWith({
    List<LocationPoint>? pickupToDestination,
    double? totalDistance,
    int? estimatedDuration,
  }) {
    return RideRoute(
      pickupToDestination: pickupToDestination ?? this.pickupToDestination,
      totalDistance: totalDistance ?? this.totalDistance,
      estimatedDuration: estimatedDuration ?? this.estimatedDuration,
    );
  }
}

class RideTimestamps {
  final DateTime? matched;
  final DateTime? pickup;
  final DateTime? started;
  final DateTime? completed;

  RideTimestamps({
    this.matched,
    this.pickup,
    this.started,
    this.completed,
  });

  factory RideTimestamps.fromJson(Map<String, dynamic> json) {
    return RideTimestamps(
      matched: json['matched'] != null ? DateTime.parse(json['matched']) : null,
      pickup: json['pickup'] != null ? DateTime.parse(json['pickup']) : null,
      started: json['started'] != null ? DateTime.parse(json['started']) : null,
      completed: json['completed'] != null ? DateTime.parse(json['completed']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'matched': matched?.toIso8601String(),
      'pickup': pickup?.toIso8601String(),
      'started': started?.toIso8601String(),
      'completed': completed?.toIso8601String(),
    };
  }

  RideTimestamps copyWith({
    DateTime? matched,
    DateTime? pickup,
    DateTime? started,
    DateTime? completed,
  }) {
    return RideTimestamps(
      matched: matched ?? this.matched,
      pickup: pickup ?? this.pickup,
      started: started ?? this.started,
      completed: completed ?? this.completed,
    );
  }
}

class RideFare {
  final double amount;
  final String currency;
  final int pointsUsed;

  RideFare({
    required this.amount,
    this.currency = 'USD',
    this.pointsUsed = 0,
  });

  factory RideFare.fromJson(Map<String, dynamic> json) {
    return RideFare(
      amount: (json['amount'] ?? 0.0).toDouble(),
      currency: json['currency'] ?? 'USD',
      pointsUsed: json['pointsUsed'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'amount': amount,
      'currency': currency,
      'pointsUsed': pointsUsed,
    };
  }

  RideFare copyWith({
    double? amount,
    String? currency,
    int? pointsUsed,
  }) {
    return RideFare(
      amount: amount ?? this.amount,
      currency: currency ?? this.currency,
      pointsUsed: pointsUsed ?? this.pointsUsed,
    );
  }

  double get totalCost => amount - (pointsUsed * 0.01); // Assuming 1 point = $0.01
}

class RideRating {
  final double? driverRating;
  final double? passengerRating;
  final String? feedback;

  RideRating({
    this.driverRating,
    this.passengerRating,
    this.feedback,
  });

  factory RideRating.fromJson(Map<String, dynamic> json) {
    return RideRating(
      driverRating: json['driverRating']?.toDouble(),
      passengerRating: json['passengerRating']?.toDouble(),
      feedback: json['feedback'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'driverRating': driverRating,
      'passengerRating': passengerRating,
      'feedback': feedback,
    };
  }

  RideRating copyWith({
    double? driverRating,
    double? passengerRating,
    String? feedback,
  }) {
    return RideRating(
      driverRating: driverRating ?? this.driverRating,
      passengerRating: passengerRating ?? this.passengerRating,
      feedback: feedback ?? this.feedback,
    );
  }
}

enum RideStatus {
  matched,
  enRouteToPickup,
  arrivedAtPickup,
  inProgress,
  completed;

  static RideStatus fromString(String status) {
    switch (status.toLowerCase()) {
      case 'matched':
        return RideStatus.matched;
      case 'en_route_to_pickup':
        return RideStatus.enRouteToPickup;
      case 'arrived_at_pickup':
        return RideStatus.arrivedAtPickup;
      case 'in_progress':
        return RideStatus.inProgress;
      case 'completed':
        return RideStatus.completed;
      default:
        return RideStatus.matched;
    }
  }

  @override
  String toString() {
    switch (this) {
      case RideStatus.matched:
        return 'matched';
      case RideStatus.enRouteToPickup:
        return 'en_route_to_pickup';
      case RideStatus.arrivedAtPickup:
        return 'arrived_at_pickup';
      case RideStatus.inProgress:
        return 'in_progress';
      case RideStatus.completed:
        return 'completed';
    }
  }

  String get displayName {
    switch (this) {
      case RideStatus.matched:
        return 'Matched';
      case RideStatus.enRouteToPickup:
        return 'Driver En Route';
      case RideStatus.arrivedAtPickup:
        return 'Driver Arrived';
      case RideStatus.inProgress:
        return 'In Progress';
      case RideStatus.completed:
        return 'Completed';
    }
  }

  bool get isActive {
    return this != RideStatus.completed;
  }

  bool get canCancel {
    return this == RideStatus.matched || this == RideStatus.enRouteToPickup;
  }
}
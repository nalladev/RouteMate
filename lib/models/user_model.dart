class UserModel {
  final String uid;
  final String phone;
  final int walletPoints;
  final DateTime createdAt;
  final UserProfile? profile;
  final UserStats stats;
  final UserLocation? location;

  UserModel({
    required this.uid,
    required this.phone,
    required this.walletPoints,
    required this.createdAt,
    this.profile,
    required this.stats,
    this.location,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      uid: json['uid'] ?? '',
      phone: json['phone'] ?? '',
      walletPoints: json['walletPoints'] ?? 0,
      createdAt: json['createdAt'] != null 
          ? DateTime.parse(json['createdAt']) 
          : DateTime.now(),
      profile: json['profile'] != null 
          ? UserProfile.fromJson(json['profile']) 
          : null,
      stats: json['stats'] != null 
          ? UserStats.fromJson(json['stats']) 
          : UserStats.empty(),
      location: json['location'] != null 
          ? UserLocation.fromJson(json['location']) 
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'uid': uid,
      'phone': phone,
      'walletPoints': walletPoints,
      'createdAt': createdAt.toIso8601String(),
      'profile': profile?.toJson(),
      'stats': stats.toJson(),
      'location': location?.toJson(),
    };
  }

  UserModel copyWith({
    String? uid,
    String? phone,
    int? walletPoints,
    DateTime? createdAt,
    UserProfile? profile,
    UserStats? stats,
    UserLocation? location,
  }) {
    return UserModel(
      uid: uid ?? this.uid,
      phone: phone ?? this.phone,
      walletPoints: walletPoints ?? this.walletPoints,
      createdAt: createdAt ?? this.createdAt,
      profile: profile ?? this.profile,
      stats: stats ?? this.stats,
      location: location ?? this.location,
    );
  }
}

class UserProfile {
  final String? name;
  final String? profilePicture;
  final Map<String, dynamic>? preferences;

  UserProfile({
    this.name,
    this.profilePicture,
    this.preferences,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      name: json['name'],
      profilePicture: json['profilePicture'],
      preferences: json['preferences'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'profilePicture': profilePicture,
      'preferences': preferences,
    };
  }
}

class UserStats {
  final int totalRidesAsDriver;
  final int totalRidesAsPassenger;
  final double rating;
  final int totalPointsEarned;

  UserStats({
    required this.totalRidesAsDriver,
    required this.totalRidesAsPassenger,
    required this.rating,
    required this.totalPointsEarned,
  });

  factory UserStats.fromJson(Map<String, dynamic> json) {
    return UserStats(
      totalRidesAsDriver: json['totalRidesAsDriver'] ?? 0,
      totalRidesAsPassenger: json['totalRidesAsPassenger'] ?? 0,
      rating: (json['rating'] ?? 5.0).toDouble(),
      totalPointsEarned: json['totalPointsEarned'] ?? 0,
    );
  }

  factory UserStats.empty() {
    return UserStats(
      totalRidesAsDriver: 0,
      totalRidesAsPassenger: 0,
      rating: 5.0,
      totalPointsEarned: 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'totalRidesAsDriver': totalRidesAsDriver,
      'totalRidesAsPassenger': totalRidesAsPassenger,
      'rating': rating,
      'totalPointsEarned': totalPointsEarned,
    };
  }

  UserStats copyWith({
    int? totalRidesAsDriver,
    int? totalRidesAsPassenger,
    double? rating,
    int? totalPointsEarned,
  }) {
    return UserStats(
      totalRidesAsDriver: totalRidesAsDriver ?? this.totalRidesAsDriver,
      totalRidesAsPassenger: totalRidesAsPassenger ?? this.totalRidesAsPassenger,
      rating: rating ?? this.rating,
      totalPointsEarned: totalPointsEarned ?? this.totalPointsEarned,
    );
  }
}

class UserLocation {
  final String userId;
  final double latitude;
  final double longitude;
  final double heading;
  final double speed;
  final double accuracy;
  final bool isActive;
  final DateTime updatedAt;

  UserLocation({
    required this.userId,
    required this.latitude,
    required this.longitude,
    this.heading = 0.0,
    this.speed = 0.0,
    this.accuracy = 10.0,
    this.isActive = true,
    required this.updatedAt,
  });

  factory UserLocation.fromJson(Map<String, dynamic> json) {
    return UserLocation(
      userId: json['userId'] ?? '',
      latitude: (json['latitude'] ?? 0.0).toDouble(),
      longitude: (json['longitude'] ?? 0.0).toDouble(),
      heading: (json['heading'] ?? 0.0).toDouble(),
      speed: (json['speed'] ?? 0.0).toDouble(),
      accuracy: (json['accuracy'] ?? 10.0).toDouble(),
      isActive: json['isActive'] ?? true,
      updatedAt: json['updatedAt'] != null 
          ? DateTime.parse(json['updatedAt']) 
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'userId': userId,
      'latitude': latitude,
      'longitude': longitude,
      'heading': heading,
      'speed': speed,
      'accuracy': accuracy,
      'isActive': isActive,
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  UserLocation copyWith({
    String? userId,
    double? latitude,
    double? longitude,
    double? heading,
    double? speed,
    double? accuracy,
    bool? isActive,
    DateTime? updatedAt,
  }) {
    return UserLocation(
      userId: userId ?? this.userId,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      heading: heading ?? this.heading,
      speed: speed ?? this.speed,
      accuracy: accuracy ?? this.accuracy,
      isActive: isActive ?? this.isActive,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
class PlaceSuggestion {
  final String displayName;
  final double latitude;
  final double longitude;
  final String? placeId;

  PlaceSuggestion({
    required this.displayName,
    required this.latitude,
    required this.longitude,
    this.placeId,
  });

  factory PlaceSuggestion.fromNominatimJson(Map<String, dynamic> json) {
    return PlaceSuggestion(
      displayName: json['display_name'],
      latitude: double.parse(json['lat']),
      longitude: double.parse(json['lon']),
      placeId: json['place_id']?.toString(),
    );
  }

  factory PlaceSuggestion.fromJson(Map<String, dynamic> json) {
    return PlaceSuggestion(
      displayName: json['displayName'],
      latitude: json['latitude'],
      longitude: json['longitude'],
      placeId: json['placeId'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'displayName': displayName,
      'latitude': latitude,
      'longitude': longitude,
      'placeId': placeId,
    };
  }
}
class PlaceSuggestion {
  final String displayName;
  final double latitude;
  final double longitude;

  PlaceSuggestion({
    required this.displayName,
    required this.latitude,
    required this.longitude,
  });

  factory PlaceSuggestion.fromJson(Map<String, dynamic> json) {
    return PlaceSuggestion(
      displayName: json['display_name'],
      latitude: double.parse(json['lat']),
      longitude: double.parse(json['lon']),
    );
  }
}
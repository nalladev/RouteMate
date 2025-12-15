class Reward {
  final String title;
  final int points;
  final String description;
  final DateTime dateEarned;
  final String status;

  Reward({
    required this.title,
    required this.points,
    required this.description,
    required this.dateEarned,
    required this.status,
  });

  factory Reward.fromJson(Map<String, dynamic> json) {
    return Reward(
      title: json['title'] as String,
      points: json['points'] as int,
      description: json['description'] as String,
      dateEarned: DateTime.parse(json['dateEarned'] as String),
      status: json['status'] as String,
    );
  }
}

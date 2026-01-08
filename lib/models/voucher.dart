class Voucher {
  final String id;
  final String title;
  final String description;
  final int points;
  final String icon;

  Voucher({
    required this.id,
    required this.title,
    required this.description,
    required this.points,
    required this.icon,
  });

  factory Voucher.fromJson(Map<String, dynamic> json) {
    return Voucher(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      points: json['points'] as int,
      icon: json['icon'] as String,
    );
  }
}

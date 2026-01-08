class Reward {
  final String id;
  final String type;
  final int amount;
  final String description;
  final DateTime dateEarned;
  final String status;
  final DateTime? expiresAt;
  final String userId;
  final Map<String, dynamic>? metadata;

  Reward({
    required this.id,
    required this.type,
    required this.amount,
    required this.description,
    required this.dateEarned,
    required this.status,
    this.expiresAt,
    required this.userId,
    this.metadata,
  });

  factory Reward.fromJson(Map<String, dynamic> json) {
    return Reward(
      id: json['id'] as String? ?? '',
      type: json['type'] as String,
      amount: json['amount'] as int,
      description: json['description'] as String,
      dateEarned: DateTime.parse(json['dateEarned'] as String),
      status: json['status'] as String,
      expiresAt: json['expiresAt'] != null ? DateTime.parse(json['expiresAt'] as String) : null,
      userId: json['userId'] as String,
      metadata: json['metadata'] as Map<String, dynamic>?,
    );
  }
}

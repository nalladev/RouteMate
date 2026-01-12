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
      type: json['type'] as String? ?? 'reward',
      // Handle both 'amount' and 'points' from backend (backend currently sends 'points')
      amount: (json['amount'] as int?) ?? (json['points'] as int?) ?? 0,
      description: json['description'] as String? ?? json['title'] as String? ?? '',
      dateEarned: json['dateEarned'] != null 
          ? (json['dateEarned'] is String 
              ? DateTime.parse(json['dateEarned'] as String)
              : (json['dateEarned'] as dynamic).toDate())
          : DateTime.now(),
      status: json['status'] as String? ?? 'active',
      expiresAt: json['expiresAt'] != null 
          ? (json['expiresAt'] is String 
              ? DateTime.parse(json['expiresAt'] as String)
              : (json['expiresAt'] as dynamic).toDate())
          : null,
      userId: json['userId'] as String? ?? '',
      metadata: json['metadata'] as Map<String, dynamic>?,
    );
  }
}

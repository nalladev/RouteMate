import 'package:flutter/material.dart';

class RewardsPage extends StatelessWidget {
  const RewardsPage({super.key});

  @override
  Widget build(BuildContext context) {
    // Hardcoded data for demonstration
    const int currentPoints = 1250;
    const int nextTierPoints = 2000;
    const double progress = currentPoints / nextTierPoints;

    return Scaffold(
      backgroundColor: Colors.grey[100],
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text('Rewards Dashboard'),
        backgroundColor: Colors.white,
        elevation: 1,
        foregroundColor: Colors.black87,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          _PointsCard(points: currentPoints),
          const SizedBox(height: 24),
          _TierProgressBar(
            progress: progress,
            currentTier: 'Gold Rider',
            nextTier: 'Platinum',
            nextTierPoints: nextTierPoints,
          ),
          const SizedBox(height: 32),
          _SectionHeader(title: 'Redeemable Rewards'),
          const SizedBox(height: 16),
          _RewardCard(
            icon: Icons.directions_car,
            title: 'Free Ride Coupon',
            points: 1000,
            isRedeemable: currentPoints >= 1000,
          ),
          _RewardCard(
            icon: Icons.local_gas_station,
            title: 'Fuel Cashback',
            points: 1500,
            isRedeemable: currentPoints >= 1500,
          ),
          _RewardCard(
            icon: Icons.coffee,
            title: 'Food / Coffee Discount',
            points: 1800,
            isLocked: true,
          ),
          const SizedBox(height: 32),
          _SectionHeader(title: 'Points History'),
          const SizedBox(height: 16),
          _PointsHistoryTile(
            description: 'Ride Completed',
            points: '+50 pts',
            date: 'Jan 08, 2026',
          ),
          _PointsHistoryTile(
            description: 'Welcome Bonus',
            points: '+100 pts',
            date: 'Jan 02, 2026',
          ),
        ],
      ),
    );
  }
}

class _PointsCard extends StatelessWidget {
  final int points;

  const _PointsCard({required this.points});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.orange.shade700, Colors.orange.shade500],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.orange.withOpacity(0.2),
            blurRadius: 10,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Your Points',
            style: TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            points.toString(),
            style: const TextStyle(
              color: Colors.white,
              fontSize: 48,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          Chip(
            label: const Text(
              'Gold Rider',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            backgroundColor: Colors.white.withOpacity(0.9),
            avatar: Icon(Icons.star, color: Colors.orange.shade800),
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          ),
        ],
      ),
    );
  }
}

class _TierProgressBar extends StatelessWidget {
  final double progress;
  final String currentTier;
  final String nextTier;
  final int nextTierPoints;

  const _TierProgressBar({
    required this.progress,
    required this.currentTier,
    required this.nextTier,
    required this.nextTierPoints,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Tier Progress',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            Text(
              'Next: $nextTier',
              style: TextStyle(color: Colors.grey.shade600),
            ),
          ],
        ),
        const SizedBox(height: 12),
        ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: LinearProgressIndicator(
            value: progress,
            minHeight: 12,
            backgroundColor: Colors.grey[300],
            valueColor: AlwaysStoppedAnimation<Color>(Colors.orange.shade600),
          ),
        ),
        const SizedBox(height: 8),
        Align(
          alignment: Alignment.centerRight,
          child: Text(
            '${nextTierPoints.toString()} pts to unlock',
            style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
          ),
        ),
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 20,
        fontWeight: FontWeight.bold,
        color: Colors.black87,
      ),
    );
  }
}

class _RewardCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final int points;
  final bool isRedeemable;
  final bool isLocked;

  const _RewardCard({
    required this.icon,
    required this.title,
    required this.points,
    this.isRedeemable = false,
    this.isLocked = false,
  });

  @override
  Widget build(BuildContext context) {
    final bool canRedeem = isRedeemable && !isLocked;
    return Card(
      elevation: 2,
      shadowColor: Colors.black.withOpacity(0.1),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
      margin: const EdgeInsets.only(bottom: 12),
      child: Stack(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: [
                Icon(
                  icon,
                  size: 40,
                  color: isLocked ? Colors.grey[400] : Colors.orange.shade600,
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: isLocked ? Colors.grey[500] : Colors.black87,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '$points pts',
                        style: TextStyle(
                          fontSize: 14,
                          color: isLocked
                              ? Colors.grey[400]
                              : Colors.orange.shade800,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                ElevatedButton(
                  onPressed: canRedeem ? () {} : null,
                  style: ElevatedButton.styleFrom(
                    foregroundColor: Colors.white,
                    backgroundColor: Colors.orange.shade600,
                    disabledBackgroundColor: Colors.grey.shade300,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 10,
                    ),
                  ),
                  child: const Text('Redeem'),
                ),
              ],
            ),
          ),
          if (isLocked)
            Positioned.fill(
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.5),
                  borderRadius: BorderRadius.circular(15),
                ),
                child: Center(
                  child: Icon(
                    Icons.lock,
                    color: Colors.grey.shade700,
                    size: 32,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _PointsHistoryTile extends StatelessWidget {
  final String description;
  final String points;
  final String date;

  const _PointsHistoryTile({
    required this.description,
    required this.points,
    required this.date,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      color: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: Colors.orange.withOpacity(0.1),
          child: Icon(
            Icons.check_circle_outline,
            color: Colors.orange.shade700,
          ),
        ),
        title: Text(
          description,
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        subtitle: Text(date, style: TextStyle(color: Colors.grey.shade600)),
        trailing: Text(
          points,
          style: const TextStyle(
            color: Colors.green,
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
        ),
      ),
    );
  }
}

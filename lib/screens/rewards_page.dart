import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:routemate/models/reward.dart';
import 'package:routemate/services/api_service.dart';

class RewardsPage extends StatefulWidget {
  const RewardsPage({super.key});

  @override
  State<RewardsPage> createState() => _RewardsPageState();
}

class _RewardsPageState extends State<RewardsPage> {
  late Future<void> _rewardsFuture;
  int _walletPoints = 0;
  List<Reward> _rewards = [];

  @override
  void initState() {
    super.initState();
    _rewardsFuture = _fetchData();
  }

  Future<void> _fetchData() async {
    final apiService = Provider.of<ApiService>(context, listen: false);
    try {
      // Fetch points and rewards history in parallel
      final results = await Future.wait([
        apiService.getWalletPoints(),
        apiService.getRewards(),
      ]);
      
      setState(() {
        _walletPoints = results[0] as int;
        _rewards = results[1] as List<Reward>;
      });
    } catch (e) {
      // Propagate error to be handled by the FutureBuilder
      throw Exception('Failed to load rewards data: ${e.toString()}');
    }
  }

  @override
  Widget build(BuildContext context) {
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
      body: FutureBuilder(
        future: _rewardsFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Center(
              child: Text(
                'Error: ${snapshot.error}',
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.red),
              ),
            );
          }
          
          // Hardcoded data for demonstration of progress bar
          const int nextTierPoints = 2000;
          final double progress = _walletPoints / nextTierPoints;

          return ListView(
            padding: const EdgeInsets.all(16.0),
            children: [
              _PointsCard(points: _walletPoints),
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
                isRedeemable: _walletPoints >= 1000,
              ),
              _RewardCard(
                icon: Icons.local_gas_station,
                title: 'Fuel Cashback',
                points: 1500,
                isRedeemable: _walletPoints >= 1500,
              ),
              _RewardCard(
                icon: Icons.coffee,
                title: 'Food / Coffee Discount',
                points: 1800,
                isLocked: true,
              ),
              _RewardCard(
                icon: Icons.airport_shuttle,
                title: '20% Off Next Airport Trip',
                points: 2200,
                isRedeemable: _walletPoints >= 2200,
              ),
               _RewardCard(
                icon: Icons.local_car_wash,
                title: 'Free Car Wash Voucher',
                points: 2500,
                isRedeemable: _walletPoints >= 2500,
              ),
              _RewardCard(
                icon: Icons.support_agent,
                title: 'Priority Customer Support',
                points: 3000,
                isLocked: true,
              ),
              const SizedBox(height: 32),
              _SectionHeader(title: 'Points History'),
              const SizedBox(height: 16),
              if (_rewards.isEmpty)
                const Center(
                  child: Text('No reward history yet.'),
                )
              else
                ..._rewards.map((reward) => _PointsHistoryTile(reward: reward)).toList(),
            ],
          );
        },
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
            color: const Color(0x33FFA500),
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
            backgroundColor: const Color(0xE6FFFFFF),
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
      shadowColor: const Color(0x1A000000),
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
                  color: const Color(0x80FFFFFF),
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
  final Reward reward;

  const _PointsHistoryTile({ required this.reward });

  @override
  Widget build(BuildContext context) {
    final formattedDate = DateFormat('MMM dd, yyyy').format(reward.dateEarned);
    final pointsText = '+${reward.points} pts';

    return Card(
      elevation: 0,
      color: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: const Color(0x1AFFA500),
          child: Icon(
            Icons.check_circle_outline,
            color: Colors.orange.shade700,
          ),
        ),
        title: Text(
          reward.title,
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        subtitle: Text(formattedDate, style: TextStyle(color: Colors.grey.shade600)),
        trailing: Text(
          pointsText,
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

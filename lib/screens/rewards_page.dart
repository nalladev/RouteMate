import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:routemate/models/reward.dart';
import 'package:routemate/services/api_service.dart';

// A new class to hold data for redeemable rewards
class RedeemableReward {
  final String title;
  final String description;
  final int points;
  final IconData icon;
  final bool isLocked;

  RedeemableReward({
    required this.title,
    required this.description,
    required this.points,
    required this.icon,
    this.isLocked = false,
  });
}

class RewardsPage extends StatefulWidget {
  const RewardsPage({super.key});

  @override
  State<RewardsPage> createState() => _RewardsPageState();
}


enum RewardFilter { all, redeemable, locked }

class _RewardsPageState extends State<RewardsPage> {
  late Future<void> _rewardsFuture;
  int _walletPoints = 0;
  List<Reward> _rewards = [];
  RewardFilter _filter = RewardFilter.all;
  final Set<String> _redeemedRewards = {};

  void _showRewardDetailsDialog(BuildContext context, RedeemableReward reward) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text(reward.title),
          content: Text(reward.description),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Close'),
            ),
          ],
        );
      },
    );
  }

  // List of redeemable rewards
  final List<RedeemableReward> _redeemableRewards = [
    RedeemableReward(
      title: 'Free Ride Coupon',
      description: 'Enjoy a completely free ride up to a distance of 10km. This coupon is valid for 30 days after redemption.',
      points: 1000,
      icon: Icons.directions_car,
    ),
    RedeemableReward(
      title: 'Fuel Cashback',
      description: 'Get \$5 cashback on your next fuel purchase at any partner station. Cashback will be credited to your wallet.',
      points: 1500,
      icon: Icons.local_gas_station,
    ),
    RedeemableReward(
      title: 'Food / Coffee Discount',
      description: 'A voucher for 20% off at participating cafes and restaurants. A list of partners is available in the app.',
      points: 1800,
      icon: Icons.coffee,
      isLocked: true,
    ),
    RedeemableReward(
      title: '20% Off Next Airport Trip',
      description: 'Get a 20% discount on your next ride to or from the airport. The discount is capped at \$10.',
      points: 2200,
      icon: Icons.airport_shuttle,
    ),
    RedeemableReward(
      title: 'Free Car Wash Voucher',
      description: 'Redeem this for a free basic car wash at any of our partner car wash centers. Valid for 60 days.',
      points: 2500,
      icon: Icons.local_car_wash,
    ),
    RedeemableReward(
      title: 'Priority Customer Support',
      description: 'Jump the queue and get instant access to our support agents whenever you need help.',
      points: 3000,
      icon: Icons.support_agent,
      isLocked: true,
    ),
  ];

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
      
      if (mounted) {
        setState(() {
          _walletPoints = results[0] as int;
          _rewards = results[1] as List<Reward>;
        });
      }
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

          final filteredRewards = _redeemableRewards.where((reward) {
            final isRedeemable = _walletPoints >= reward.points;
            switch (_filter) {
              case RewardFilter.all:
                return true;
              case RewardFilter.redeemable:
                return isRedeemable && !reward.isLocked;
              case RewardFilter.locked:
                return reward.isLocked || !isRedeemable;
            }
          }).toList();

          return RefreshIndicator(
            onRefresh: _fetchData,
            child: ListView(
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
                _FilterChips(
                  selectedFilter: _filter,
                  onFilterChanged: (filter) {
                    setState(() {
                      _filter = filter;
                    });
                  },
                ),
                const SizedBox(height: 16),
                ...filteredRewards.map((reward) {
                  final isRedeemed = _redeemedRewards.contains(reward.title);
                  return InkWell(
                    onTap: () => _showRewardDetailsDialog(context, reward),
                    child: _RewardCard(
                      reward: reward,
                      isRedeemable: _walletPoints >= reward.points,
                      isRedeemed: isRedeemed,
                      onRedeem: () {
                        if (!isRedeemed) {
                          setState(() {
                            _redeemedRewards.add(reward.title);
                          });
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('${reward.title} redeemed!'),
                              backgroundColor: Colors.green,
                            ),
                          );
                        }
                      },
                    ),
                  );
                }).toList(),
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
            ),
          );
        },
      ),
    );
  }
}

class _FilterChips extends StatelessWidget {
  final RewardFilter selectedFilter;
  final ValueChanged<RewardFilter> onFilterChanged;

  const _FilterChips({required this.selectedFilter, required this.onFilterChanged});

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8.0,
      children: [
        FilterChip(
          label: const Text('All'),
          selected: selectedFilter == RewardFilter.all,
          onSelected: (selected) => onFilterChanged(RewardFilter.all),
          selectedColor: Colors.orange.shade100,
          checkmarkColor: Colors.orange.shade800,
        ),
        FilterChip(
          label: const Text('Redeemable'),
          selected: selectedFilter == RewardFilter.redeemable,
          onSelected: (selected) => onFilterChanged(RewardFilter.redeemable),
          selectedColor: Colors.orange.shade100,
          checkmarkColor: Colors.orange.shade800,
        ),
        FilterChip(
          label: const Text('Locked'),
          selected: selectedFilter == RewardFilter.locked,
          onSelected: (selected) => onFilterChanged(RewardFilter.locked),
          selectedColor: Colors.orange.shade100,
          checkmarkColor: Colors.orange.shade800,
        ),
      ],
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
  final RedeemableReward reward;
  final bool isRedeemable;
  final bool isRedeemed;
  final VoidCallback onRedeem;

  const _RewardCard({
    required this.reward,
    required this.isRedeemable,
    required this.isRedeemed,
    required this.onRedeem,
  });

  @override
  Widget build(BuildContext context) {
    final bool canRedeem = isRedeemable && !reward.isLocked && !isRedeemed;
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
                  reward.icon,
                  size: 40,
                  color: reward.isLocked ? Colors.grey[400] : Colors.orange.shade600,
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        reward.title,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: reward.isLocked ? Colors.grey[500] : Colors.black87,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${reward.points} pts',
                        style: TextStyle(
                          fontSize: 14,
                          color: reward.isLocked
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
                  onPressed: canRedeem ? onRedeem : null,
                  style: ElevatedButton.styleFrom(
                    foregroundColor: Colors.white,
                    backgroundColor: isRedeemed ? Colors.grey.shade400 : Colors.orange.shade600,
                    disabledBackgroundColor: Colors.grey.shade300,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 10,
                    ),
                  ),
                  child: Text(isRedeemed ? 'Redeemed' : 'Redeem'),
                ),
              ],
            ),
          ),
          if (reward.isLocked)
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

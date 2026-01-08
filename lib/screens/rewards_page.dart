import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:routemate/models/reward.dart';
import 'package:routemate/models/voucher.dart';
import 'package:routemate/services/api_service.dart';

class RewardsPage extends StatefulWidget {
  const RewardsPage({super.key});

  @override
  State<RewardsPage> createState() => _RewardsPageState();
}

class _RewardsPageState extends State<RewardsPage> {
  late Future<void> _dataFuture;
  int _walletPoints = 0;
  List<Reward> _rewards = [];
  List<Voucher> _vouchers = [];
  bool _isRedeeming = false;

  @override
  void initState() {
    super.initState();
    _dataFuture = _fetchData();
  }

  Future<void> _fetchData() async {
    final apiService = Provider.of<ApiService>(context, listen: false);
    try {
      final results = await Future.wait([
        apiService.getWalletPoints(),
        apiService.getRewards(),
        apiService.getVouchers(),
      ]);
      
      if (mounted) {
        setState(() {
          _walletPoints = results[0] as int;
          _rewards = results[1] as List<Reward>;
          _vouchers = results[2] as List<Voucher>;
        });
      }
    } catch (e) {
      // Allow the FutureBuilder to handle this error
      throw Exception('Failed to load rewards data: ${e.toString()}');
    }
  }

  Future<void> _redeemVoucher(Voucher voucher) async {
    final shouldRedeem = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirm Redemption'),
        content: Text('Are you sure you want to spend ${voucher.points} points to redeem "${voucher.title}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Redeem'),
          ),
        ],
      ),
    );

    if (shouldRedeem != true) return;

    setState(() {
      _isRedeeming = true;
    });

    try {
      final apiService = Provider.of<ApiService>(context, listen: false);
      await apiService.redeemVoucher(voucher.id);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Successfully redeemed "${voucher.title}"!'),
            backgroundColor: Colors.green,
          ),
        );
      }
      // Refresh all data
      await _fetchData();

    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.message}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isRedeeming = false;
        });
      }
    }
  }

  IconData _getIconForString(String iconName) {
    switch (iconName) {
      case 'directions_car':
        return Icons.directions_car;
      case 'local_gas_station':
        return Icons.local_gas_station;
      case 'coffee':
        return Icons.coffee;
      case 'airport_shuttle':
        return Icons.airport_shuttle;
      case 'local_car_wash':
        return Icons.local_car_wash;
      case 'support_agent':
        return Icons.support_agent;
      default:
        return Icons.star;
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
      body: Stack(
        children: [
          FutureBuilder(
            future: _dataFuture,
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting && _vouchers.isEmpty) {
                return const Center(child: CircularProgressIndicator());
              }

              if (snapshot.hasError && _vouchers.isEmpty) {
                return Center(
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Text(
                      'Error loading data. Please try again later.\n${snapshot.error}',
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Colors.red),
                    ),
                  ),
                );
              }
              
              const int nextTierPoints = 5000;
              final double progress = _walletPoints / nextTierPoints;

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
                    ..._vouchers.map((voucher) => _RewardCard(
                      icon: _getIconForString(voucher.icon),
                      title: voucher.title,
                      points: voucher.points,
                      isRedeemable: _walletPoints >= voucher.points,
                      onRedeem: () => _redeemVoucher(voucher),
                    )).toList(),
                    
                    const SizedBox(height: 32),
                    _SectionHeader(title: 'Points History'),
                    const SizedBox(height: 16),
                    if (_rewards.isEmpty)
                      const Center(
                        child: Padding(
                          padding: EdgeInsets.symmetric(vertical: 20.0),
                          child: Text('No reward history yet.'),
                        ),
                      )
                    else
                      ..._rewards.map((reward) => _PointsHistoryTile(reward: reward)).toList(),
                  ],
                ),
              );
            },
          ),
          if (_isRedeeming)
            Container(
              color: Colors.black.withOpacity(0.5),
              child: const Center(
                child: CircularProgressIndicator(
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
// ... (rest of the widgets)
// Update _RewardCard to accept onRedeem callback

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
  final VoidCallback? onRedeem;

  const _RewardCard({
    required this.icon,
    required this.title,
    required this.points,
    this.isRedeemable = false,
    this.isLocked = false,
    this.onRedeem,
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
                  onPressed: canRedeem ? onRedeem : null,
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

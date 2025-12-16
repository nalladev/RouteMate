import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../models/reward.dart';
import '../services/api_service.dart';

class RewardsPage extends StatefulWidget {
  const RewardsPage({super.key});

  @override
  State<RewardsPage> createState() => _RewardsPageState();
}

class _RewardsPageState extends State<RewardsPage> {
  late Future<List<Reward>> _rewardsFuture;
  final _dateFormatter = DateFormat('MMM d, yyyy');

  @override
  void initState() {
    super.initState();
    _rewardsFuture = _fetchRewards();
  }

  Future<List<Reward>> _fetchRewards() {
    // Access ApiService from the provider to fetch data.
    final apiService = Provider.of<ApiService>(context, listen: false);
    return apiService.getRewards();
  }

  Future<void> _refreshRewards() async {
    setState(() {
      _rewardsFuture = _fetchRewards();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Rewards'),
      ),
      body: RefreshIndicator(
        onRefresh: _refreshRewards,
        child: FutureBuilder<List<Reward>>(
          future: _rewardsFuture,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const _LoadingDisplay();
            }

            if (snapshot.hasError) {
              final errorMessage = snapshot.error is ApiException
                  ? (snapshot.error as ApiException).message
                  : 'An unknown error occurred.';
              return _ErrorDisplay(message: 'Error: $errorMessage');
            }

            final rewards = snapshot.data ?? [];
            if (rewards.isEmpty) {
              return const _EmptyDisplay();
            }

            // Calculate total active points from the fetched list of rewards.
            final totalPoints = rewards
                .where((reward) => reward.status == 'Active')
                .fold<int>(0, (total, reward) => total + reward.points);

            return Column(
              children: [
                _TotalPointsHeader(points: totalPoints),
                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: rewards.length,
                    itemBuilder: (context, index) {
                      final reward = rewards[index];
                      // The _RewardCard now receives data from the Reward model.
                      return _RewardCard(
                        title: reward.title,
                        points: reward.points,
                        description: reward.description,
                        dateEarned: reward.dateEarned,
                        status: reward.status,
                        dateFormatter: _dateFormatter,
                      );
                    },
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

// Helper Widgets (No changes needed for these)

class _TotalPointsHeader extends StatelessWidget {
  final int points;

  const _TotalPointsHeader({required this.points});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.symmetric(vertical: 20),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF7ED),
        border: Border.all(color: const Color(0xFFFED7AA)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          const Text(
            'TOTAL ACTIVE POINTS',
            style: TextStyle(
              color: Color(0xFF9A3412),
              fontWeight: FontWeight.bold,
            ),
          ),
          Text(
            '$points pts',
            style: const TextStyle(
              fontSize: 36,
              fontWeight: FontWeight.bold,
              color: Color(0xFFC2410C),
            ),
          ),
        ],
      ),
    );
  }
}

class _RewardCard extends StatelessWidget {
  final String title;
  final int points;
  final String description;
  final DateTime dateEarned;
  final String status;
  final DateFormat dateFormatter;

  const _RewardCard({
    required this.title,
    required this.points,
    required this.description,
    required this.dateEarned,
    required this.status,
    required this.dateFormatter,
  });

  Color _getStatusColor() {
    switch (status) {
      case 'Active':
        return Colors.green;
      case 'Redeemed':
        return Colors.blue;
      case 'Expired':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: AnimatedSize(
        duration: const Duration(milliseconds: 300),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      title,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: _getStatusColor().withAlpha((0.1 * 255).round()),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: _getStatusColor().withAlpha((0.5 * 255).round()),
                      ),
                    ),
                    child: Text(
                      status,
                      style: TextStyle(
                        color: _getStatusColor(),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                description,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '$points points',
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.primary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    'Earned ${dateFormatter.format(dateEarned)}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LoadingDisplay extends StatelessWidget {
  const _LoadingDisplay();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: CircularProgressIndicator(),
    );
  }
}

class _EmptyDisplay extends StatelessWidget {
  const _EmptyDisplay();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.card_giftcard,
            size: 64,
            color: Colors.grey[400],
          ),
          const SizedBox(height: 16),
          Text(
            'No rewards yet',
            style: TextStyle(
              fontSize: 20,
              color: Colors.grey[600],
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Complete rides to earn rewards!',
            style: TextStyle(
              color: Colors.grey[600],
            ),
          ),
        ],
      ),
    );
  }
}

class _ErrorDisplay extends StatelessWidget {
  final String message;

  const _ErrorDisplay({required this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.error_outline,
              color: Colors.red,
              size: 48,
            ),
            const SizedBox(height: 16),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.red),
            ),
          ],
        ),
      ),
    );
  }
}
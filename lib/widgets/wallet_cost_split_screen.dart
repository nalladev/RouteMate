import 'package:flutter/material.dart';

class WalletCostSplitScreen extends StatefulWidget {
  const WalletCostSplitScreen({super.key});

  @override
  State<WalletCostSplitScreen> createState() => _WalletCostSplitScreenState();
}

class _WalletCostSplitScreenState extends State<WalletCostSplitScreen> {
  bool _isEqualSplit = true;
  double _walletBalance = 1250.00; // Example balance
  int _rewardPoints = 350; // Example reward points
  double _totalDistance = 15.5; // Example distance in km
  double _estimatedFuelCost = 150.00; // Example fuel cost
  int _numberOfPassengers = 3; // Example number of passengers
  double _platformFee = 10.00; // Example platform fee

  // Dummy transaction data
  final List<Map<String, dynamic>> _transactions = [
    {'type': 'Ride Payment', 'amount': -80.00, 'icon': Icons.car_rental},
    {'type': 'Wallet Top-up', 'amount': 500.00, 'icon': Icons.account_balance_wallet},
    {'type': 'Reward Redemption', 'amount': 20.00, 'icon': Icons.card_giftcard},
    {'type': 'Ride Payment', 'amount': -120.00, 'icon': Icons.car_rental},
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.textTheme;

    // Calculate per-person cost
    double perPersonCost = (_estimatedFuelCost + _platformFee) / (_isEqualSplit ? _numberOfPassengers : _numberOfPassengers + 0.5); // Driver pays less example

    // Check if wallet balance is insufficient
    bool isInsufficientBalance = _walletBalance < perPersonCost;

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Route Mate Wallet & Split'),
        backgroundColor: theme.primaryColor,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Wallet Section
            Text(
              'Route Mate Wallet',
              style: textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16.0),
            _buildWalletBalanceCard(theme, textTheme),
            const SizedBox(height: 16.0),
            _buildWalletActionButtons(theme),
            const SizedBox(height: 24.0),
            Text(
              'Recent Transactions',
              style: textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12.0),
            _buildRecentTransactions(theme),
            const SizedBox(height: 32.0),

            // Cost Split Section
            Text(
              'Cost Split',
              style: textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16.0),
            _buildRideSummaryCard(theme, textTheme),
            const SizedBox(height: 16.0),
            _buildSplitToggle(theme, textTheme),
            const SizedBox(height: 16.0),
            _buildCostBreakdown(theme, textTheme, perPersonCost),
            const SizedBox(height: 16.0),
            _buildInfoNote(textTheme),
            const SizedBox(height: 24.0),

            // Confirm & Pay Button
            _buildConfirmPayButton(theme, isInsufficientBalance),
          ],
        ),
      ),
    );
  }

  Widget _buildWalletBalanceCard(ThemeData theme, TextTheme textTheme) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15.0)),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(15.0),
          gradient: LinearGradient(
            colors: [theme.primaryColor.withOpacity(0.9), theme.primaryColor.withOpacity(0.7)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Available Balance',
              style: textTheme.titleMedium?.copyWith(color: Colors.white70),
            ),
            const SizedBox(height: 8.0),
            Text(
              '₹ ${_walletBalance.toStringAsFixed(2)}',
              style: textTheme.headlineMedium?.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
            const Divider(color: Colors.white54, height: 24.0),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Reward Points',
                  style: textTheme.titleSmall?.copyWith(color: Colors.white70),
                ),
                Text(
                  '$_rewardPoints pts',
                  style: textTheme.titleSmall?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWalletActionButtons(ThemeData theme) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: [
        _buildActionButton(theme, Icons.add_circle_outline, 'Add Money', () {}),
        _buildActionButton(theme, Icons.payments_outlined, 'Withdraw', () {}),
        _buildActionButton(theme, Icons.history, 'History', () {}),
      ],
    );
  }

  Widget _buildActionButton(ThemeData theme, IconData icon, String label, VoidCallback onPressed) {
    return Column(
      children: [
        ElevatedButton(
          onPressed: onPressed,
          style: ElevatedButton.styleFrom(
            shape: const CircleBorder(),
            padding: const EdgeInsets.all(15),
            backgroundColor: theme.primaryColor.withOpacity(0.1),
            foregroundColor: theme.primaryColor,
            elevation: 0,
          ),
          child: Icon(icon, size: 24),
        ),
        const SizedBox(height: 4),
        Text(label, style: theme.textTheme.labelSmall),
      ],
    );
  }

  Widget _buildRecentTransactions(ThemeData theme) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15.0)),
      child: ListView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: _transactions.length,
        itemBuilder: (context, index) {
          final transaction = _transactions[index];
          return ListTile(
            leading: Icon(transaction['icon'] as IconData, color: theme.primaryColor),
            title: Text(transaction['type'] as String),
            trailing: Text(
              '₹ ${transaction['amount']?.toStringAsFixed(2)}',
              style: TextStyle(
                color: (transaction['amount'] as double) > 0 ? Colors.green : Colors.red,
                fontWeight: FontWeight.bold,
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildRideSummaryCard(ThemeData theme, TextTheme textTheme) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15.0)),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Ride Summary',
              style: textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12.0),
            _buildSummaryRow(Icons.route, 'Total Distance', '${_totalDistance.toStringAsFixed(1)} km'),
            _buildSummaryRow(Icons.local_gas_station, 'Estimated Fuel Cost', '₹ ${_estimatedFuelCost.toStringAsFixed(2)}'),
            _buildSummaryRow(Icons.people, 'Number of Passengers', '$_numberOfPassengers'),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.grey[600]),
          const SizedBox(width: 12.0),
          Expanded(child: Text(label, style: Theme.of(context).textTheme.bodyMedium)),
          Text(value, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildSplitToggle(ThemeData theme, TextTheme textTheme) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15.0)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Split Type', style: textTheme.titleMedium),
            ToggleButtons(
              isSelected: [_isEqualSplit, !_isEqualSplit],
              onPressed: (index) {
                setState(() {
                  _isEqualSplit = index == 0;
                });
              },
              borderRadius: BorderRadius.circular(10.0),
              selectedColor: Colors.white,
              fillColor: theme.primaryColor,
              borderColor: theme.primaryColor,
              selectedBorderColor: theme.primaryColor,
              children: const [
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16.0),
                  child: Text('Equal Split'),
                ),
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16.0),
                  child: Text('Custom Split'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCostBreakdown(ThemeData theme, TextTheme textTheme, double perPersonCost) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15.0)),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Cost Breakdown',
              style: textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12.0),
            _buildBreakdownRow('Fuel Cost', '₹ ${_estimatedFuelCost.toStringAsFixed(2)}'),
            _buildBreakdownRow('Platform Fee', '₹ ${_platformFee.toStringAsFixed(2)}'),
            const Divider(),
            _buildBreakdownRow('Your Share', '₹ ${perPersonCost.toStringAsFixed(2)}', isTotal: true),
          ],
        ),
      ),
    );
  }

  Widget _buildBreakdownRow(String label, String value, {bool isTotal = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: isTotal
                ? Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)
                : Theme.of(context).textTheme.bodyMedium,
          ),
          Text(
            value,
            style: isTotal
                ? Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold, color: Theme.of(context).primaryColor)
                : Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoNote(TextTheme textTheme) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8.0),
      child: Text(
        'Cost is calculated transparently based on distance and fuel price.',
        style: textTheme.bodySmall?.copyWith(fontStyle: FontStyle.italic, color: Colors.grey[600]),
        textAlign: TextAlign.center,
      ),
    );
  }

  Widget _buildConfirmPayButton(ThemeData theme, bool isInsufficientBalance) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: isInsufficientBalance ? null : () {
          // Implement payment logic and success animation
          _showPaymentConfirmation(context, theme);
        },
        icon: const Icon(Icons.payment),
        label: Text(isInsufficientBalance ? 'Insufficient Balance' : 'Confirm & Pay'),
        style: ElevatedButton.styleFrom(
          backgroundColor: isInsufficientBalance ? Colors.grey : theme.primaryColor,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12.0)),
          padding: const EdgeInsets.symmetric(vertical: 16.0),
          textStyle: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
        ),
      ),
    );
  }

  void _showPaymentConfirmation(BuildContext context, ThemeData theme) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15.0)),
          title: Row(
            children: [
              Icon(Icons.check_circle, color: theme.primaryColor),
              const SizedBox(width: 10),
              const Text('Payment Confirmed!'),
            ],
          ),
          content: const Text('Your ride cost has been successfully paid.'),
          actions: <Widget>[
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
                // Optionally trigger a success animation or navigate
              },
              child: Text('OK', style: TextStyle(color: theme.primaryColor)),
            ),
          ],
        );
      },
    );
  }
}

import 'package:flutter/material.dart';
import '../screens/map_diagnostics_screen.dart';
import '../utils/android_map_diagnostics.dart';
import 'dart:io';
import 'package:flutter/foundation.dart';

/// Debug FAB for easy access to map diagnostics
class DebugFab extends StatefulWidget {
  final bool showDebugOptions;
  final VoidCallback? onToggleDebug;

  const DebugFab({
    super.key,
    this.showDebugOptions = false,
    this.onToggleDebug,
  });

  @override
  State<DebugFab> createState() => _DebugFabState();
}

class _DebugFabState extends State<DebugFab>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _animation;
  bool _isExpanded = false;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    _animation = CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeInOut,
    );
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  void _toggleExpansion() {
    setState(() {
      _isExpanded = !_isExpanded;
      if (_isExpanded) {
        _animationController.forward();
      } else {
        _animationController.reverse();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!kDebugMode && !widget.showDebugOptions) {
      return const SizedBox.shrink();
    }

    return Positioned(
      bottom: 16,
      right: 16,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          // Debug menu items
          AnimatedBuilder(
            animation: _animation,
            builder: (context, child) {
              return Transform.scale(
                scale: _animation.value,
                alignment: Alignment.bottomRight,
                child: Opacity(
                  opacity: _animation.value,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      _buildDebugMenuItem(
                        icon: Icons.analytics,
                        label: 'Full Diagnostics',
                        onTap: _openDiagnosticsScreen,
                        color: Colors.blue,
                      ),
                      const SizedBox(height: 8),
                      if (!kIsWeb && Platform.isAndroid) ...[
                        _buildDebugMenuItem(
                          icon: Icons.android,
                          label: 'Android Diagnostics',
                          onTap: _runAndroidDiagnostics,
                          color: Colors.green,
                        ),
                        const SizedBox(height: 8),
                      ],
                      _buildDebugMenuItem(
                        icon: Icons.speed,
                        label: 'Quick Test',
                        onTap: _runQuickTest,
                        color: Colors.orange,
                      ),
                      const SizedBox(height: 8),
                      _buildDebugMenuItem(
                        icon: Icons.network_check,
                        label: 'Network Test',
                        onTap: _runNetworkTest,
                        color: Colors.purple,
                      ),
                      const SizedBox(height: 16),
                    ],
                  ),
                ),
              );
            },
          ),
          // Main debug FAB
          FloatingActionButton(
            onPressed: _toggleExpansion,
            backgroundColor: _isExpanded ? Colors.red : Colors.grey[700],
            foregroundColor: Colors.white,
            child: AnimatedRotation(
              turns: _isExpanded ? 0.125 : 0.0,
              duration: const Duration(milliseconds: 300),
              child: Icon(_isExpanded ? Icons.close : Icons.bug_report),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDebugMenuItem({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    required Color color,
  }) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: Colors.black26,
                blurRadius: 4,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Text(
            label,
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.w500,
              fontSize: 12,
            ),
          ),
        ),
        const SizedBox(width: 8),
        FloatingActionButton.small(
          onPressed: onTap,
          backgroundColor: color,
          foregroundColor: Colors.white,
          heroTag: label,
          child: Icon(icon, size: 20),
        ),
      ],
    );
  }

  void _openDiagnosticsScreen() {
    _toggleExpansion();
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const MapDiagnosticsScreen(),
      ),
    );
  }

  void _runAndroidDiagnostics() async {
    _toggleExpansion();
    
    if (kIsWeb || !Platform.isAndroid) {
      _showSnackBar('Android diagnostics only available on Android devices');
      return;
    }

    _showSnackBar('Running Android diagnostics...');
    
    try {
      final report = await AndroidMapDiagnostics.runAndroidDiagnostics();
      
      if (!mounted) return;
      
      // Show results in a dialog
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: Row(
            children: [
              Icon(
                report.criticalIssues.isNotEmpty ? Icons.warning : Icons.check_circle,
                color: report.criticalIssues.isNotEmpty ? Colors.red : Colors.green,
              ),
              const SizedBox(width: 8),
              const Text('Android Diagnostics'),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('Device: ${report.manufacturer} ${report.model}'),
                Text('Android: ${report.androidVersion} (API ${report.androidSdkInt})'),
                const SizedBox(height: 12),
                Text(
                  report.issueSummary,
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: report.criticalIssues.isNotEmpty ? Colors.red : Colors.green,
                  ),
                ),
                if (report.issues.isNotEmpty || report.criticalIssues.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  const Text('Issues found:', style: TextStyle(fontWeight: FontWeight.bold)),
                  ...report.criticalIssues.map((issue) => Text('• $issue', style: const TextStyle(color: Colors.red))),
                  ...report.issues.take(5).map((issue) => Text('• $issue')),
                  if (report.issues.length > 5)
                    Text('... and ${report.issues.length - 5} more issues'),
                ],
                if (report.recommendations.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  const Text('Top Recommendations:', style: TextStyle(fontWeight: FontWeight.bold)),
                  ...report.recommendations.take(3).map((rec) => Text('• $rec')),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Close'),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                _openDiagnosticsScreen();
              },
              child: const Text('Full Report'),
            ),
          ],
        ),
      );
    } catch (e) {
      _showSnackBar('Error running Android diagnostics: $e');
    }
  }

  void _runQuickTest() async {
    _toggleExpansion();
    _showSnackBar('Running quick tile load test...');
    
    try {
      final stopwatch = Stopwatch()..start();
      
      // Test a single tile load
      final response = await HttpClient().getUrl(Uri.parse('https://tile.openstreetmap.org/15/16384/10922.png'))
          .then((request) => request.close())
          .timeout(const Duration(seconds: 10));
      
      stopwatch.stop();
      
      if (!mounted) return;
      
      final success = response.statusCode == 200;
      final time = stopwatch.elapsedMilliseconds;
      
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: Row(
            children: [
              Icon(
                success ? Icons.check_circle : Icons.error,
                color: success ? Colors.green : Colors.red,
              ),
              const SizedBox(width: 8),
              const Text('Quick Test Result'),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Status: ${success ? 'SUCCESS' : 'FAILED'}'),
              Text('Response Code: ${response.statusCode}'),
              Text('Load Time: ${time}ms'),
              const SizedBox(height: 8),
              Text(
                time < 1000
                    ? 'Excellent performance!'
                    : time < 3000
                        ? 'Good performance'
                        : time < 5000
                            ? 'Slow performance'
                            : 'Very slow performance',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: time < 1000
                      ? Colors.green
                      : time < 3000
                          ? Colors.blue
                          : time < 5000
                              ? Colors.orange
                              : Colors.red,
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Close'),
            ),
          ],
        ),
      );
    } catch (e) {
      _showSnackBar('Quick test failed: $e');
    }
  }

  void _runNetworkTest() async {
    _toggleExpansion();
    _showSnackBar('Testing network connectivity...');
    
    try {
      final results = <String, dynamic>{};
      
      // Test multiple endpoints
      final endpoints = [
        'https://www.google.com',
        'https://tile.openstreetmap.org',
        'https://1.1.1.1', // Cloudflare DNS
      ];
      
      for (final endpoint in endpoints) {
        final stopwatch = Stopwatch()..start();
        try {
          final client = HttpClient();
          client.connectionTimeout = const Duration(seconds: 5);
          
          final request = await client.getUrl(Uri.parse(endpoint));
          final response = await request.close();
          stopwatch.stop();
          
          results[endpoint] = {
            'success': true,
            'time': stopwatch.elapsedMilliseconds,
            'status': response.statusCode,
          };
        } catch (e) {
          stopwatch.stop();
          results[endpoint] = {
            'success': false,
            'time': stopwatch.elapsedMilliseconds,
            'error': e.toString(),
          };
        }
      }
      
      if (!mounted) return;
      
      final successful = results.values.where((r) => r['success'] == true).length;
      
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: Row(
            children: [
              Icon(
                successful == endpoints.length ? Icons.wifi : successful > 0 ? Icons.wifi_off : Icons.signal_wifi_off,
                color: successful == endpoints.length ? Colors.green : successful > 0 ? Colors.orange : Colors.red,
              ),
              const SizedBox(width: 8),
              const Text('Network Test Results'),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('$successful/${endpoints.length} endpoints reachable'),
                const SizedBox(height: 12),
                ...results.entries.map((entry) {
                  final result = entry.value;
                  final success = result['success'] as bool;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Row(
                      children: [
                        Icon(
                          success ? Icons.check : Icons.close,
                          color: success ? Colors.green : Colors.red,
                          size: 16,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            '${entry.key.split('/')[2]}: ${success ? '${result['time']}ms' : 'Failed'}',
                            style: const TextStyle(fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                  );
                }),
                if (successful < endpoints.length) ...[
                  const SizedBox(height: 8),
                  const Text(
                    'Network connectivity issues detected. Check your internet connection.',
                    style: TextStyle(color: Colors.red, fontSize: 12),
                  ),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Close'),
            ),
          ],
        ),
      );
    } catch (e) {
      _showSnackBar('Network test failed: $e');
    }
  }

  void _showSnackBar(String message) {
    if (!mounted) return;
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 2),
      ),
    );
  }
}
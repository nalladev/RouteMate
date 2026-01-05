import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../utils/map_diagnostics.dart';

class MapDiagnosticsScreen extends StatefulWidget {
  const MapDiagnosticsScreen({super.key});

  @override
  State<MapDiagnosticsScreen> createState() => _MapDiagnosticsScreenState();
}

class _MapDiagnosticsScreenState extends State<MapDiagnosticsScreen> {
  MapDiagnosticReport? _report;
  bool _isRunning = false;
  String _currentTest = '';

  @override
  void initState() {
    super.initState();
    _runDiagnostics();
  }

  Future<void> _runDiagnostics() async {
    setState(() {
      _isRunning = true;
      _currentTest = 'Initializing diagnostics...';
    });

    try {
      final report = await MapDiagnostics.runFullDiagnostics();
      setState(() {
        _report = report;
        _isRunning = false;
        _currentTest = '';
      });
    } catch (e) {
      setState(() {
        _isRunning = false;
        _currentTest = 'Error: $e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Map Diagnostics'),
        backgroundColor: Theme.of(context).colorScheme.primaryContainer,
        actions: [
          if (!_isRunning)
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: _runDiagnostics,
              tooltip: 'Run diagnostics again',
            ),
          IconButton(
            icon: const Icon(Icons.share),
            onPressed: _report != null ? _shareReport : null,
            tooltip: 'Share report',
          ),
        ],
      ),
      body: _isRunning ? _buildLoadingView() : _buildReportView(),
    );
  }

  Widget _buildLoadingView() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const CircularProgressIndicator(),
          const SizedBox(height: 24),
          Text(
            'Running Map Diagnostics...',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Text(
            _currentTest,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildReportView() {
    if (_report == null) {
      return const Center(
        child: Text('No diagnostic report available'),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSummaryCard(),
          const SizedBox(height: 16),
          if (_report!.issues.isNotEmpty) _buildIssuesCard(),
          if (_report!.recommendations.isNotEmpty) ...[
            const SizedBox(height: 16),
            _buildRecommendationsCard(),
          ],
          const SizedBox(height: 16),
          _buildDetailedResults(),
        ],
      ),
    );
  }

  Widget _buildSummaryCard() {
    final hasIssues = _report!.issues.isNotEmpty;
    
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  hasIssues ? Icons.warning : Icons.check_circle,
                  color: hasIssues ? Colors.orange : Colors.green,
                  size: 32,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        hasIssues ? 'Issues Detected' : 'All Systems Normal',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: hasIssues ? Colors.orange : Colors.green,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        hasIssues 
                          ? '${_report!.issues.length} issue(s) found'
                          : 'No performance issues detected',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildSummaryItem('Platform', _report!.platform),
                _buildSummaryItem('Test Time', '${_report!.totalDiagnosticTime}ms'),
                _buildSummaryItem('Debug Mode', _report!.isDebugMode ? 'Yes' : 'No'),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryItem(String label, String value) {
    return Column(
      children: [
        Text(
          value,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }

  Widget _buildIssuesCard() {
    return Card(
      color: Colors.orange.shade50,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.warning, color: Colors.orange.shade700),
                const SizedBox(width: 8),
                Text(
                  'Issues Found',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: Colors.orange.shade700,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ..._report!.issues.map((issue) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    Icons.error_outline,
                    size: 16,
                    color: Colors.orange.shade700,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      issue,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ),
                ],
              ),
            )),
          ],
        ),
      ),
    );
  }

  Widget _buildRecommendationsCard() {
    return Card(
      color: Colors.blue.shade50,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.lightbulb_outline, color: Colors.blue.shade700),
                const SizedBox(width: 8),
                Text(
                  'Recommendations',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: Colors.blue.shade700,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ..._report!.recommendations.map((recommendation) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    Icons.arrow_right,
                    size: 16,
                    color: Colors.blue.shade700,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      recommendation,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ),
                ],
              ),
            )),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailedResults() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Detailed Test Results',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        _buildNetworkTestsSection(),
        const SizedBox(height: 16),
        _buildDnsTestsSection(),
        const SizedBox(height: 16),
        _buildTileServerTestsSection(),
        const SizedBox(height: 16),
        _buildPerformanceSection(),
        if (_report!.androidHttpClientTest != null) ...[
          const SizedBox(height: 16),
          _buildAndroidTestsSection(),
        ],
      ],
    );
  }

  Widget _buildNetworkTestsSection() {
    return _buildTestSection(
      title: 'Network Connectivity Tests',
      icon: Icons.wifi,
      children: _report!.networkTests.map((test) => _buildTestItem(
        title: test.url.replaceAll('https://', '').replaceAll('http://', ''),
        success: test.success,
        details: test.success
          ? '${test.statusCode} • ${test.responseTime}ms'
          : test.error ?? 'Unknown error',
      )).toList(),
    );
  }

  Widget _buildDnsTestsSection() {
    return _buildTestSection(
      title: 'DNS Resolution Tests',
      icon: Icons.dns,
      children: _report!.dnsTests.map((test) => _buildTestItem(
        title: test.domain,
        success: test.success,
        details: test.success
          ? '${test.addresses.length} addresses • ${test.resolveTime}ms'
          : test.error ?? 'Unknown error',
      )).toList(),
    );
  }

  Widget _buildTileServerTestsSection() {
    final children = <Widget>[];
    
    _report!.tileServerTests.forEach((serverName, tests) {
      final successfulTests = tests.where((t) => t.success).length;
      final avgTime = tests.where((t) => t.success).isNotEmpty
        ? tests.where((t) => t.success)
            .map((t) => t.loadTime)
            .reduce((a, b) => a + b) / tests.where((t) => t.success).length
        : 0;
      
      children.add(_buildTestItem(
        title: serverName,
        success: successfulTests == tests.length,
        details: '$successfulTests/${tests.length} tiles loaded • ${avgTime.toInt()}ms avg',
      ));
      
      // Add individual tile results
      for (final test in tests) {
        children.add(Padding(
          padding: const EdgeInsets.only(left: 16),
          child: _buildTestItem(
            title: test.tileUrl.split('/').skip(test.tileUrl.split('/').length - 3).join('/'),
            success: test.success,
            details: test.success
              ? '${test.sizeBytes}B • ${test.loadTime}ms'
              : test.error ?? 'Failed',
            isSubItem: true,
          ),
        ));
      }
    });
    
    return _buildTestSection(
      title: 'Tile Server Performance',
      icon: Icons.map,
      children: children,
    );
  }

  Widget _buildPerformanceSection() {
    return _buildTestSection(
      title: 'Performance Metrics',
      icon: Icons.speed,
      children: [
        _buildTestItem(
          title: 'Memory Test',
          success: _report!.memoryTestAllocatedMB > 0,
          details: '${_report!.memoryTestAllocatedMB.toStringAsFixed(1)}MB allocated',
        ),
        _buildTestItem(
          title: 'Widget Build Performance',
          success: _report!.widgetBuildTestMs < 100,
          details: '${_report!.widgetBuildTestMs}ms for 1000 widgets',
        ),
      ],
    );
  }

  Widget _buildAndroidTestsSection() {
    final test = _report!.androidHttpClientTest!;
    
    return _buildTestSection(
      title: 'Android-Specific Tests',
      icon: Icons.android,
      children: [
        _buildTestItem(
          title: 'HTTP Client Test',
          success: test.success,
          details: test.success
            ? '${test.statusCode} • ${test.responseTime}ms • ${test.responseSize}B'
            : test.error ?? 'Unknown error',
        ),
      ],
    );
  }

  Widget _buildTestSection({
    required String title,
    required IconData icon,
    required List<Widget> children,
  }) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 20),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ...children,
          ],
        ),
      ),
    );
  }

  Widget _buildTestItem({
    required String title,
    required bool success,
    required String details,
    bool isSubItem = false,
  }) {
    return Padding(
      padding: EdgeInsets.only(bottom: 8, left: isSubItem ? 16 : 0),
      child: Row(
        children: [
          Icon(
            success ? Icons.check_circle : Icons.error,
            color: success ? Colors.green : Colors.red,
            size: isSubItem ? 16 : 20,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: isSubItem ? FontWeight.normal : FontWeight.w500,
                    fontSize: isSubItem ? 12 : null,
                  ),
                ),
                Text(
                  details,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                    fontSize: isSubItem ? 10 : null,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _shareReport() {
    if (_report == null) return;
    
    final buffer = StringBuffer();
    buffer.writeln('RouteMate Map Diagnostics Report');
    buffer.writeln('Generated: ${DateTime.now()}');
    buffer.writeln('Platform: ${_report!.platform}');
    buffer.writeln('Debug Mode: ${_report!.isDebugMode}');
    buffer.writeln('Test Duration: ${_report!.totalDiagnosticTime}ms');
    buffer.writeln();
    
    if (_report!.issues.isNotEmpty) {
      buffer.writeln('ISSUES FOUND:');
      for (final issue in _report!.issues) {
        buffer.writeln('- $issue');
      }
      buffer.writeln();
    }
    
    if (_report!.recommendations.isNotEmpty) {
      buffer.writeln('RECOMMENDATIONS:');
      for (final rec in _report!.recommendations) {
        buffer.writeln('- $rec');
      }
      buffer.writeln();
    }
    
    buffer.writeln('DETAILED RESULTS:');
    
    // Network tests
    buffer.writeln('Network Tests:');
    for (final test in _report!.networkTests) {
      buffer.writeln('  ${test.url}: ${test.success ? 'SUCCESS' : 'FAILED'} (${test.responseTime}ms)');
    }
    
    // DNS tests
    buffer.writeln('DNS Tests:');
    for (final test in _report!.dnsTests) {
      buffer.writeln('  ${test.domain}: ${test.success ? 'SUCCESS' : 'FAILED'} (${test.resolveTime}ms)');
    }
    
    // Tile server tests
    buffer.writeln('Tile Server Tests:');
    _report!.tileServerTests.forEach((server, tests) {
      final successful = tests.where((t) => t.success).length;
      buffer.writeln('  $server: $successful/${tests.length} tiles loaded');
    });
    
    Clipboard.setData(ClipboardData(text: buffer.toString()));
    
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Diagnostic report copied to clipboard'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}
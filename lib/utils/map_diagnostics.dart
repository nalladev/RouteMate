import 'dart:async';
import 'dart:io';
import 'dart:developer' as developer;
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

/// Comprehensive diagnostics tool for map loading performance analysis
class MapDiagnostics {
  static const String _logName = 'map_diagnostics';
  
  // Tile server configurations for testing
  static const List<Map<String, String>> _tileServers = [
    {
      'name': 'OpenStreetMap',
      'url': 'https://tile.openstreetmap.org/1/0/0.png',
      'template': 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
    },
    {
      'name': 'OpenStreetMap DE',
      'url': 'https://tile.openstreetmap.de/1/0/0.png',
      'template': 'https://tile.openstreetmap.de/{z}/{x}/{y}.png'
    },
    {
      'name': 'CartoDB Positron',
      'url': 'https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/1/0/0.png',
      'template': 'https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png'
    },
  ];

  /// Comprehensive diagnostic report
  static Future<MapDiagnosticReport> runFullDiagnostics() async {
    developer.log('Starting comprehensive map diagnostics...', name: _logName);
    
    final stopwatch = Stopwatch()..start();
    final report = MapDiagnosticReport();
    
    // Platform information
    report.platform = kIsWeb ? 'Web' : Platform.operatingSystem;
    report.isDebugMode = kDebugMode;
    
    // Network connectivity test
    await _testNetworkConnectivity(report);
    
    // DNS resolution test
    await _testDNSResolution(report);
    
    // Tile server performance test
    await _testTileServerPerformance(report);
    
    // Memory and performance metrics
    await _gatherPerformanceMetrics(report);
    
    // Android-specific diagnostics
    if (!kIsWeb && Platform.isAndroid) {
      await _androidSpecificDiagnostics(report);
    }
    
    stopwatch.stop();
    report.totalDiagnosticTime = stopwatch.elapsedMilliseconds;
    
    developer.log('Diagnostics completed in ${stopwatch.elapsedMilliseconds}ms', name: _logName);
    
    return report;
  }

  /// Test basic network connectivity
  static Future<void> _testNetworkConnectivity(MapDiagnosticReport report) async {
    developer.log('Testing network connectivity...', name: _logName);
    
    final connectivityTests = [
      'https://www.google.com',
      'https://www.openstreetmap.org',
      'https://httpbin.org/status/200',
    ];

    for (final url in connectivityTests) {
      final stopwatch = Stopwatch()..start();
      try {
        final response = await http.get(Uri.parse(url)).timeout(
          const Duration(seconds: 5),
        );
        stopwatch.stop();
        
        report.networkTests.add(NetworkTest(
          url: url,
          success: response.statusCode == 200,
          responseTime: stopwatch.elapsedMilliseconds,
          statusCode: response.statusCode,
        ));
        
        developer.log('$url: ${response.statusCode} (${stopwatch.elapsedMilliseconds}ms)', name: _logName);
      } catch (e) {
        stopwatch.stop();
        report.networkTests.add(NetworkTest(
          url: url,
          success: false,
          responseTime: stopwatch.elapsedMilliseconds,
          error: e.toString(),
        ));
        
        developer.log('$url: ERROR - $e', name: _logName, level: 900);
      }
    }
  }

  /// Test DNS resolution times
  static Future<void> _testDNSResolution(MapDiagnosticReport report) async {
    developer.log('Testing DNS resolution...', name: _logName);
    
    final domains = [
      'tile.openstreetmap.org',
      'tile.openstreetmap.de',
      'cartodb-basemaps-a.global.ssl.fastly.net',
    ];

    for (final domain in domains) {
      final stopwatch = Stopwatch()..start();
      try {
        final addresses = await InternetAddress.lookup(domain).timeout(
          const Duration(seconds: 5),
        );
        stopwatch.stop();
        
        report.dnsTests.add(DNSTest(
          domain: domain,
          success: addresses.isNotEmpty,
          resolveTime: stopwatch.elapsedMilliseconds,
          addresses: addresses.map((addr) => addr.address).toList(),
        ));
        
        developer.log('DNS $domain: ${addresses.length} addresses (${stopwatch.elapsedMilliseconds}ms)', name: _logName);
      } catch (e) {
        stopwatch.stop();
        report.dnsTests.add(DNSTest(
          domain: domain,
          success: false,
          resolveTime: stopwatch.elapsedMilliseconds,
          error: e.toString(),
        ));
        
        developer.log('DNS $domain: ERROR - $e', name: _logName, level: 900);
      }
    }
  }

  /// Test tile server performance
  static Future<void> _testTileServerPerformance(MapDiagnosticReport report) async {
    developer.log('Testing tile server performance...', name: _logName);
    
    for (final server in _tileServers) {
      final results = <TileLoadTest>[];
      
      // Test multiple tiles to get average performance
      final testTiles = [
        '1/0/0.png',
        '5/15/10.png',
        '10/512/341.png',
        '15/16384/10922.png', // High zoom level
      ];
      
      for (final tile in testTiles) {
        final url = server['url']!.replaceAll('1/0/0.png', tile);
        final stopwatch = Stopwatch()..start();
        
        try {
          final response = await http.get(Uri.parse(url)).timeout(
            const Duration(seconds: 10),
          );
          stopwatch.stop();
          
          results.add(TileLoadTest(
            tileUrl: url,
            success: response.statusCode == 200,
            loadTime: stopwatch.elapsedMilliseconds,
            sizeBytes: response.bodyBytes.length,
            statusCode: response.statusCode,
          ));
          
          developer.log('Tile $tile: ${response.statusCode} ${response.bodyBytes.length}B (${stopwatch.elapsedMilliseconds}ms)', name: _logName);
        } catch (e) {
          stopwatch.stop();
          results.add(TileLoadTest(
            tileUrl: url,
            success: false,
            loadTime: stopwatch.elapsedMilliseconds,
            error: e.toString(),
          ));
          
          developer.log('Tile $tile: ERROR - $e', name: _logName, level: 900);
        }
      }
      
      report.tileServerTests[server['name']!] = results;
    }
  }

  /// Gather performance metrics
  static Future<void> _gatherPerformanceMetrics(MapDiagnosticReport report) async {
    developer.log('Gathering performance metrics...', name: _logName);
    
    try {
      // Simulate memory pressure to see available memory
      final List<List<int>> memoryTest = [];
      final stopwatch = Stopwatch()..start();
      
      // Allocate memory in chunks to test available memory
      try {
        for (int i = 0; i < 100; i++) {
          memoryTest.add(List.filled(10000, i));
          if (stopwatch.elapsedMilliseconds > 100) break; // Don't spend too much time
        }
      } catch (e) {
        developer.log('Memory allocation test stopped: $e', name: _logName);
      }
      
      report.memoryTestAllocatedMB = (memoryTest.length * 10000 * 4) / (1024 * 1024); // Rough estimate
      memoryTest.clear(); // Clean up
      
      // Test widget tree build performance
      final buildStopwatch = Stopwatch()..start();
      for (int i = 0; i < 1000; i++) {
        // Simulate widget creation overhead
        Column(
          children: List.generate(10, (index) => Text('Test $index')),
        );
      }
      buildStopwatch.stop();
      report.widgetBuildTestMs = buildStopwatch.elapsedMilliseconds;
      
    } catch (e) {
      developer.log('Performance metrics error: $e', name: _logName, level: 900);
    }
  }

  /// Android-specific diagnostics
  static Future<void> _androidSpecificDiagnostics(MapDiagnosticReport report) async {
    developer.log('Running Android-specific diagnostics...', name: _logName);
    
    try {
      // Test HTTP client behavior on Android
      final client = http.Client();
      final stopwatch = Stopwatch()..start();
      
      final response = await client.get(
        Uri.parse('https://tile.openstreetmap.org/1/0/0.png'),
        headers: {
          'User-Agent': 'RouteMate-Android-Diagnostics/1.0',
          'Accept': 'image/png,image/*,*/*',
          'Accept-Encoding': 'gzip, deflate',
        },
      ).timeout(const Duration(seconds: 10));
      
      stopwatch.stop();
      client.close();
      
      report.androidHttpClientTest = AndroidHttpTest(
        success: response.statusCode == 200,
        responseTime: stopwatch.elapsedMilliseconds,
        statusCode: response.statusCode,
        responseSize: response.bodyBytes.length,
        headers: response.headers,
      );
      
      developer.log('Android HTTP client test: ${response.statusCode} (${stopwatch.elapsedMilliseconds}ms)', name: _logName);
    } catch (e) {
      report.androidHttpClientTest = AndroidHttpTest(
        success: false,
        error: e.toString(),
      );
      developer.log('Android HTTP client test error: $e', name: _logName, level: 900);
    }
  }

  /// Test single tile load with detailed timing
  static Future<TileLoadResult> testSingleTileLoad(String tileUrl) async {
    developer.log('Testing single tile: $tileUrl', name: _logName);
    
    final result = TileLoadResult();
    final totalStopwatch = Stopwatch()..start();
    
    try {
      // DNS resolution timing
      final dnsStopwatch = Stopwatch()..start();
      final uri = Uri.parse(tileUrl);
      await InternetAddress.lookup(uri.host);
      dnsStopwatch.stop();
      result.dnsTime = dnsStopwatch.elapsedMilliseconds;
      
      // HTTP request timing
      final httpStopwatch = Stopwatch()..start();
      final response = await http.get(uri).timeout(const Duration(seconds: 15));
      httpStopwatch.stop();
      
      result.httpTime = httpStopwatch.elapsedMilliseconds;
      result.statusCode = response.statusCode;
      result.sizeBytes = response.bodyBytes.length;
      result.success = response.statusCode == 200;
      
      // Response headers analysis
      result.responseHeaders = response.headers;
      result.hasCache = response.headers.containsKey('cache-control') || 
                       response.headers.containsKey('etag');
      
    } catch (e) {
      result.success = false;
      result.error = e.toString();
      developer.log('Single tile test error: $e', name: _logName, level: 900);
    }
    
    totalStopwatch.stop();
    result.totalTime = totalStopwatch.elapsedMilliseconds;
    
    return result;
  }

  /// Create a diagnostic widget for real-time monitoring
  static Widget createDiagnosticOverlay(VoidCallback onTap) {
    return Positioned(
      top: 100,
      right: 16,
      child: FloatingActionButton.small(
        onPressed: onTap,
        tooltip: 'Map Diagnostics',
        backgroundColor: Colors.orange.withValues(alpha: 0.8),
        child: const Icon(Icons.analytics, size: 20),
      ),
    );
  }
}

/// Comprehensive diagnostic report
class MapDiagnosticReport {
  String platform = '';
  bool isDebugMode = false;
  int totalDiagnosticTime = 0;
  
  List<NetworkTest> networkTests = [];
  List<DNSTest> dnsTests = [];
  Map<String, List<TileLoadTest>> tileServerTests = {};
  
  double memoryTestAllocatedMB = 0;
  int widgetBuildTestMs = 0;
  
  AndroidHttpTest? androidHttpClientTest;
  
  /// Get summary of issues found
  List<String> get issues {
    final issues = <String>[];
    
    // Check network connectivity issues
    final failedNetworkTests = networkTests.where((test) => !test.success);
    if (failedNetworkTests.isNotEmpty) {
      issues.add('Network connectivity issues: ${failedNetworkTests.length} failed tests');
    }
    
    // Check slow network
    final slowNetworkTests = networkTests.where((test) => test.responseTime > 2000);
    if (slowNetworkTests.isNotEmpty) {
      issues.add('Slow network detected: ${slowNetworkTests.length} tests >2s');
    }
    
    // Check DNS issues
    final failedDnsTests = dnsTests.where((test) => !test.success);
    if (failedDnsTests.isNotEmpty) {
      issues.add('DNS resolution issues: ${failedDnsTests.length} failed');
    }
    
    // Check slow DNS
    final slowDnsTests = dnsTests.where((test) => test.resolveTime > 1000);
    if (slowDnsTests.isNotEmpty) {
      issues.add('Slow DNS resolution: ${slowDnsTests.length} tests >1s');
    }
    
    // Check tile server performance
    for (final entry in tileServerTests.entries) {
      final failed = entry.value.where((test) => !test.success);
      if (failed.isNotEmpty) {
        issues.add('${entry.key} tile server issues: ${failed.length} failed');
      }
      
      final slow = entry.value.where((test) => test.loadTime > 3000);
      if (slow.isNotEmpty) {
        issues.add('${entry.key} slow tiles: ${slow.length} tiles >3s');
      }
    }
    
    // Check Android-specific issues
    if (androidHttpClientTest != null && !androidHttpClientTest!.success) {
      issues.add('Android HTTP client issues: ${androidHttpClientTest!.error}');
    }
    
    // Check performance issues
    if (widgetBuildTestMs > 100) {
      issues.add('Widget build performance: ${widgetBuildTestMs}ms (slow)');
    }
    
    return issues;
  }
  
  /// Get recommendations for fixing issues
  List<String> get recommendations {
    final recommendations = <String>[];
    
    if (issues.any((issue) => issue.contains('Network connectivity'))) {
      recommendations.add('Check internet connection and firewall settings');
    }
    
    if (issues.any((issue) => issue.contains('DNS resolution'))) {
      recommendations.add('Try different DNS servers (8.8.8.8, 1.1.1.1)');
      recommendations.add('Consider using IP addresses instead of domain names');
    }
    
    if (issues.any((issue) => issue.contains('tile server'))) {
      recommendations.add('Try alternative tile servers');
      recommendations.add('Implement tile caching to reduce server requests');
      recommendations.add('Use lower zoom levels for better performance');
    }
    
    if (platform == 'android' && issues.any((issue) => issue.contains('Android'))) {
      recommendations.add('Check Android network security config');
      recommendations.add('Verify HTTPS certificate handling');
      recommendations.add('Consider using OkHttp client instead of default');
    }
    
    if (issues.any((issue) => issue.contains('slow')) || issues.any((issue) => issue.contains('Widget build'))) {
      recommendations.add('Implement progressive loading with placeholder tiles');
      recommendations.add('Use flutter_map\'s loading builder for better UX');
      recommendations.add('Consider reducing initial zoom level');
      recommendations.add('Implement proper loading states and error handling');
    }
    
    return recommendations;
  }
}

/// Network connectivity test result
class NetworkTest {
  final String url;
  final bool success;
  final int responseTime;
  final int? statusCode;
  final String? error;
  
  NetworkTest({
    required this.url,
    required this.success,
    required this.responseTime,
    this.statusCode,
    this.error,
  });
}

/// DNS resolution test result
class DNSTest {
  final String domain;
  final bool success;
  final int resolveTime;
  final List<String> addresses;
  final String? error;
  
  DNSTest({
    required this.domain,
    required this.success,
    required this.resolveTime,
    this.addresses = const [],
    this.error,
  });
}

/// Tile loading test result
class TileLoadTest {
  final String tileUrl;
  final bool success;
  final int loadTime;
  final int? sizeBytes;
  final int? statusCode;
  final String? error;
  
  TileLoadTest({
    required this.tileUrl,
    required this.success,
    required this.loadTime,
    this.sizeBytes,
    this.statusCode,
    this.error,
  });
}

/// Android-specific HTTP test result
class AndroidHttpTest {
  final bool success;
  final int? responseTime;
  final int? statusCode;
  final int? responseSize;
  final Map<String, String>? headers;
  final String? error;
  
  AndroidHttpTest({
    required this.success,
    this.responseTime,
    this.statusCode,
    this.responseSize,
    this.headers,
    this.error,
  });
}

/// Detailed single tile load result
class TileLoadResult {
  bool success = false;
  int totalTime = 0;
  int dnsTime = 0;
  int httpTime = 0;
  int? statusCode;
  int? sizeBytes;
  Map<String, String> responseHeaders = {};
  bool hasCache = false;
  String? error;
  
  /// Get breakdown of timing
  String get timingBreakdown => 'DNS: ${dnsTime}ms, HTTP: ${httpTime}ms, Total: ${totalTime}ms';
}
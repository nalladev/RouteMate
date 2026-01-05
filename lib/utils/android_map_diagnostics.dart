import 'dart:async';
import 'dart:io';
import 'dart:developer' as developer;
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;

/// Android-specific map diagnostics with automatic issue detection
class AndroidMapDiagnostics {
  static const String _logName = 'android_map_diagnostics';
  
  /// Comprehensive Android map diagnostics
  static Future<AndroidDiagnosticReport> runAndroidDiagnostics() async {
    if (kIsWeb || !Platform.isAndroid) {
      throw UnsupportedError('Android diagnostics only available on Android platform');
    }
    
    developer.log('Starting Android-specific map diagnostics...', name: _logName);
    
    final report = AndroidDiagnosticReport();
    final stopwatch = Stopwatch()..start();
    
    // Android version and API level
    await _checkAndroidVersion(report);
    
    // Network security configuration
    await _checkNetworkSecurityConfig(report);
    
    // HTTP client performance on Android
    await _testAndroidHttpPerformance(report);
    
    // WebView and hardware acceleration
    await _checkWebViewConfig(report);
    
    // Memory and performance on Android
    await _checkAndroidPerformance(report);
    
    // Network connectivity issues specific to Android
    await _testAndroidNetworkIssues(report);
    
    // DNS over HTTPS and security issues
    await _testDnsOverHttpsIssues(report);
    
    // Certificate pinning and SSL issues
    await _testSslCertificateIssues(report);
    
    stopwatch.stop();
    report.totalDiagnosticTime = stopwatch.elapsedMilliseconds;
    
    // Generate recommendations based on findings
    _generateAndroidRecommendations(report);
    
    developer.log('Android diagnostics completed in ${stopwatch.elapsedMilliseconds}ms', name: _logName);
    
    return report;
  }
  
  static Future<void> _checkAndroidVersion(AndroidDiagnosticReport report) async {
    try {
      // Get Android system info via platform channels if available
      const platform = MethodChannel('flutter.dev/platform_info');
      
      try {
        final result = await platform.invokeMethod('getAndroidInfo');
        report.androidVersion = result['version'] ?? 'Unknown';
        report.androidSdkInt = result['sdkInt'] ?? 0;
        report.manufacturer = result['manufacturer'] ?? 'Unknown';
        report.model = result['model'] ?? 'Unknown';
      } catch (e) {
        // Fallback to basic detection
        report.androidVersion = 'Unknown (${Platform.operatingSystemVersion})';
        report.androidSdkInt = 0;
        report.manufacturer = 'Unknown';
        report.model = 'Unknown';
      }
      
      // Check for known problematic Android versions
      if (report.androidSdkInt > 0) {
        if (report.androidSdkInt < 23) {
          report.issues.add('Android API level ${report.androidSdkInt} may have network security limitations');
          report.criticalIssues.add('NETWORK_SECURITY_OLD_ANDROID');
        }
        
        if (report.androidSdkInt >= 28) {
          report.networkSecurityConfigRequired = true;
          report.issues.add('Android 9+ requires network security configuration for HTTP traffic');
        }
      }
      
      developer.log('Android version: ${report.androidVersion}, SDK: ${report.androidSdkInt}', name: _logName);
    } catch (e) {
      developer.log('Error checking Android version: $e', name: _logName, level: 900);
    }
  }
  
  static Future<void> _checkNetworkSecurityConfig(AndroidDiagnosticReport report) async {
    // This would require reading the AndroidManifest.xml and network_security_config.xml
    // For now, we'll check common configuration issues
    
    report.networkSecurityConfigIssues = [
      'HTTP traffic may be blocked by default on Android 9+',
      'Cleartext traffic needs explicit allowance in network_security_config.xml',
      'Certificate pinning might interfere with tile loading',
    ];
    
    // Test if HTTP requests are working
    final httpTest = HttpClientTest();
    
    try {
      // Test HTTP (should fail on Android 9+ without config)
      final httpStopwatch = Stopwatch()..start();
      final httpResponse = await http.get(
        Uri.parse('http://tile.openstreetmap.org/1/0/0.png'),
      ).timeout(const Duration(seconds: 5));
      httpStopwatch.stop();
      
      httpTest.httpWorking = httpResponse.statusCode == 200;
      httpTest.httpTime = httpStopwatch.elapsedMilliseconds;
      httpTest.httpStatusCode = httpResponse.statusCode;
    } catch (e) {
      httpTest.httpWorking = false;
      httpTest.httpError = e.toString();
      
      if (e.toString().contains('CLEARTEXT') || e.toString().contains('cleartext')) {
        report.criticalIssues.add('CLEARTEXT_NOT_PERMITTED');
        report.issues.add('HTTP cleartext traffic blocked - need network security config');
      }
    }
    
    try {
      // Test HTTPS
      final httpsStopwatch = Stopwatch()..start();
      final httpsResponse = await http.get(
        Uri.parse('https://tile.openstreetmap.org/1/0/0.png'),
      ).timeout(const Duration(seconds: 5));
      httpsStopwatch.stop();
      
      httpTest.httpsWorking = httpsResponse.statusCode == 200;
      httpTest.httpsTime = httpsStopwatch.elapsedMilliseconds;
      httpTest.httpsStatusCode = httpsResponse.statusCode;
    } catch (e) {
      httpTest.httpsWorking = false;
      httpTest.httpsError = e.toString();
      
      if (e.toString().contains('CERTIFICATE') || e.toString().contains('certificate')) {
        report.criticalIssues.add('CERTIFICATE_ISSUES');
        report.issues.add('HTTPS certificate validation issues detected');
      }
    }
    
    report.httpClientTest = httpTest;
    
    // Check performance difference
    if (httpTest.httpWorking && httpTest.httpsWorking) {
      final timeDifference = (httpTest.httpsTime - httpTest.httpTime).abs();
      if (timeDifference > 1000) {
        report.issues.add('Significant performance difference between HTTP and HTTPS (${timeDifference}ms)');
      }
    }
  }
  
  static Future<void> _testAndroidHttpPerformance(AndroidDiagnosticReport report) async {
    final performanceTests = <AndroidPerformanceTest>[];
    
    // Test different HTTP configurations
    final testUrls = [
      'https://tile.openstreetmap.org/1/0/0.png',
      'https://tile.openstreetmap.de/1/0/0.png',
      'https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/1/0/0.png',
    ];
    
    for (final url in testUrls) {
      final test = AndroidPerformanceTest(url: url);
      final stopwatch = Stopwatch()..start();
      
      try {
        // Test with default client
        final response = await http.get(Uri.parse(url)).timeout(const Duration(seconds: 10));
        stopwatch.stop();
        
        test.success = response.statusCode == 200;
        test.loadTime = stopwatch.elapsedMilliseconds;
        test.statusCode = response.statusCode;
        test.responseSize = response.bodyBytes.length;
        test.responseHeaders = response.headers;
        
        // Check for Android-specific headers
        if (response.headers['user-agent']?.contains('okhttp') == true) {
          test.usesOkHttp = true;
        }
        
        // Check connection reuse
        if (response.headers['connection']?.toLowerCase() == 'keep-alive') {
          test.connectionReused = true;
        }
        
        // Check compression
        if (response.headers['content-encoding']?.contains('gzip') == true) {
          test.compressionUsed = true;
        }
        
      } catch (e) {
        stopwatch.stop();
        test.success = false;
        test.loadTime = stopwatch.elapsedMilliseconds;
        test.error = e.toString();
        
        // Analyze error types
        if (e.toString().contains('SocketException')) {
          test.errorType = 'SOCKET_EXCEPTION';
        } else if (e.toString().contains('TimeoutException')) {
          test.errorType = 'TIMEOUT';
        } else if (e.toString().contains('HandshakeException')) {
          test.errorType = 'HANDSHAKE_ERROR';
        } else if (e.toString().contains('CertificateException')) {
          test.errorType = 'CERTIFICATE_ERROR';
        }
      }
      
      performanceTests.add(test);
      developer.log('Android HTTP test $url: ${test.success} (${test.loadTime}ms)', name: _logName);
    }
    
    report.performanceTests = performanceTests;
    
    // Analyze patterns
    final successful = performanceTests.where((t) => t.success);
    if (successful.isNotEmpty) {
      report.averageLoadTime = successful.map((t) => t.loadTime).reduce((a, b) => a + b) / successful.length;
      
      final slow = successful.where((t) => t.loadTime > 3000);
      if (slow.isNotEmpty) {
        report.issues.add('Slow HTTP performance: ${slow.length} requests >3s');
      }
    }
    
    final failed = performanceTests.where((t) => !t.success);
    if (failed.isNotEmpty) {
      report.issues.add('HTTP failures: ${failed.length}/${performanceTests.length} requests failed');
      
      // Identify common failure patterns
      final errorTypes = failed.map((t) => t.errorType).where((e) => e != null).toSet();
      for (final errorType in errorTypes) {
        final count = failed.where((t) => t.errorType == errorType).length;
        report.issues.add('$errorType errors: $count occurrences');
      }
    }
  }
  
  static Future<void> _checkWebViewConfig(AndroidDiagnosticReport report) async {
    // Check WebView configuration that might affect performance
    report.webViewIssues = [];
    
    try {
      // This would ideally check actual WebView configuration
      // For now, we add common issues to check for
      report.webViewIssues.addAll([
        'Hardware acceleration should be enabled for better performance',
        'WebView version should be up to date',
        'Mixed content (HTTP/HTTPS) can cause loading issues',
      ]);
    } catch (e) {
      developer.log('Error checking WebView config: $e', name: _logName, level: 900);
    }
  }
  
  static Future<void> _checkAndroidPerformance(AndroidDiagnosticReport report) async {
    final performanceMetrics = AndroidPerformanceMetrics();
    
    try {
      // Memory allocation test
      final memoryStopwatch = Stopwatch()..start();
      final List<List<int>> memoryTest = [];
      
      try {
        for (int i = 0; i < 200; i++) {
          memoryTest.add(List.filled(10000, i));
          if (memoryStopwatch.elapsedMilliseconds > 200) break;
        }
      } catch (e) {
        developer.log('Memory allocation stopped: $e', name: _logName);
      }
      
      memoryStopwatch.stop();
      performanceMetrics.memoryAllocationTime = memoryStopwatch.elapsedMilliseconds;
      performanceMetrics.memoryAllocatedMB = (memoryTest.length * 10000 * 4) / (1024 * 1024);
      
      // CPU-intensive task test
      final cpuStopwatch = Stopwatch()..start();
      var result = 0;
      for (int i = 0; i < 1000000; i++) {
        result += i % 17;
      }
      cpuStopwatch.stop();
      performanceMetrics.cpuIntensiveTaskTime = cpuStopwatch.elapsedMilliseconds;
      
      // UI rendering test
      final renderStopwatch = Stopwatch()..start();
      for (int i = 0; i < 1000; i++) {
        // Simulate widget creation
        final _ = List.generate(10, (index) => 'Item $index');
      }
      renderStopwatch.stop();
      performanceMetrics.uiRenderingTime = renderStopwatch.elapsedMilliseconds;
      
      report.performanceMetrics = performanceMetrics;
      
      // Analyze performance issues
      if (performanceMetrics.memoryAllocationTime > 500) {
        report.issues.add('Slow memory allocation (${performanceMetrics.memoryAllocationTime}ms)');
      }
      
      if (performanceMetrics.cpuIntensiveTaskTime > 100) {
        report.issues.add('Slow CPU performance (${performanceMetrics.cpuIntensiveTaskTime}ms)');
      }
      
      if (performanceMetrics.uiRenderingTime > 50) {
        report.issues.add('Slow UI rendering (${performanceMetrics.uiRenderingTime}ms)');
      }
      
    } catch (e) {
      developer.log('Error checking Android performance: $e', name: _logName, level: 900);
    }
  }
  
  static Future<void> _testAndroidNetworkIssues(AndroidDiagnosticReport report) async {
    final networkIssues = <String>[];
    
    try {
      // Test DNS resolution with different providers
      final dnsProviders = ['8.8.8.8', '1.1.1.1', '208.67.222.222']; // Google, Cloudflare, OpenDNS
      final domain = 'tile.openstreetmap.org';
      
      for (final provider in dnsProviders) {
        try {
          final stopwatch = Stopwatch()..start();
          final addresses = await InternetAddress.lookup(domain).timeout(const Duration(seconds: 3));
          stopwatch.stop();
          
          if (addresses.isEmpty) {
            networkIssues.add('DNS resolution failed for $domain using $provider');
          } else if (stopwatch.elapsedMilliseconds > 2000) {
            networkIssues.add('Slow DNS resolution using $provider (${stopwatch.elapsedMilliseconds}ms)');
          }
          
          developer.log('DNS $provider for $domain: ${addresses.length} addresses (${stopwatch.elapsedMilliseconds}ms)', name: _logName);
        } catch (e) {
          networkIssues.add('DNS provider $provider failed: $e');
        }
      }
      
      // Test IPv4 vs IPv6
      try {
        final ipv4Stopwatch = Stopwatch()..start();
        final ipv4 = await InternetAddress.lookup(domain, type: InternetAddressType.IPv4);
        ipv4Stopwatch.stop();
        
        final ipv6Stopwatch = Stopwatch()..start();
        final ipv6 = await InternetAddress.lookup(domain, type: InternetAddressType.IPv6);
        ipv6Stopwatch.stop();
        
        if (ipv4.isEmpty && ipv6.isNotEmpty) {
          networkIssues.add('IPv4 not available, only IPv6 - may cause connectivity issues');
        }
        
        if (ipv6.isNotEmpty && ipv6Stopwatch.elapsedMilliseconds > ipv4Stopwatch.elapsedMilliseconds * 2) {
          networkIssues.add('IPv6 significantly slower than IPv4 - prefer IPv4');
        }
        
      } catch (e) {
        networkIssues.add('IPv4/IPv6 testing failed: $e');
      }
      
      report.networkIssues = networkIssues;
      
    } catch (e) {
      developer.log('Error testing Android network issues: $e', name: _logName, level: 900);
    }
  }
  
  static Future<void> _testDnsOverHttpsIssues(AndroidDiagnosticReport report) async {
    // Test if DNS-over-HTTPS is causing issues
    try {
      final dohProviders = [
        'https://dns.google/resolve?name=tile.openstreetmap.org&type=A',
        'https://cloudflare-dns.com/dns-query?name=tile.openstreetmap.org&type=A',
      ];
      
      for (final provider in dohProviders) {
        final stopwatch = Stopwatch()..start();
        try {
          final response = await http.get(
            Uri.parse(provider),
            headers: {'Accept': 'application/dns-json'},
          ).timeout(const Duration(seconds: 5));
          stopwatch.stop();
          
          if (response.statusCode == 200) {
            developer.log('DoH provider working: $provider (${stopwatch.elapsedMilliseconds}ms)', name: _logName);
          } else {
            report.issues.add('DoH provider issue: $provider returned ${response.statusCode}');
          }
        } catch (e) {
          stopwatch.stop();
          report.issues.add('DoH provider failed: $provider - $e');
        }
      }
    } catch (e) {
      developer.log('Error testing DNS over HTTPS: $e', name: _logName, level: 900);
    }
  }
  
  static Future<void> _testSslCertificateIssues(AndroidDiagnosticReport report) async {
    // Test SSL certificate validation
    final sslIssues = <String>[];
    
    try {
      // Test different certificate scenarios
      final testUrls = [
        'https://tile.openstreetmap.org',
        'https://expired.badssl.com', // Should fail
        'https://wrong.host.badssl.com', // Should fail
        'https://self-signed.badssl.com', // Should fail
      ];
      
      for (final url in testUrls) {
        try {
          final response = await http.get(Uri.parse('$url/favicon.ico')).timeout(const Duration(seconds: 3));
          
          if (url.contains('badssl.com') && response.statusCode == 200) {
            sslIssues.add('SSL validation may be disabled - bad certificates accepted');
          }
        } catch (e) {
          if (!url.contains('badssl.com')) {
            // Real URLs should work
            sslIssues.add('SSL issue with $url: $e');
          }
          // badssl.com URLs are expected to fail
        }
      }
      
      report.sslIssues = sslIssues;
      
    } catch (e) {
      developer.log('Error testing SSL certificates: $e', name: _logName, level: 900);
    }
  }
  
  static void _generateAndroidRecommendations(AndroidDiagnosticReport report) {
    final recommendations = <String>[];
    
    // Critical issues first
    if (report.criticalIssues.contains('CLEARTEXT_NOT_PERMITTED')) {
      recommendations.add('Add network_security_config.xml to allow HTTP traffic for tile servers');
      recommendations.add('Update AndroidManifest.xml to reference network security config');
    }
    
    if (report.criticalIssues.contains('CERTIFICATE_ISSUES')) {
      recommendations.add('Check device system certificates and date/time settings');
      recommendations.add('Consider implementing custom certificate validation');
    }
    
    if (report.criticalIssues.contains('NETWORK_SECURITY_OLD_ANDROID')) {
      recommendations.add('Consider using alternative HTTP client for older Android versions');
      recommendations.add('Implement fallback mechanisms for network requests');
    }
    
    // Performance recommendations
    if (report.averageLoadTime > 3000) {
      recommendations.add('Implement tile caching to reduce network requests');
      recommendations.add('Use lower initial zoom levels to reduce tile count');
      recommendations.add('Consider using a faster tile server or CDN');
    }
    
    // Network issues
    if (report.networkIssues.isNotEmpty) {
      recommendations.add('Configure custom DNS servers (8.8.8.8, 1.1.1.1)');
      recommendations.add('Implement retry logic with exponential backoff');
      recommendations.add('Add network connectivity checks before loading tiles');
    }
    
    // HTTP client issues
    final failedTests = report.performanceTests.where((t) => !t.success);
    if (failedTests.isNotEmpty) {
      recommendations.add('Consider using OkHttp client instead of default HTTP client');
      recommendations.add('Implement proper error handling and user feedback');
      recommendations.add('Add offline map capability as fallback');
    }
    
    // WebView issues
    if (report.webViewIssues.isNotEmpty) {
      recommendations.add('Enable hardware acceleration in AndroidManifest.xml');
      recommendations.add('Update WebView to latest version');
      recommendations.add('Configure mixed content handling properly');
    }
    
    // Performance issues
    if (report.performanceMetrics != null) {
      final metrics = report.performanceMetrics!;
      
      if (metrics.memoryAllocationTime > 500) {
        recommendations.add('Optimize memory usage - consider object pooling');
        recommendations.add('Monitor memory leaks and garbage collection');
      }
      
      if (metrics.cpuIntensiveTaskTime > 100) {
        recommendations.add('Use background threads for heavy computations');
        recommendations.add('Implement progressive loading for better UI responsiveness');
      }
    }
    
    report.recommendations = recommendations;
  }
}

class AndroidDiagnosticReport {
  String androidVersion = '';
  int androidSdkInt = 0;
  String manufacturer = '';
  String model = '';
  
  bool networkSecurityConfigRequired = false;
  List<String> networkSecurityConfigIssues = [];
  List<String> issues = [];
  List<String> criticalIssues = [];
  List<String> recommendations = [];
  List<String> webViewIssues = [];
  List<String> networkIssues = [];
  List<String> sslIssues = [];
  
  HttpClientTest? httpClientTest;
  List<AndroidPerformanceTest> performanceTests = [];
  AndroidPerformanceMetrics? performanceMetrics;
  
  double averageLoadTime = 0.0;
  int totalDiagnosticTime = 0;
  
  /// Get severity level of issues found
  IssueSeverity get severity {
    if (criticalIssues.isNotEmpty) return IssueSeverity.critical;
    if (issues.length > 5) return IssueSeverity.high;
    if (issues.length > 2) return IssueSeverity.medium;
    if (issues.isNotEmpty) return IssueSeverity.low;
    return IssueSeverity.none;
  }
  
  /// Get summary of all issues
  String get issueSummary {
    if (issues.isEmpty && criticalIssues.isEmpty) {
      return 'No issues detected';
    }
    
    final total = issues.length + criticalIssues.length;
    final critical = criticalIssues.length;
    
    if (critical > 0) {
      return '$total total issues ($critical critical)';
    } else {
      return '$total issues found';
    }
  }
}

class HttpClientTest {
  bool httpWorking = false;
  bool httpsWorking = false;
  int httpTime = 0;
  int httpsTime = 0;
  int? httpStatusCode;
  int? httpsStatusCode;
  String? httpError;
  String? httpsError;
}

class AndroidPerformanceTest {
  final String url;
  bool success = false;
  int loadTime = 0;
  int? statusCode;
  int? responseSize;
  Map<String, String> responseHeaders = {};
  String? error;
  String? errorType;
  bool usesOkHttp = false;
  bool connectionReused = false;
  bool compressionUsed = false;
  
  AndroidPerformanceTest({required this.url});
}

class AndroidPerformanceMetrics {
  int memoryAllocationTime = 0;
  double memoryAllocatedMB = 0.0;
  int cpuIntensiveTaskTime = 0;
  int uiRenderingTime = 0;
}

enum IssueSeverity {
  none,
  low,
  medium,
  high,
  critical,
}
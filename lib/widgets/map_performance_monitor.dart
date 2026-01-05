import 'dart:async';
import 'dart:developer' as developer;
import 'package:flutter/material.dart';

import '../utils/map_diagnostics.dart';

/// Real-time performance monitor widget for map loading
class MapPerformanceMonitor extends StatefulWidget {
  final bool isMapLoaded;
  final VoidCallback? onDiagnosticsTap;
  final bool showOverlay;

  const MapPerformanceMonitor({
    super.key,
    required this.isMapLoaded,
    this.onDiagnosticsTap,
    this.showOverlay = true,
  });

  @override
  State<MapPerformanceMonitor> createState() => _MapPerformanceMonitorState();
}

class _MapPerformanceMonitorState extends State<MapPerformanceMonitor> {
  Timer? _monitoringTimer;
  bool _isMonitoring = false;
  MapLoadStatus _currentStatus = MapLoadStatus.initializing;
  String _statusMessage = 'Initializing...';
  int _tilesLoaded = 0;
  int _tilesTotal = 0;
  double _averageLoadTime = 0.0;
  final Stopwatch _mapLoadStopwatch = Stopwatch();

  @override
  void initState() {
    super.initState();
    _startMonitoring();
  }

  @override
  void didUpdateWidget(MapPerformanceMonitor oldWidget) {
    super.didUpdateWidget(oldWidget);
    
    if (!oldWidget.isMapLoaded && widget.isMapLoaded) {
      _onMapLoaded();
    } else if (oldWidget.isMapLoaded && !widget.isMapLoaded) {
      _onMapUnloaded();
    }
  }

  @override
  void dispose() {
    _monitoringTimer?.cancel();
    super.dispose();
  }

  void _startMonitoring() {
    if (_isMonitoring) return;
    
    _isMonitoring = true;
    _mapLoadStopwatch.start();
    _currentStatus = MapLoadStatus.loading;
    _statusMessage = 'Loading map tiles...';
    
    developer.log('Starting map performance monitoring', name: 'map_performance');
    
    // Start periodic monitoring
    _monitoringTimer = Timer.periodic(const Duration(milliseconds: 500), (timer) {
      _checkMapStatus();
    });
    
    // Start tile loading simulation/monitoring
    _simulateTileLoading();
  }

  void _checkMapStatus() {
    if (!mounted) return;
    
    setState(() {
      if (widget.isMapLoaded) {
        if (_currentStatus != MapLoadStatus.loaded) {
          _onMapLoaded();
        }
      } else {
        final elapsed = _mapLoadStopwatch.elapsedMilliseconds;
        
        if (elapsed > 15000) {
          _currentStatus = MapLoadStatus.timeout;
          _statusMessage = 'Map loading timeout (${elapsed}ms)';
        } else if (elapsed > 8000) {
          _currentStatus = MapLoadStatus.slow;
          _statusMessage = 'Map loading slowly (${elapsed}ms)...';
        }
      }
    });
  }

  void _onMapLoaded() {
    _mapLoadStopwatch.stop();
    final loadTime = _mapLoadStopwatch.elapsedMilliseconds;
    
    setState(() {
      _currentStatus = MapLoadStatus.loaded;
      _statusMessage = 'Map loaded successfully (${loadTime}ms)';
    });
    
    developer.log('Map loaded in ${loadTime}ms', name: 'map_performance');
    
    // Stop monitoring after successful load
    Timer(const Duration(seconds: 3), () {
      if (mounted) {
        setState(() {
          _isMonitoring = false;
        });
        _monitoringTimer?.cancel();
      }
    });
  }

  void _onMapUnloaded() {
    _mapLoadStopwatch.reset();
    setState(() {
      _currentStatus = MapLoadStatus.initializing;
      _statusMessage = 'Map unloaded';
      _tilesLoaded = 0;
      _tilesTotal = 0;
      _averageLoadTime = 0.0;
    });
  }

  void _simulateTileLoading() {
    // Simulate tile loading progress based on typical zoom levels
    const zoomLevel = 15; // Typical initial zoom
    final expectedTiles = _calculateExpectedTiles(zoomLevel);
    
    setState(() {
      _tilesTotal = expectedTiles;
    });
    
    // Simulate progressive tile loading
    Timer.periodic(const Duration(milliseconds: 100), (timer) {
      if (!_isMonitoring || widget.isMapLoaded) {
        timer.cancel();
        return;
      }
      
      setState(() {
        if (_tilesLoaded < _tilesTotal) {
          _tilesLoaded++;
          _averageLoadTime = _mapLoadStopwatch.elapsedMilliseconds / _tilesLoaded;
        }
      });
      
      if (_tilesLoaded >= _tilesTotal) {
        timer.cancel();
      }
    });
  }

  int _calculateExpectedTiles(int zoomLevel) {
    // Rough estimate of visible tiles for a mobile screen
    // at given zoom level (assumes ~800x600 viewport)
    const tileSize = 256;
    const screenWidth = 800;
    const screenHeight = 600;
    
    final tilesX = (screenWidth / tileSize).ceil() + 1; // +1 for partial tiles
    final tilesY = (screenHeight / tileSize).ceil() + 1;
    
    return tilesX * tilesY;
  }

  Future<void> _runQuickDiagnostic() async {
    setState(() {
      _statusMessage = 'Running quick diagnostic...';
    });
    
    try {
      // Test a single tile load
      const testTileUrl = 'https://tile.openstreetmap.org/15/16384/10922.png';
      final result = await MapDiagnostics.testSingleTileLoad(testTileUrl);
      
      setState(() {
        if (result.success) {
          _statusMessage = 'Quick test: ${result.totalTime}ms (DNS: ${result.dnsTime}ms, HTTP: ${result.httpTime}ms)';
        } else {
          _statusMessage = 'Quick test failed: ${result.error}';
        }
      });
      
      // Auto-hide after a few seconds
      Timer(const Duration(seconds: 4), () {
        if (mounted && _currentStatus == MapLoadStatus.loaded) {
          setState(() {
            _statusMessage = 'Tap for full diagnostics';
          });
        }
      });
    } catch (e) {
      setState(() {
        _statusMessage = 'Quick test error: $e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.showOverlay || (!_isMonitoring && _currentStatus == MapLoadStatus.loaded && _mapLoadStopwatch.elapsedMilliseconds > 3000)) {
      return const SizedBox.shrink();
    }

    return Positioned(
      top: 16,
      left: 16,
      right: 16,
      child: Card(
        elevation: 8,
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            gradient: LinearGradient(
              colors: [
                _getStatusColor().withValues(alpha: 0.1),
                _getStatusColor().withValues(alpha: 0.05),
              ],
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  _buildStatusIcon(),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _getStatusTitle(),
                          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: _getStatusColor(),
                          ),
                        ),
                        Text(
                          _statusMessage,
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                  _buildActionButtons(),
                ],
              ),
              if (_isMonitoring && _tilesTotal > 0) ...[
                const SizedBox(height: 8),
                _buildProgressIndicator(),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusIcon() {
    switch (_currentStatus) {
      case MapLoadStatus.initializing:
      case MapLoadStatus.loading:
        return SizedBox(
          width: 16,
          height: 16,
          child: CircularProgressIndicator(
            strokeWidth: 2,
            valueColor: AlwaysStoppedAnimation<Color>(_getStatusColor()),
          ),
        );
      case MapLoadStatus.loaded:
        return Icon(Icons.check_circle, color: _getStatusColor(), size: 16);
      case MapLoadStatus.slow:
        return Icon(Icons.hourglass_empty, color: _getStatusColor(), size: 16);
      case MapLoadStatus.timeout:
        return Icon(Icons.error, color: _getStatusColor(), size: 16);
    }
  }

  Widget _buildActionButtons() {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (_currentStatus == MapLoadStatus.loaded)
          IconButton(
            icon: const Icon(Icons.speed, size: 16),
            onPressed: _runQuickDiagnostic,
            tooltip: 'Quick performance test',
            constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
          ),
        IconButton(
          icon: const Icon(Icons.analytics, size: 16),
          onPressed: widget.onDiagnosticsTap,
          tooltip: 'Full diagnostics',
          constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
        ),
        IconButton(
          icon: const Icon(Icons.close, size: 14),
          onPressed: () {
            setState(() {
              _isMonitoring = false;
            });
          },
          tooltip: 'Hide monitor',
          constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
        ),
      ],
    );
  }

  Widget _buildProgressIndicator() {
    final progress = _tilesTotal > 0 ? _tilesLoaded / _tilesTotal : 0.0;
    
    return Column(
      children: [
        LinearProgressIndicator(
          value: progress,
          backgroundColor: Colors.grey[300],
          valueColor: AlwaysStoppedAnimation<Color>(_getStatusColor()),
        ),
        const SizedBox(height: 4),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Tiles: $_tilesLoaded/$_tilesTotal',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            if (_averageLoadTime > 0)
              Text(
                'Avg: ${_averageLoadTime.toInt()}ms',
                style: Theme.of(context).textTheme.bodySmall,
              ),
          ],
        ),
      ],
    );
  }

  Color _getStatusColor() {
    switch (_currentStatus) {
      case MapLoadStatus.initializing:
      case MapLoadStatus.loading:
        return Colors.blue;
      case MapLoadStatus.loaded:
        return Colors.green;
      case MapLoadStatus.slow:
        return Colors.orange;
      case MapLoadStatus.timeout:
        return Colors.red;
    }
  }

  String _getStatusTitle() {
    switch (_currentStatus) {
      case MapLoadStatus.initializing:
        return 'Initializing Map';
      case MapLoadStatus.loading:
        return 'Loading Map';
      case MapLoadStatus.loaded:
        return 'Map Ready';
      case MapLoadStatus.slow:
        return 'Loading Slowly';
      case MapLoadStatus.timeout:
        return 'Loading Timeout';
    }
  }
}

enum MapLoadStatus {
  initializing,
  loading,
  loaded,
  slow,
  timeout,
}

class TileLoadMetric {
  final String tileUrl;
  final int loadTime;
  final bool success;
  final DateTime timestamp;

  TileLoadMetric({
    required this.tileUrl,
    required this.loadTime,
    required this.success,
    required this.timestamp,
  });
}
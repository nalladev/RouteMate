import 'dart:math' show pi;
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';

class RotationAwareMarker extends StatelessWidget {
  final Widget? child;
  final MapController mapController;
  final Color? color;
  final double size;
  final IconData icon;

  const RotationAwareMarker({
    super.key,
    required this.mapController,
    this.color,
    this.size = 45,
    this.icon = Icons.location_on,
    this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Transform.rotate(
      angle: -mapController.camera.rotation * (pi / 180),
      child: child ??
          Icon(
            icon,
            color: color ?? Colors.red.shade800,
            size: size,
          ),
    );
  }
}
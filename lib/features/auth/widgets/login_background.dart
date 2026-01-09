import 'dart:ui';
import 'package:flutter/material.dart';

class LoginBackground extends StatelessWidget {
  final Widget child;

  const LoginBackground({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // The custom background painter
        CustomPaint(
          size: Size.infinite,
          painter: _BackgroundPainter(),
        ),
        // The content to be displayed on top of the background
        child,
      ],
    );
  }
}

class _BackgroundPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    // --- 1. Define Paints and Shaders ---
    final gradient = LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: [Colors.orange.shade800, Colors.orange.shade500],
      stops: const [0.0, 0.7],
    );

    final paint = Paint()
      ..shader = gradient.createShader(Rect.fromLTWH(0, 0, size.width, size.height * 0.6));

    // --- 2. Draw the Main Background Shape ---
    final path = Path();
    path.moveTo(0, 0);
    path.lineTo(0, size.height * 0.45);
    path.quadraticBezierTo(
      size.width * 0.25,
      size.height * 0.55,
      size.width * 0.5,
      size.height * 0.45,
    );
    path.quadraticBezierTo(
      size.width * 0.75,
      size.height * 0.35,
      size.width,
      size.height * 0.45,
    );
    path.lineTo(size.width, 0);
    path.close();
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

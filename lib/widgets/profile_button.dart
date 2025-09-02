import 'package:flutter/material.dart';

class ProfileButton extends StatelessWidget {
  final VoidCallback onPressed;

  const ProfileButton({super.key, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: 50,
      right: 16,
      child: FloatingActionButton(
        onPressed: onPressed,
        mini: true,
        backgroundColor: Colors.white,
        child: const Icon(Icons.person),
      ),
    );
  }
}
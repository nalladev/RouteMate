
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:routemate/services/auth_service.dart';

class RoleSelectionScreen extends StatefulWidget {
  const RoleSelectionScreen({Key? key}) : super(key: key);

  @override
  _RoleSelectionScreenState createState() => _RoleSelectionScreenState();
}

class _RoleSelectionScreenState extends State<RoleSelectionScreen> {
  // Stores the selected role. Can be 'driver' or 'passenger'.
  String? _selectedRole;
  bool _isLoading = false;

  void _selectRole(String role) {
    setState(() {
      _selectedRole = role;
    });
  }

  Future<void> _onContinue() async {
    if (_selectedRole == null) {
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      
      // Calls the AuthService to set the user's role via an API call.
      await authService.setRole(_selectedRole!);

      // On success, navigate to the HomePage.
      // The AuthGate will handle showing the correct screen based on the role.
       if (mounted) {
        Navigator.of(context).pushReplacementNamed('/home');
      }

    } catch (e) {
      // Handle errors, e.g., show a snackbar
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to set role: ${e.toString()}')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Select Your Role'),
        centerTitle: true,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _RoleCard(
              role: 'passenger',
              icon: Icons.person,
              isSelected: _selectedRole == 'passenger',
              onTap: () => _selectRole('passenger'),
            ),
            const SizedBox(height: 20),
            _RoleCard(
              role: 'driver',
              icon: Icons.drive_eta,
              isSelected: _selectedRole == 'driver',
              onTap: () => _selectRole('driver'),
            ),
            const SizedBox(height: 40),
            ElevatedButton(
              // Button is disabled until a role is selected.
              onPressed: _selectedRole == null || _isLoading ? null : _onContinue,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                textStyle: const TextStyle(fontSize: 18),
              ),
              child: _isLoading
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Text('Continue'),
            ),
          ],
        ),
      ),
    );
  }
}

class _RoleCard extends StatelessWidget {
  final String role;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  const _RoleCard({
    required this.role,
    required this.icon,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return GestureDetector(
      onTap: onTap,
      child: Card(
        elevation: isSelected ? 8 : 2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(15),
          side: BorderSide(
            color: isSelected ? theme.primaryColor : Colors.transparent,
            width: 2,
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            children: [
              Icon(icon, size: 60, color: isSelected ? theme.primaryColor : null),
              const SizedBox(height: 10),
              Text(
                role.toUpperCase(),
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: isSelected ? theme.primaryColor : null,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Sample Widget Tree for RoleSelectionScreen:
/// 
/// RoleSelectionScreen
/// └── Scaffold
///     ├── AppBar
///     └── Padding
///         └── Column
///             ├── _RoleCard (Passenger)
///             │   └── GestureDetector
///             │       └── Card
///             │           └── Padding
///             │               └── Column
///             │                   ├── Icon
///             │                   └── Text
///             ├── SizedBox
///             ├── _RoleCard (Driver)
///             │   └── GestureDetector
///             │       └── Card
///             │           └── Padding
///             │               └── Column
///             │                   ├── Icon
///             │                   └── Text
///             ├── SizedBox
///             └── ElevatedButton (Continue)
///                 └── Text or CircularProgressIndicator


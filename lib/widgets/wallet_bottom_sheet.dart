import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/user_model.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

enum UserRole { passenger, driver }

class WalletBottomSheet extends StatefulWidget {
  final UserModel? currentUser;
  final int walletPoints;

  const WalletBottomSheet({
    super.key,
    required this.currentUser,
    required this.walletPoints,
  });

  @override
  State<WalletBottomSheet> createState() => _WalletBottomSheetState();
}

class _WalletBottomSheetState extends State<WalletBottomSheet> {
  late ApiService _apiService;
  late AuthService _authService;
  
  Set<UserRole> _selectedRole = {UserRole.passenger};
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _apiService = Provider.of<ApiService>(context, listen: false);
    _authService = Provider.of<AuthService>(context, listen: false);
    
    final currentRole = _authService.currentUserRole;
    setState(() {
      _selectedRole = {
        if (currentRole == 'driver') UserRole.driver else UserRole.passenger
      };
    });
  }

  Future<void> _handleRoleChange(Set<UserRole> newRole) async {
    if (newRole.isEmpty) return;

    final role = newRole.first;
    if (_selectedRole.first == role) return; // No change

    setState(() {
      _isLoading = true;
    });

    try {
      final newToken = await _apiService.setRole(
        role == UserRole.driver ? 'DRIVER' : 'PASSENGER',
      );
      await _authService.updateTokenAndRole(newToken);
      
      if (mounted) {
        setState(() {
          _selectedRole = newRole;
        });

        ScaffoldMessenger.of(context).showSnackBar(
           SnackBar(content: Text('Role switched to ${role.name}')),
        );
        Navigator.pop(context); // Close bottom sheet on success
      }

    } on ApiException catch (e) {
      if (mounted) {
         ScaffoldMessenger.of(context).showSnackBar(
           SnackBar(content: Text('Error: ${e.message}')),
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
    return Stack(
      children: [
        Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Profile & Wallet',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              if (widget.currentUser != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.grey[200],
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('User ID',
                          style: TextStyle(color: Colors.black54)),
                      Text(
                        widget.currentUser!.uid,
                        style: const TextStyle(
                            fontFamily: 'monospace', fontSize: 12),
                      ),
                    ],
                  ),
                ),
              const SizedBox(height: 24),
              const Text(
                'Active Role',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: SegmentedButton<UserRole>(
                  segments: const <ButtonSegment<UserRole>>[
                    ButtonSegment<UserRole>(
                        value: UserRole.passenger,
                        label: Text('Passenger'),
                        icon: Icon(Icons.person)),
                    ButtonSegment<UserRole>(
                        value: UserRole.driver,
                        label: Text('Driver'),
                        icon: Icon(Icons.drive_eta)),
                  ],
                  selected: _selectedRole,
                  onSelectionChanged: _handleRoleChange,
                  style: SegmentedButton.styleFrom(
                    backgroundColor: Colors.grey[200],
                    foregroundColor: Colors.black54,
                    selectedForegroundColor: Colors.white,
                    selectedBackgroundColor: Colors.black87,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 20),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF7ED),
                  border: Border.all(color: const Color(0xFFFED7AA)),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  children: [
                    const Text(
                      'YOUR BALANCE',
                      style: TextStyle(
                          color: Color(0xFF9A3412),
                          fontWeight: FontWeight.bold),
                    ),
                    Text(
                      '${widget.walletPoints} pts',
                      style: const TextStyle(
                          fontSize: 36,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFFC2410C)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 50),
                  backgroundColor: Colors.grey[300],
                  foregroundColor: Colors.black87,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text('Close'),
              ),
            ],
          ),
        ),
        if (_isLoading)
          Container(
            color: Colors.black.withOpacity(0.5),
            child: const Center(
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
              ),
            ),
          ),
      ],
    );
  }
}
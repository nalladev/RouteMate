import 'package:flutter/material.dart';
import 'package:routemate/models/driver.dart';
import 'package:routemate/models/ride_request.dart';
import '../utils/app_state.dart';
import '../widgets/available_riders_list.dart';

/// Draggable bottom sheet that shows available drivers or passengers
class RiderConnectionPanel extends StatelessWidget {
  final AppState appState;
  final List<Driver> availableDrivers;
  final List<RideRequest> availableRequests;
  final VoidCallback onRefresh;
  final Function(Driver)? onDriverSelected;
  final Function(RideRequest)? onRequestSelected;

  const RiderConnectionPanel({
    super.key,
    required this.appState,
    required this.availableDrivers,
    required this.availableRequests,
    required this.onRefresh,
    this.onDriverSelected,
    this.onRequestSelected,
  });

  @override
  Widget build(BuildContext context) {
    // Only show the panel when actively searching or driving
    if (appState != AppState.searching && appState != AppState.driving) {
      return const SizedBox.shrink();
    }

    return DraggableScrollableSheet(
      initialChildSize: 0.35,
      minChildSize: 0.15,
      maxChildSize: 0.85,
      builder: (context, scrollController) {
        return Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.1),
                blurRadius: 10,
                offset: const Offset(0, -2),
              ),
            ],
          ),
          child: Column(
            children: [
              // Handle bar
              Container(
                margin: const EdgeInsets.symmetric(vertical: 12),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              // Content based on state
              Expanded(
                child: appState == AppState.searching
                    ? AvailableDriversList(
                        drivers: availableDrivers,
                        onRefresh: onRefresh,
                        onDriverSelected: onDriverSelected,
                      )
                    : AvailablePassengersList(
                        requests: availableRequests,
                        onRefresh: onRefresh,
                        onRequestSelected: onRequestSelected,
                      ),
              ),
            ],
          ),
        );
      },
    );
  }
}

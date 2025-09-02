import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

import '../models/place_suggestion.dart';
import '../utils/app_state.dart';

class ControlPanel extends StatelessWidget {
  final AppState appState;
  final TextEditingController destinationController;
  final bool isSearching;
  final List<PlaceSuggestion> suggestions;
  final List<DocumentSnapshot> availableDrivers;
  final Function(String) onSearchChanged;
  final Function(PlaceSuggestion) onSuggestionSelected;
  final VoidCallback onStartDriving;
  final VoidCallback onFindRide;
  final VoidCallback onReset;

  const ControlPanel({
    super.key,
    required this.appState,
    required this.destinationController,
    required this.isSearching,
    required this.suggestions,
    required this.availableDrivers,
    required this.onSearchChanged,
    required this.onSuggestionSelected,
    required this.onStartDriving,
    required this.onFindRide,
    required this.onReset,
  });

  @override
  Widget build(BuildContext context) {
    return Positioned(
      bottom: 20,
      left: 16,
      right: 16,
      child: Material(
        elevation: 4,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color.fromRGBO(255, 255, 255, 0.95),
            borderRadius: BorderRadius.circular(16),
          ),
          child: AnimatedSize(
            duration: const Duration(milliseconds: 300),
            child: _buildPanelContent(),
          ),
        ),
      ),
    );
  }

  Widget _buildPanelContent() {
    switch (appState) {
      case AppState.initial:
        return _buildInitialStateUI();
      case AppState.driving:
        return _buildActiveStateUI("You are driving");
      case AppState.searching:
        return _buildSearchingStateUI();
    }
  }

  Widget _buildInitialStateUI() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextField(
          controller: destinationController,
          onChanged: onSearchChanged,
          decoration: InputDecoration(
            hintText: "Where are you going?",
            filled: true,
            fillColor: Colors.grey[100],
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16),
            suffixIcon: isSearching
                ? const Padding(
                    padding: EdgeInsets.all(12.0),
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : null,
          ),
        ),
        if (suggestions.isNotEmpty)
          SizedBox(
            height: 150,
            child: ListView.builder(
              itemCount: suggestions.length,
              itemBuilder: (context, index) {
                final suggestion = suggestions[index];
                return ListTile(
                  title: Text(suggestion.displayName, maxLines: 2),
                  onTap: () => onSuggestionSelected(suggestion),
                );
              },
            ),
          ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: ElevatedButton(
                onPressed: onStartDriving,
                style: _buttonStyle(const Color(0xFFEA580C)),
                child: const Text('Start Driving'),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: ElevatedButton(
                onPressed: onFindRide,
                style: _buttonStyle(Colors.black87),
                child: const Text('Find a Ride'),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildActiveStateUI(String text) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(text, style: const TextStyle(fontWeight: FontWeight.bold)),
        TextButton(
          onPressed: onReset,
          child: const Text('Cancel', style: TextStyle(color: Colors.red)),
        ),
      ],
    );
  }

  Widget _buildSearchingStateUI() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        _buildActiveStateUI("Searching for drivers..."),
        const SizedBox(height: 10),
        availableDrivers.isEmpty
            ? const Padding(
                padding: EdgeInsets.all(8.0),
                child: Text("No nearby drivers found yet."),
              )
            : ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 150),
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: availableDrivers.length,
                  itemBuilder: (context, index) {
                    final driver =
                        availableDrivers[index].data() as Map<String, dynamic>;
                    return Card(
                      child: ListTile(
                        leading:
                            Icon(Icons.drive_eta, color: Colors.orange.shade800),
                        title: const Text("Driver nearby"),
                        subtitle:
                            Text("Heading to: ${driver['destination_name']}"),
                      ),
                    );
                  },
                ),
              ),
      ],
    );
  }

  ButtonStyle _buttonStyle(Color backgroundColor) {
    return ElevatedButton.styleFrom(
      backgroundColor: backgroundColor,
      foregroundColor: Colors.white,
      padding: const EdgeInsets.symmetric(vertical: 14),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    );
  }
}
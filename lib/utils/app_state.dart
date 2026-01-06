/// Represents the current state of the ride-sharing application
enum AppState { 
  /// User is not engaged in any ride-related activity
  idle,
  
  /// User is actively driving and available to pick up passengers
  driving,
  
  /// User is searching for a ride as a passenger
  searchingForRide,
  
  /// User has requested a ride and is waiting for a driver
  waitingForDriver,
  
  /// User's ride request has been matched with a driver
  rideMatched,
  
  /// User is in an active ride (either as driver or passenger)
  inRide,
  
  /// User is rating/reviewing the completed ride
  completingRide,
}

extension AppStateExtension on AppState {
  /// Returns true if the user is currently in a driver role
  bool get isDriving => this == AppState.driving;
  
  /// Returns true if the user is currently in a passenger role
  bool get isPassenger => [
    AppState.searchingForRide,
    AppState.waitingForDriver,
    AppState.rideMatched,
  ].contains(this);
  
  /// Returns true if the user is in an active ride session
  bool get isInActiveRide => this == AppState.inRide;
  
  /// Returns true if the user is available for new ride activities
  bool get isAvailable => this == AppState.idle;
  
  /// Returns true if the user is engaged in any ride-related activity
  bool get isEngaged => this != AppState.idle;
  
  /// Returns a human-readable description of the current state
  String get displayName {
    switch (this) {
      case AppState.idle:
        return 'Ready';
      case AppState.driving:
        return 'Driving';
      case AppState.searchingForRide:
        return 'Looking for Ride';
      case AppState.waitingForDriver:
        return 'Waiting for Driver';
      case AppState.rideMatched:
        return 'Driver Found';
      case AppState.inRide:
        return 'In Ride';
      case AppState.completingRide:
        return 'Completing Ride';
    }
  }
  
  /// Returns the next logical state transition
  AppState? getNextState(UserAction action) {
    switch (this) {
      case AppState.idle:
        if (action == UserAction.startDriving) return AppState.driving;
        if (action == UserAction.requestRide) return AppState.searchingForRide;
        break;
      case AppState.driving:
        if (action == UserAction.stopDriving) return AppState.idle;
        if (action == UserAction.acceptRide) return AppState.inRide;
        break;
      case AppState.searchingForRide:
        if (action == UserAction.submitRequest) return AppState.waitingForDriver;
        if (action == UserAction.cancelRequest) return AppState.idle;
        break;
      case AppState.waitingForDriver:
        if (action == UserAction.rideMatched) return AppState.rideMatched;
        if (action == UserAction.cancelRequest) return AppState.idle;
        break;
      case AppState.rideMatched:
        if (action == UserAction.startRide) return AppState.inRide;
        if (action == UserAction.cancelRide) return AppState.idle;
        break;
      case AppState.inRide:
        if (action == UserAction.completeRide) return AppState.completingRide;
        break;
      case AppState.completingRide:
        if (action == UserAction.finishRating) return AppState.idle;
        break;
    }
    return null;
  }
}

/// Represents user actions that can trigger state changes
enum UserAction {
  startDriving,
  stopDriving,
  requestRide,
  submitRequest,
  cancelRequest,
  rideMatched,
  acceptRide,
  startRide,
  cancelRide,
  completeRide,
  finishRating,
}

/// Represents the user's current role in the ride-sharing system
enum UserRole {
  driver,
  passenger,
  none;
  
  String get displayName {
    switch (this) {
      case UserRole.driver:
        return 'Driver';
      case UserRole.passenger:
        return 'Passenger';
      case UserRole.none:
        return 'User';
    }
  }
}

/// Helper class to manage app state transitions
class AppStateManager {
  AppState _currentState = AppState.idle;
  UserRole _currentRole = UserRole.none;
  
  AppState get currentState => _currentState;
  UserRole get currentRole => _currentRole;
  
  /// Attempts to transition to a new state based on user action
  bool tryTransition(UserAction action) {
    final nextState = _currentState.getNextState(action);
    if (nextState != null) {
      _currentState = nextState;
      _updateRole(action);
      return true;
    }
    return false;
  }
  
  /// Forces a state change (use with caution)
  void forceState(AppState state, [UserRole? role]) {
    _currentState = state;
    if (role != null) {
      _currentRole = role;
    }
  }
  
  /// Resets to idle state
  void reset() {
    _currentState = AppState.idle;
    _currentRole = UserRole.none;
  }
  
  void _updateRole(UserAction action) {
    switch (action) {
      case UserAction.startDriving:
        _currentRole = UserRole.driver;
        break;
      case UserAction.requestRide:
        _currentRole = UserRole.passenger;
        break;
      case UserAction.stopDriving:
      case UserAction.cancelRequest:
      case UserAction.finishRating:
        _currentRole = UserRole.none;
        break;
      default:
        // Keep current role for other actions
        break;
    }
  }
  
  /// Returns true if the given action is valid for the current state
  bool canPerformAction(UserAction action) {
    return _currentState.getNextState(action) != null;
  }
  
  /// Gets all valid actions for the current state
  List<UserAction> getValidActions() {
    final validActions = <UserAction>[];
    for (final action in UserAction.values) {
      if (canPerformAction(action)) {
        validActions.add(action);
      }
    }
    return validActions;
  }
}
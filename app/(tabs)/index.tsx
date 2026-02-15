import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
  Keyboard,
  Linking,
  Share as NativeShare,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useAppState } from '@/contexts/AppStateContext';
import { MarkerData, RideConnection } from '@/types';
import { api } from '@/utils/api';
import PlaceSearchInput from '@/components/maps/PlaceSearchInput';
import { getRoute } from '@/utils/routing';
import { VEHICLE_TYPES } from '@/constants/vehicles';
import type { VehicleType } from '@/constants/vehicles';

const INDIA_EMERGENCY_NUMBER = '112';

export default function HomeScreen() {
  const router = useRouter();
  const { user, isAuthenticated, refreshUser } = useAuth();
  const {
    role,
    setRole,
    userLocation,
    destination,
    setDestination,
    markers,
    activeConnections,
    pendingRequests,
    isActive,
    updateUserState,
  } = useAppState();

  const mapRef = useRef<MapView>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);
  const [activeRequest, setActiveRequest] = useState<RideConnection | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showRequestPopup, setShowRequestPopup] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<RideConnection | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);
  const [ratingConnection, setRatingConnection] = useState<RideConnection | null>(null);
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [isPanicMode, setIsPanicMode] = useState(false);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const previousActiveRequestIdRef = useRef<string | null>(null);

  // New state for mode selection flow
  const [tempDestination, setTempDestination] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [isSelectingMode, setIsSelectingMode] = useState(false);
  const [showVehicleTypeModal, setShowVehicleTypeModal] = useState(false);
  const [selectedVehicleType, setSelectedVehicleType] = useState<VehicleType>(VEHICLE_TYPES[0]);
  const [isSavingVehicleType, setIsSavingVehicleType] = useState(false);

  const checkForPendingRating = useCallback(async () => {
    if (!user || ratingConnection) return;

    try {
      const { rides } = await api.getHistory();
      const unratedRide = rides.find(
        (ride) =>
          ride.PassengerId === user.Id &&
          ride.State === 'completed' &&
          (ride.DriverRating === undefined || ride.DriverRating === null)
      );

      if (unratedRide) {
        setRatingConnection(unratedRide);
        setSelectedRating(0);
      }
    } catch (error) {
      console.error('Failed to check pending rating:', error);
    }
  }, [user, ratingConnection]);


  // Authentication is now handled in root layout with Redirect component

  useEffect(() => {
    if (isAuthenticated) {
      loadBalance();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (role === 'driver' && pendingRequests.length > 0) {
      setCurrentRequest(pendingRequests[0]);
      setShowRequestPopup(true);
    }
  }, [pendingRequests, role]);

  useEffect(() => {
    if (activeConnections.length > 0) {
      const myConnection = activeConnections.find(
        (c) => c.PassengerId === user?.Id || c.DriverId === user?.Id
      );
      setActiveRequest(myConnection || null);
    } else {
      setActiveRequest(null);
    }
  }, [activeConnections, user]);

  useEffect(() => {
    async function maybePromptRating() {
      if (!user || role !== 'passenger') return;
      if (previousActiveRequestIdRef.current && !activeRequest) {
        await checkForPendingRating();
      }
      previousActiveRequestIdRef.current = activeRequest?.Id || null;
    }

    maybePromptRating();
  }, [activeRequest, role, user, checkForPendingRating]);

  useEffect(() => {
    if (!user || role !== 'passenger') return;
    checkForPendingRating();
  }, [role, user, checkForPendingRating]);

  useEffect(() => {
    if (user?.VehicleType) {
      setSelectedVehicleType(user.VehicleType);
    }
  }, [user?.VehicleType]);

  async function loadBalance() {
    try {
      const { balance: bal } = await api.getWalletBalance();
      setBalance(bal);
    } catch (error) {
      console.error('Failed to load balance:', error);
    }
  }

  function centerOnUser() {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  }

  async function handlePlaceSelected(place: { lat: number; lng: number; name: string }) {
    // Store temporarily and show mode selection buttons
    setTempDestination(place);
    setSearchQuery(place.name);

    // Focus map on selected destination
    if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: place.lat,
          longitude: place.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        1000
      );
    }
  }

  async function handleModeSelection(selectedMode: 'driver' | 'passenger', skipVehicleCheck = false) {
    if (!tempDestination || isSelectingMode) return;

    if (selectedMode === 'driver' && !skipVehicleCheck && !user?.VehicleType) {
      setShowVehicleTypeModal(true);
      return;
    }

    // Disable buttons during processing
    setIsSelectingMode(true);

    // Set the role first
    setRole(selectedMode);

    // Check KYC for both modes - now mandatory
    if (!user?.IsKycVerified) {
      const modeText = selectedMode === 'driver' ? 'becoming a driver' : 'finding rides';
      Alert.alert(
        'KYC Verification Required',
        `You must complete KYC verification before ${modeText}. This ensures the safety and security of all users.`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => {
            setTempDestination(null);
            setSearchQuery('');
            setIsSelectingMode(false);
          }},
          { text: 'Verify Now', onPress: () => {
            router.push('/kyc-verification' as any);
            setTempDestination(null);
            setSearchQuery('');
            setIsSelectingMode(false);
          }}
        ]
      );
      return;
    }

    proceedWithModeActivation(selectedMode);
  }

  async function handleSaveVehicleTypeAndContinue() {
    if (!selectedVehicleType) return;

    try {
      setIsSavingVehicleType(true);
      await api.updateVehicleType(selectedVehicleType);
      await refreshUser();
      setShowVehicleTypeModal(false);
      await handleModeSelection('driver', true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save vehicle type');
    } finally {
      setIsSavingVehicleType(false);
    }
  }

  async function proceedWithModeActivation(selectedMode: 'driver' | 'passenger') {
    if (!tempDestination || !userLocation) return;

    try {
      // Set destination
      setDestination({ lat: tempDestination.lat, lng: tempDestination.lng });

      // Update user state to active mode first (so UI updates)
      const state = selectedMode === 'driver' ? 'driving' : 'riding';
      await updateUserState(state, { lat: tempDestination.lat, lng: tempDestination.lng });

      // Clear temporary state to show active mode UI
      setTempDestination(null);
      setIsSelectingMode(false);

      // Start loading state (now active mode UI is visible)
      setIsLoadingRoute(true);

      // Fetch and draw route using OSRM API (free alternative to Google Directions)
      const routeResult = await getRoute(
        { lat: userLocation.lat, lng: userLocation.lng },
        { lat: tempDestination.lat, lng: tempDestination.lng }
      );

      if (routeResult && routeResult.coordinates.length > 0) {
        setRouteCoordinates(routeResult.coordinates);

        // Fit map to show entire route
        if (mapRef.current) {
          mapRef.current.fitToCoordinates(routeResult.coordinates, {
            edgePadding: { top: 100, right: 50, bottom: 150, left: 50 },
            animated: true,
          });
        }
      }

      // Stop loading state
      setIsLoadingRoute(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to activate mode');
      setTempDestination(null);
      setSearchQuery('');
      setIsSelectingMode(false);
      setIsLoadingRoute(false);
    }
  }

  function handleClearSearch() {
    setTempDestination(null);
    setSearchQuery('');
    Keyboard.dismiss();
  }

  function handleExitActive() {
    const hasConnectedRide = activeConnections.some(
      (connection) =>
        (connection.DriverId === user?.Id || connection.PassengerId === user?.Id) &&
        (connection.State === 'accepted' || connection.State === 'picked_up')
    );

    if (hasConnectedRide) {
      Alert.alert(
        'Cannot Exit Active Mode',
        'You cannot exit while a connected ride is in progress. Complete the ride first.'
      );
      return;
    }

    Alert.alert('Exit Active Mode', 'Are you sure you want to exit?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Exit',
        onPress: async () => {
          try {
            await updateUserState('idle', null);
            setDestination(null);
            setRouteCoordinates([]);
            setSearchQuery('');
            setIsPanicMode(false);
          } catch (error: any) {
            Alert.alert('Error', error.message);
          }
        },
      },
    ]);
  }

  async function handleMapPoiClick(event: any) {
    const poi = event.nativeEvent;
    if (poi.coordinate) {
      const { latitude, longitude } = poi.coordinate;
      const destinationName = poi.name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

      // Store temporarily and show mode selection buttons
      setTempDestination({ lat: latitude, lng: longitude, name: destinationName });
      setSearchQuery(destinationName);
      Keyboard.dismiss();

      // Focus map on selected destination
      if (mapRef.current) {
        mapRef.current.animateToRegion(
          {
            latitude: latitude,
            longitude: longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          1000
        );
      }
    }
  }

  async function handleRequestRide(marker: MarkerData) {
    if (!userLocation || !destination) return;

    const minBalance = 10 / 100; // $10 worth
    if (balance < minBalance) {
      Alert.alert(
        'Insufficient Balance',
        'You need at least $10 worth of SOL to request a ride. Please top up your wallet.',
        [{ text: 'Go to Account', onPress: () => router.push('/(tabs)/account') }]
      );
      return;
    }

    try {
      await api.requestRide(marker.userId, userLocation, destination);
      Alert.alert('Success', 'Ride requested! Waiting for driver response.');
      setSelectedMarker(null);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to request ride');
    }
  }

  async function handleCancelRequest() {
    if (!activeRequest) return;

    Alert.alert('Cancel Request', 'Are you sure you want to cancel?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        onPress: async () => {
          try {
            await api.cancelRequest(activeRequest.Id);
            setActiveRequest(null);
            Alert.alert('Success', 'Request cancelled');
          } catch (error: any) {
            Alert.alert('Error', error.message);
          }
        },
      },
    ]);
  }

  async function handleRespondToRequest(action: 'accepted' | 'rejected') {
    if (!currentRequest) return;

    try {
      await api.respondToRequest(currentRequest.Id, action);
      setShowRequestPopup(false);
      setCurrentRequest(null);
      Alert.alert('Success', `Request ${action}`);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleVerifyOtp(connectionId: string, otp: string) {
    try {
      await api.verifyOtp(connectionId, otp);
      Alert.alert('Success', 'Passenger picked up!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleConfirmVehicle(connectionId: string, isSameVehicle: boolean) {
    try {
      await api.confirmVehicle(connectionId, isSameVehicle);
      setActiveRequest((prev) =>
        prev && prev.Id === connectionId
          ? {
              ...prev,
              PassengerVehicleConfirmation: isSameVehicle ? 'confirmed' : 'mismatch',
            }
          : prev
      );

      if (!isSameVehicle) {
        Alert.alert(
          'Vehicle Mismatch Reported',
          'Mismatch has been recorded. Please do not share OTP until the correct vehicle arrives.'
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to confirm vehicle');
    }
  }

  async function handleCompleteRide(connectionId: string) {
    try {
      const { fare, paymentStatus, passengerPointsAwarded } = await api.completeRide(connectionId);
      const pointsLine = passengerPointsAwarded ? `\nYou earned ${passengerPointsAwarded} passenger points.` : '';
      Alert.alert('Ride Completed', `Payment ${paymentStatus}! Fare: ₹${fare.toFixed(2)}${pointsLine}`);
      setActiveRequest(null);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleSubmitRating() {
    if (!ratingConnection || selectedRating < 1 || selectedRating > 5) return;

    try {
      setIsSubmittingRating(true);
      const result = await api.rateDriver(ratingConnection.Id, selectedRating);
      const pointsLine = result.driverPointsAwarded
        ? `\nDriver earned ${result.driverPointsAwarded} points for this 5-star ride.`
        : '';
      Alert.alert('Thank you!', `Your rating has been submitted.${pointsLine}`);
      setRatingConnection(null);
      setSelectedRating(0);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit rating');
    } finally {
      setIsSubmittingRating(false);
    }
  }

  async function handleShareRide(connectionId: string) {
    try {
      const { shareUrl } = await api.createRideShareLink(connectionId);
      const message = `Track my ride live on RouteMate: ${shareUrl}`;
      await NativeShare.share({
        message,
        url: shareUrl,
        title: 'RouteMate Live Ride Tracking',
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create share link');
    }
  }

  function formatMarkerRating(rating?: number): string {
    if (!rating || rating <= 0) return 'No ratings yet';
    return `${rating.toFixed(1)} / 5`;
  }

  function handlePanicPress() {
    Alert.alert(
      'Panic Mode',
      `This will call emergency response (${INDIA_EMERGENCY_NUMBER} - India). Live location updates will continue in the background.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Now',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsPanicMode(true);

              if (userLocation) {
                api.updateLocation(userLocation.lat, userLocation.lng).catch((error) => {
                  console.error('Failed to push panic location update:', error);
                });
              }

              const dialUrl = `tel:${INDIA_EMERGENCY_NUMBER}`;
              const canOpen = await Linking.canOpenURL(dialUrl);
              if (!canOpen) {
                throw new Error('Dialer is unavailable');
              }
              await Linking.openURL(dialUrl);
            } catch (error) {
              console.error('Failed to start emergency call:', error);
              Alert.alert('Error', 'Could not open the phone dialer. Please call 112 manually.');
            }
          },
        },
      ]
    );
  }

  if (!user || !userLocation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: userLocation.lat,
          longitude: userLocation.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation
        showsMyLocationButton={false}
        showsPointsOfInterest={true}
        showsBuildings={true}
        onPoiClick={handleMapPoiClick}
        onPress={() => {
          Keyboard.dismiss();
        }}
      >
        {/* Show markers only in active mode and only for the opposite role */}
        {isActive && markers.map((marker) => (
          <Marker
            key={marker.userId}
            coordinate={{ latitude: marker.lastLocation.lat, longitude: marker.lastLocation.lng }}
            title={marker.name}
            onPress={() => setSelectedMarker(marker)}
          />
        ))}

        {/* Destination marker (red pin like Google Maps) - show when destination selected or in active mode */}
        {(destination && isActive) || tempDestination ? (
          <Marker
            coordinate={{
              latitude: tempDestination ? tempDestination.lat : destination!.lat,
              longitude: tempDestination ? tempDestination.lng : destination!.lng
            }}
            title="Destination"
            pinColor="red"
          />
        ) : null}

        {/* Route display - only show in active mode when route exists */}
        {routeCoordinates.length > 0 && isActive && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#4285F4"
            strokeWidth={4}
          />
        )}
      </MapView>

      {/* Search bar / Destination display */}
      <View style={styles.searchContainer}>
        {!isActive ? (
          // Idle mode: Show search input
          <View style={styles.searchWrapper}>
            <PlaceSearchInput
              placeholder="Search destination..."
              onPlaceSelected={handlePlaceSelected}
              onClear={handleClearSearch}
              containerStyle={styles.placesSearchContainer}
              initialValue={searchQuery}
            />
          </View>
        ) : (
          // Active mode: Show destination name with exit button
          <View style={styles.destinationDisplay}>
            <View style={styles.destinationTextContainer}>
              <Text style={styles.destinationPrefix}>
                {role === 'driver' ? 'Driving to' : 'Going to'}
              </Text>
              <Text style={styles.destinationText} numberOfLines={1}>
                {searchQuery || 'Destination'}
              </Text>
            </View>
            {isLoadingRoute ? (
              <ActivityIndicator size="small" color="#e86713" style={styles.exitButton} />
            ) : (
              <TouchableOpacity style={styles.exitButton} onPress={handleExitActive}>
                <MaterialIcons name="close" size={24} color="#e86713" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Center on user button */}
      <TouchableOpacity style={styles.centerButton} onPress={centerOnUser}>
        <MaterialIcons name="my-location" size={24} color="#e86713" />
      </TouchableOpacity>

      {isActive && (
        <TouchableOpacity
          style={[styles.panicButton, isPanicMode && styles.panicButtonActive]}
          onPress={handlePanicPress}
        >
          <MaterialIcons name="warning" size={20} color="#fff" />
          <Text style={styles.panicButtonText}>
            {isPanicMode ? `PANIC ON - CALL ${INDIA_EMERGENCY_NUMBER}` : 'PANIC'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Mode Selection Buttons - show when destination is selected but not active */}
      {tempDestination && !isActive && (
        <View style={styles.modeSelectionButtons}>
          <TouchableOpacity
            style={[styles.modeButtonBottom, styles.modeButtonLeft]}
            onPress={() => handleModeSelection('passenger')}
            disabled={isSelectingMode}
          >
            <MaterialIcons name="person" size={24} color="#fff" />
            <Text style={styles.modeButtonBottomText}>Find a Ride</Text>
          </TouchableOpacity>

          <View style={styles.buttonDivider} />

          <TouchableOpacity
            style={[styles.modeButtonBottom, styles.modeButtonRight]}
            onPress={() => handleModeSelection('driver')}
            disabled={isSelectingMode}
          >
            <MaterialIcons name="drive-eta" size={24} color="#fff" />
            <Text style={styles.modeButtonBottomText}>Start Driving</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Selected marker detail (passenger view in active mode) */}
      {selectedMarker && role === 'passenger' && isActive && (
        <View style={styles.bottomSheet}>
          <View style={styles.bottomSheetHeader}>
            <Text style={styles.bottomSheetTitle}>{selectedMarker.name}</Text>
            <TouchableOpacity onPress={() => setSelectedMarker(null)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.detailText}>Rating: {formatMarkerRating(selectedMarker.rating)}</Text>
          <Text style={styles.detailText}>Vehicle: {selectedMarker.vehicle || 'N/A'}</Text>
          <TouchableOpacity
            style={styles.requestButton}
            onPress={() => handleRequestRide(selectedMarker)}
          >
            <Text style={styles.requestButtonText}>Request Ride</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Active request pane */}
      {activeRequest && role === 'passenger' && !isMinimized && (
        <View style={styles.bottomSheet}>
          <View style={styles.bottomSheetHeader}>
            <Text style={styles.bottomSheetTitle}>Active Request</Text>
            <TouchableOpacity onPress={() => setIsMinimized(true)}>
              <Text style={styles.closeButton}>−</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.detailText}>Status: {activeRequest.State}</Text>
          {activeRequest.RequestedVehicleType && (
            <Text style={styles.detailText}>Expected Vehicle: {activeRequest.RequestedVehicleType}</Text>
          )}
          {activeRequest.State === 'accepted' && activeRequest.RequestedVehicleType && (
            <>
              {(!activeRequest.PassengerVehicleConfirmation ||
                activeRequest.PassengerVehicleConfirmation === 'pending') && (
                <View style={styles.vehicleConfirmRow}>
                  <TouchableOpacity
                    style={[styles.vehicleConfirmButton, styles.vehicleConfirmYes]}
                    onPress={() => handleConfirmVehicle(activeRequest.Id, true)}
                  >
                    <Text style={styles.vehicleConfirmButtonText}>Vehicle Matches</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.vehicleConfirmButton, styles.vehicleConfirmNo]}
                    onPress={() => handleConfirmVehicle(activeRequest.Id, false)}
                  >
                    <Text style={styles.vehicleConfirmButtonText}>Not This Vehicle</Text>
                  </TouchableOpacity>
                </View>
              )}
              {activeRequest.PassengerVehicleConfirmation === 'confirmed' && (
                <Text style={styles.vehicleConfirmedText}>Vehicle confirmed. Share OTP only after boarding.</Text>
              )}
              {activeRequest.PassengerVehicleConfirmation === 'mismatch' && (
                <Text style={styles.vehicleMismatchText}>Vehicle mismatch reported. Wait for correction before OTP.</Text>
              )}
            </>
          )}
          {activeRequest.State === 'accepted' && activeRequest.OtpCode && (
            <Text style={styles.otpText}>OTP: {activeRequest.OtpCode}</Text>
          )}
          <TouchableOpacity
            style={styles.shareButton}
            onPress={() => handleShareRide(activeRequest.Id)}
          >
            <Text style={styles.shareButtonText}>Share Live Ride</Text>
          </TouchableOpacity>
          {activeRequest.State === 'requested' && (
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancelRequest}>
              <Text style={styles.cancelButtonText}>Cancel Request</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Minimized status bar */}
      {activeRequest && isMinimized && (
        <TouchableOpacity
          style={styles.minimizedBar}
          onPress={() => setIsMinimized(false)}
        >
          <Text style={styles.minimizedText}>Active Request - Tap to expand</Text>
        </TouchableOpacity>
      )}

      {/* Driver request popup */}
      <Modal visible={showRequestPopup} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Ride Request</Text>
            {currentRequest && (
              <>
                <Text style={styles.modalText}>Fare: ${currentRequest.Fare.toFixed(2)}</Text>
                <Text style={styles.modalText}>Distance: {currentRequest.Distance.toFixed(2)} km</Text>
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.rejectButton]}
                    onPress={() => handleRespondToRequest('rejected')}
                  >
                    <Text style={styles.modalButtonText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.acceptButton]}
                    onPress={() => handleRespondToRequest('accepted')}
                  >
                    <Text style={styles.modalButtonText}>Accept</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Vehicle type selection modal for drivers */}
      <Modal visible={showVehicleTypeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Your Vehicle Type</Text>
            <Text style={styles.modalText}>Passengers will see this before requesting your ride.</Text>
            <View style={styles.vehicleOptionList}>
              {VEHICLE_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.vehicleOptionButton,
                    selectedVehicleType === type && styles.vehicleOptionButtonSelected,
                  ]}
                  onPress={() => setSelectedVehicleType(type)}
                  disabled={isSavingVehicleType}
                >
                  <Text
                    style={[
                      styles.vehicleOptionText,
                      selectedVehicleType === type && styles.vehicleOptionTextSelected,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.rejectButton]}
                onPress={() => {
                  setShowVehicleTypeModal(false);
                }}
                disabled={isSavingVehicleType}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.acceptButton]}
                onPress={handleSaveVehicleTypeAndContinue}
                disabled={isSavingVehicleType}
              >
                {isSavingVehicleType ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>Save & Continue</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Post-ride rating popup (passenger) */}
      <Modal visible={!!ratingConnection} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.ratingModalContent}>
            <Text style={styles.modalTitle}>Rate Your Driver</Text>
            <Text style={styles.modalText}>How was your ride experience?</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setSelectedRating(star)}
                  disabled={isSubmittingRating}
                  style={styles.starButton}
                >
                  <MaterialIcons
                    name={star <= selectedRating ? 'star' : 'star-border'}
                    size={36}
                    color={star <= selectedRating ? '#f59e0b' : '#9ca3af'}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.rejectButton]}
                onPress={() => {
                  setRatingConnection(null);
                  setSelectedRating(0);
                }}
                disabled={isSubmittingRating}
              >
                <Text style={styles.modalButtonText}>Later</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.acceptButton,
                  (selectedRating === 0 || isSubmittingRating) && styles.disabledActionButton,
                ]}
                onPress={handleSubmitRating}
                disabled={selectedRating === 0 || isSubmittingRating}
              >
                {isSubmittingRating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Connection Manager for drivers */}
      {role === 'driver' && activeConnections.length > 0 && isActive && (
        <View style={styles.connectionManager}>
          <Text style={styles.connectionTitle}>Active Connections</Text>
          <ScrollView style={styles.connectionList}>
            {activeConnections.map((conn) => (
              <View key={conn.Id} style={styles.connectionItem}>
                <Text style={styles.connectionText}>Status: {conn.State}</Text>
                <TouchableOpacity
                  style={styles.driverShareButton}
                  onPress={() => handleShareRide(conn.Id)}
                >
                  <Text style={styles.driverShareButtonText}>Share Ride Link</Text>
                </TouchableOpacity>
                {conn.State === 'accepted' && (
                  <View style={styles.otpEntry}>
                    <TextInput
                      style={styles.otpInput}
                      placeholder="Enter OTP"
                      onSubmitEditing={(e) => handleVerifyOtp(conn.Id, e.nativeEvent.text)}
                    />
                  </View>
                )}
                {conn.State === 'picked_up' && (
                  <TouchableOpacity
                    style={styles.completeButton}
                    onPress={() => handleCompleteRide(conn.Id)}
                  >
                    <Text style={styles.completeButtonText}>Complete Ride</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  searchContainer: {
    position: 'absolute',
    top: 60,
    left: 10,
    right: 10,
    zIndex: 1,
  },
  searchWrapper: {
    position: 'relative',
    zIndex: 1000,
  },
  placesSearchContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    height: 50,
  },
  destinationDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  destinationTextContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  destinationPrefix: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  destinationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  exitButton: {
    marginLeft: 10,
    padding: 5,
  },
  centerButton: {
    position: 'absolute',
    top: 130,
    right: 10,
    backgroundColor: '#fff',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  panicButton: {
    position: 'absolute',
    top: 190,
    right: 10,
    backgroundColor: '#c62828',
    minWidth: 110,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 6,
  },
  panicButtonActive: {
    backgroundColor: '#b71c1c',
  },
  panicButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  modeSelectionButtons: {
    position: 'absolute',
    bottom: 20,
    left: 10,
    right: 10,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    height: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  modeButtonBottom: {
    flex: 1,
    backgroundColor: '#e86713',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    opacity: 1,
  },
  modeButtonLeft: {
    backgroundColor: '#e86713',
  },
  modeButtonRight: {
    backgroundColor: '#e86713',
  },
  buttonDivider: {
    width: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  modeButtonBottomText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
  },
  detailText: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  otpText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e86713',
    marginBottom: 10,
  },
  vehicleConfirmRow: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 6,
    gap: 8,
  },
  vehicleConfirmButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  vehicleConfirmYes: {
    backgroundColor: '#4CAF50',
  },
  vehicleConfirmNo: {
    backgroundColor: '#f44336',
  },
  vehicleConfirmButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  vehicleConfirmedText: {
    color: '#2e7d32',
    fontSize: 14,
    marginBottom: 6,
  },
  vehicleMismatchText: {
    color: '#c62828',
    fontSize: 14,
    marginBottom: 6,
  },
  requestButton: {
    backgroundColor: '#e86713',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  requestButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#f44336',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  shareButton: {
    backgroundColor: '#2563eb',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  minimizedBar: {
    position: 'absolute',
    bottom: 80,
    left: 10,
    right: 10,
    backgroundColor: '#e86713',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  minimizedText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  ratingModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 10,
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  rejectButton: {
    backgroundColor: '#f44336',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  disabledActionButton: {
    opacity: 0.6,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  vehicleOptionList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  vehicleOptionButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  vehicleOptionButtonSelected: {
    backgroundColor: '#e86713',
    borderColor: '#e86713',
  },
  vehicleOptionText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  vehicleOptionTextSelected: {
    color: '#fff',
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10,
  },
  starButton: {
    paddingHorizontal: 2,
  },
  connectionManager: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  connectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  connectionList: {
    maxHeight: 150,
  },
  connectionItem: {
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 10,
  },
  connectionText: {
    fontSize: 14,
    marginBottom: 5,
  },
  driverShareButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 8,
  },
  driverShareButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  otpEntry: {
    marginTop: 10,
  },
  otpInput: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

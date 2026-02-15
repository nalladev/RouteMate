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
import { useTheme } from '@/contexts/ThemeContext';
import { useAppState } from '@/contexts/AppStateContext';
import { MarkerData, RideConnection } from '@/types';
import { api } from '@/utils/api';
import { Colors } from '@/constants/theme';
import PlaceSearchInput from '@/components/maps/PlaceSearchInput';
import { getRoute } from '@/utils/routing';
import { VEHICLE_TYPES } from '@/constants/vehicles';
import type { VehicleType } from '@/constants/vehicles';
import { getTripEstimate, formatFare, formatDistanceKm, formatDuration, formatETA, calculateDistance, type TripEstimate } from '@/utils/tripEstimates';

const INDIA_EMERGENCY_NUMBER = '112';

export default function HomeScreen() {
  const router = useRouter();
  const { user, isAuthenticated, refreshUser } = useAuth();
  const { isDarkMode } = useTheme();
  const colors = Colors[isDarkMode ? 'dark' : 'light'];
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

  // Trip estimate state for passenger preview
  const [tripEstimate, setTripEstimate] = useState<TripEstimate | null>(null);
  const [isCalculatingEstimate, setIsCalculatingEstimate] = useState(false);

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

  // Calculate trip estimate when marker is selected (passenger preview)
  useEffect(() => {
    async function calculateEstimate() {
      if (selectedMarker && role === 'passenger' && userLocation && destination) {
        setIsCalculatingEstimate(true);
        const estimate = await getTripEstimate(
          userLocation,
          destination,
          selectedMarker.lastLocation
        );
        setTripEstimate(estimate);
        setIsCalculatingEstimate(false);
      } else {
        setTripEstimate(null);
      }
    }

    calculateEstimate();
  }, [selectedMarker, role, userLocation, destination]);

  // Reset trip estimate when marker is deselected
  useEffect(() => {
    if (!selectedMarker) {
      setTripEstimate(null);
    }
  }, [selectedMarker]);

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

  async function handleCancelConnection() {
    if (!activeRequest) return;

    const isDriver = role === 'driver';
    const warningMessage = isDriver
      ? 'Cancelling may result in a penalty based on time since acceptance:\n\n• 0-2 min: ₹0\n• 2-5 min: ₹10\n• 5-10 min: ₹20\n• >10 min: ₹50\n\nAre you sure?'
      : 'Are you sure you want to cancel this ride?';

    Alert.alert('Cancel Ride', warningMessage, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            const result = await api.cancelConnection(activeRequest.Id);
            setActiveRequest(null);
            
            if (result.penalty > 0) {
              Alert.alert(
                'Ride Cancelled',
                `${result.message}\nNew Balance: ₹${result.newBalance?.toFixed(2) || '0.00'}`,
                [{ text: 'OK', onPress: () => refreshUser() }]
              );
            } else {
              Alert.alert('Success', result.message);
            }
            
            // Refresh user data to update balance if penalty was charged
            if (isDriver) {
              await refreshUser();
            }
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to cancel ride');
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
      <View style={[styles.loadingContainer, { backgroundColor: colors.backgroundSecondary }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading location...</Text>
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
        {isActive && markers.map((marker) => {
          // If user is a passenger, markers show drivers (blue)
          // If user is a driver, markers show passengers (green)
          const markerIsDriver = role === 'passenger';
          const markerTitle = markerIsDriver 
            ? `${marker.name} (Driver)` 
            : `${marker.name} (Passenger)`;
          const description = markerIsDriver && marker.vehicle
            ? `Vehicle: ${marker.vehicle}${marker.rating ? ` • ⭐ ${marker.rating.toFixed(1)}` : ''}`
            : marker.rating ? `⭐ ${marker.rating.toFixed(1)}` : undefined;

          return (
            <Marker
              key={marker.userId}
              coordinate={{ latitude: marker.lastLocation.lat, longitude: marker.lastLocation.lng }}
              title={markerTitle}
              description={description}
              onPress={() => setSelectedMarker(marker)}
            >
              <View style={styles.customMarker}>
                <View style={[
                  styles.markerIconContainer,
                  { backgroundColor: markerIsDriver ? colors.info : colors.success }
                ]}>
                  <MaterialIcons 
                    name={markerIsDriver ? 'drive-eta' : 'person'} 
                    size={20} 
                    color="#fff" 
                  />
                </View>
                <View style={[
                  styles.markerArrow,
                  { borderTopColor: markerIsDriver ? colors.info : colors.success }
                ]} />
              </View>
            </Marker>
          );
        })}

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
            strokeColor={colors.info}
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
              containerStyle={[styles.placesSearchContainer, { backgroundColor: colors.card }]}
              initialValue={searchQuery}
            />
          </View>
        ) : (
          // Active mode: Show destination name with exit button
          <View style={[styles.destinationDisplay, { backgroundColor: colors.card }]}>
            <View style={styles.destinationTextContainer}>
              <Text style={[styles.destinationPrefix, { color: colors.textSecondary }]}>
                {role === 'driver' ? 'Driving to' : 'Going to'}
              </Text>
              <Text style={[styles.destinationText, { color: colors.text }]} numberOfLines={1}>
                {searchQuery || 'Destination'}
              </Text>
            </View>
            {isLoadingRoute ? (
              <ActivityIndicator size="small" color={colors.tint} style={styles.exitButton} />
            ) : (
              <TouchableOpacity style={styles.exitButton} onPress={handleExitActive}>
                <MaterialIcons name="close" size={24} color={colors.tint} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Center on user button */}
      <TouchableOpacity style={[styles.centerButton, { backgroundColor: colors.card }]} onPress={centerOnUser}>
        <MaterialIcons name="my-location" size={24} color={colors.tint} />
      </TouchableOpacity>

      {isActive && (
        <TouchableOpacity
          style={[styles.panicButton, { backgroundColor: '#c62828' }, isPanicMode && styles.panicButtonActive]}
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
        <View style={[styles.modeSelectionButtons, { backgroundColor: 'transparent', borderColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.modeButtonBottom, 
              styles.modeButtonLeft, 
              { 
                backgroundColor: colors.success,
                borderWidth: 2,
                borderColor: colors.success,
                marginRight: 6,
              }
            ]}
            onPress={() => handleModeSelection('passenger')}
            disabled={isSelectingMode}
          >
            <MaterialIcons name="person" size={24} color="#fff" />
            <Text style={styles.modeButtonBottomText}>Find a Ride</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeButtonBottom, 
              styles.modeButtonRight, 
              { 
                backgroundColor: colors.info,
                borderWidth: 2,
                borderColor: colors.info,
                marginLeft: 6,
              }
            ]}
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
        <View style={[styles.bottomSheet, { backgroundColor: colors.card }]}>
          <View style={styles.bottomSheetHeader}>
            <View style={styles.bottomSheetTitleContainer}>
              <View style={[styles.bottomSheetIcon, { backgroundColor: colors.info }]}>
                <MaterialIcons name="drive-eta" size={16} color="#fff" />
              </View>
              <Text style={[styles.bottomSheetTitle, { color: colors.text }]}>{selectedMarker.name} (Driver)</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedMarker(null)}>
              <Text style={[styles.closeButton, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.detailRow}>
            <MaterialIcons name="star" size={16} color="#FFC107" />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>Rating: {formatMarkerRating(selectedMarker.rating)}</Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialIcons name="directions-car" size={16} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>Vehicle: {selectedMarker.vehicle || 'N/A'}</Text>
          </View>

          {/* Trip Estimate Section */}
          {isCalculatingEstimate ? (
            <View style={styles.estimateContainer}>
              <ActivityIndicator size="small" color={colors.tint} />
              <Text style={[styles.estimateCalculatingText, { color: colors.textSecondary }]}>Calculating trip details...</Text>
            </View>
          ) : tripEstimate ? (
            <View style={styles.estimateContainer}>
              <Text style={[styles.estimateTitle, { color: colors.text }]}>Trip Estimate</Text>
              
              <View style={styles.estimateRow}>
                <View style={styles.estimateItem}>
                  <MaterialIcons name="attach-money" size={20} color={colors.success} />
                  <View style={styles.estimateTextContainer}>
                    <Text style={[styles.estimateLabel, { color: colors.textSecondary }]}>Fare</Text>
                    <Text style={[styles.estimateValue, { color: colors.text }]}>{formatFare(tripEstimate.fare)}</Text>
                  </View>
                </View>
                
                <View style={styles.estimateItem}>
                  <MaterialIcons name="straighten" size={20} color={colors.info} />
                  <View style={styles.estimateTextContainer}>
                    <Text style={[styles.estimateLabel, { color: colors.textSecondary }]}>Distance</Text>
                    <Text style={[styles.estimateValue, { color: colors.text }]}>{formatDistanceKm(tripEstimate.distance)}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.estimateRow}>
                <View style={styles.estimateItem}>
                  <MaterialIcons name="access-time" size={20} color={colors.warning} />
                  <View style={styles.estimateTextContainer}>
                    <Text style={[styles.estimateLabel, { color: colors.textSecondary }]}>Driver ETA</Text>
                    <Text style={[styles.estimateValue, { color: colors.text }]}>{formatDuration(Math.ceil((tripEstimate.eta.getTime() - Date.now()) / 60000))} • {formatETA(tripEstimate.eta)}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.estimateRow}>
                <View style={styles.estimateItem}>
                  <MaterialIcons name="schedule" size={20} color={colors.tint} />
                  <View style={styles.estimateTextContainer}>
                    <Text style={[styles.estimateLabel, { color: colors.textSecondary }]}>Ride Duration</Text>
                    <Text style={[styles.estimateValue, { color: colors.text }]}>{formatDuration(tripEstimate.durationMinutes)}</Text>
                  </View>
                </View>
                
                <View style={styles.estimateItem}>
                  <MaterialIcons name="flag" size={20} color={colors.error} />
                  <View style={styles.estimateTextContainer}>
                    <Text style={[styles.estimateLabel, { color: colors.textSecondary }]}>Arrival Time</Text>
                    <Text style={[styles.estimateValue, { color: colors.text }]}>{formatETA(tripEstimate.rideCompletionTime)}</Text>
                  </View>
                </View>
              </View>

              {/* Balance Check */}
              {tripEstimate && (
                <View style={[
                  styles.balanceCheckContainer,
                  balance >= tripEstimate.fare ? styles.balanceCheckSufficient : styles.balanceCheckInsufficient
                ]}>
                  <MaterialIcons 
                    name={balance >= tripEstimate.fare ? "check-circle" : "warning"} 
                    size={18} 
                    color={balance >= tripEstimate.fare ? colors.success : colors.error} 
                  />
                  <Text style={[
                    styles.balanceCheckText,
                    balance >= tripEstimate.fare ? styles.balanceCheckTextGreen : styles.balanceCheckTextRed
                  ]}>
                    {balance >= tripEstimate.fare 
                      ? `Balance: ${formatFare(balance)} ✓` 
                      : `Insufficient balance (${formatFare(balance)})`}
                  </Text>
                </View>
              )}
            </View>
          ) : null}

          <TouchableOpacity
            style={[
              styles.requestButton,
              { backgroundColor: colors.tint },
              tripEstimate && balance < tripEstimate.fare && styles.requestButtonDisabled
            ]}
            onPress={() => handleRequestRide(selectedMarker)}
            disabled={tripEstimate ? balance < tripEstimate.fare : false}
          >
            <Text style={styles.requestButtonText}>
              {tripEstimate && balance < tripEstimate.fare ? 'Insufficient Balance' : 'Request Ride'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Active request pane */}
      {activeRequest && role === 'passenger' && !isMinimized && (
        <View style={[styles.bottomSheet, { backgroundColor: colors.card }]}>
          <View style={styles.bottomSheetHeader}>
            <Text style={[styles.bottomSheetTitle, { color: colors.text }]}>Active Request</Text>
            <TouchableOpacity onPress={() => setIsMinimized(true)}>
              <Text style={[styles.closeButton, { color: colors.textSecondary }]}>−</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>Status: {activeRequest.State}</Text>
          {activeRequest.RequestedVehicleType && (
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>Expected Vehicle: {activeRequest.RequestedVehicleType}</Text>
          )}
          {activeRequest.State === 'accepted' && activeRequest.RequestedVehicleType && (
            <>
              {(!activeRequest.PassengerVehicleConfirmation ||
                activeRequest.PassengerVehicleConfirmation === 'pending') && (
                <View style={styles.vehicleConfirmRow}>
                  <TouchableOpacity
                    style={[styles.vehicleConfirmButton, styles.vehicleConfirmYes, { backgroundColor: colors.success }]}
                    onPress={() => handleConfirmVehicle(activeRequest.Id, true)}
                  >
                    <Text style={styles.vehicleConfirmButtonText}>Vehicle Matches</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.vehicleConfirmButton, styles.vehicleConfirmNo, { backgroundColor: colors.error }]}
                    onPress={() => handleConfirmVehicle(activeRequest.Id, false)}
                  >
                    <Text style={styles.vehicleConfirmButtonText}>Not This Vehicle</Text>
                  </TouchableOpacity>
                </View>
              )}
              {activeRequest.PassengerVehicleConfirmation === 'confirmed' && (
                <Text style={[styles.vehicleConfirmedText, { color: colors.success }]}>Vehicle confirmed. Share OTP only after boarding.</Text>
              )}
              {activeRequest.PassengerVehicleConfirmation === 'mismatch' && (
                <Text style={[styles.vehicleMismatchText, { color: colors.error }]}>Vehicle mismatch reported. Wait for correction before OTP.</Text>
              )}
            </>
          )}
          {activeRequest.State === 'accepted' && activeRequest.OtpCode && (
            <Text style={[styles.otpText, { color: colors.tint }]}>OTP: {activeRequest.OtpCode}</Text>
          )}
          <TouchableOpacity
            style={[styles.shareButton, { backgroundColor: colors.info }]}
            onPress={() => handleShareRide(activeRequest.Id)}
          >
            <Text style={styles.shareButtonText}>Share Live Ride</Text>
          </TouchableOpacity>
          {activeRequest.State === 'requested' && (
            <TouchableOpacity style={[styles.cancelButton, { backgroundColor: colors.error }]} onPress={handleCancelRequest}>
              <Text style={styles.cancelButtonText}>Cancel Request</Text>
            </TouchableOpacity>
          )}
          {(activeRequest.State === 'accepted' || activeRequest.State === 'picked_up') && (
            <TouchableOpacity style={[styles.cancelButton, { backgroundColor: colors.error }]} onPress={handleCancelConnection}>
              <Text style={styles.cancelButtonText}>Cancel Ride</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Minimized status bar */}
      {activeRequest && isMinimized && (
        <TouchableOpacity
          style={[styles.minimizedBar, { backgroundColor: colors.tint }]}
          onPress={() => setIsMinimized(false)}
        >
          <Text style={styles.minimizedText}>Active Request - Tap to expand</Text>
        </TouchableOpacity>
      )}

      {/* Driver request popup */}
      <Modal visible={showRequestPopup} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Ride Request</Text>
            {currentRequest && (
              <>
                <View style={styles.requestDetailCard}>
                  <View style={styles.requestDetailRow}>
                    <MaterialIcons name="attach-money" size={24} color={colors.success} />
                    <View style={styles.requestDetailTextContainer}>
                      <Text style={[styles.requestDetailLabel, { color: colors.textSecondary }]}>Fare</Text>
                      <Text style={[styles.requestDetailValue, { color: colors.text }]}>${currentRequest.Fare.toFixed(2)}</Text>
                    </View>
                  </View>

                  <View style={styles.requestDetailRow}>
                    <MaterialIcons name="straighten" size={24} color={colors.info} />
                    <View style={styles.requestDetailTextContainer}>
                      <Text style={[styles.requestDetailLabel, { color: colors.textSecondary }]}>Distance</Text>
                      <Text style={[styles.requestDetailValue, { color: colors.text }]}>{(currentRequest.Distance / 1000).toFixed(1)} km</Text>
                    </View>
                  </View>

                  <View style={styles.requestDetailRow}>
                    <MaterialIcons name="access-time" size={24} color={colors.warning} />
                    <View style={styles.requestDetailTextContainer}>
                      <Text style={[styles.requestDetailLabel, { color: colors.textSecondary }]}>Passenger Rating</Text>
                      <Text style={[styles.requestDetailValue, { color: colors.text }]}>
                        {formatDuration(Math.ceil((currentRequest.Distance / 30) * 60))}
                      </Text>
                    </View>
                  </View>

                  {userLocation && currentRequest.PickupLocation && (
                    <View style={styles.requestDetailRow}>
                      <MaterialIcons name="person" size={24} color={colors.tint} />
                      <View style={styles.requestDetailTextContainer}>
                        <Text style={styles.requestDetailLabel}>Pickup ETA</Text>
                        <Text style={styles.requestDetailValue}>
                          {(() => {
                            const pickupDistanceKm = calculateDistance(
                              userLocation.lat,
                              userLocation.lng,
                              currentRequest.PickupLocation.lat,
                              currentRequest.PickupLocation.lng
                            );
                            const pickupEtaMinutes = Math.ceil((pickupDistanceKm / 30) * 60);
                            return `${formatDuration(pickupEtaMinutes)} (${pickupDistanceKm.toFixed(1)} km away)`;
                          })()}
                        </Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.requestDetailRow}>
                    <MaterialIcons name="star" size={24} color={colors.warning} />
                    <View style={styles.requestDetailTextContainer}>
                      <Text style={styles.requestDetailLabel}>Est. Completion</Text>
                      <Text style={styles.requestDetailValue}>
                        {formatETA(new Date(Date.now() + (currentRequest.Distance / 30) * 3600 * 1000))}
                      </Text>
                    </View>
                  </View>

                  {currentRequest.PickupLocation && (
                    <View style={styles.requestLocationInfo}>
                      <MaterialIcons name="place" size={20} color={colors.textSecondary} />
                      <Text style={[styles.requestLocationText, { color: colors.textSecondary }]}>
                        Pickup: {currentRequest.PickupLocation.lat.toFixed(4)}, {currentRequest.PickupLocation.lng.toFixed(4)}
                      </Text>
                    </View>
                  )}

                  {currentRequest.Destination && (
                    <View style={styles.requestLocationInfo}>
                      <MaterialIcons name="flag" size={20} color={colors.textSecondary} />
                      <Text style={[styles.requestLocationText, { color: colors.textSecondary }]}>
                        Destination: {currentRequest.Destination.lat.toFixed(4)}, {currentRequest.Destination.lng.toFixed(4)}
                      </Text>
                    </View>
                  )}
                </View>

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
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Set Your Vehicle Type</Text>
            <Text style={[styles.modalText, { color: colors.textSecondary }]}>Passengers will see this before requesting your ride.</Text>
            <View style={styles.vehicleOptionList}>
              {VEHICLE_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.vehicleOptionButton,
                    { borderColor: colors.border },
                    selectedVehicleType === type && { backgroundColor: colors.tint + '22', borderColor: colors.tint },
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
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
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
          <View style={[styles.ratingModalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Rate Your Driver</Text>
            <Text style={[styles.modalText, { color: colors.textSecondary }]}>How was your ride experience?</Text>
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
                    color={star <= selectedRating ? colors.warning : colors.textSecondary}
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
                {(conn.State === 'accepted' || conn.State === 'picked_up') && (
                  <TouchableOpacity
                    style={[styles.acceptButton, { backgroundColor: colors.success }]}
                    onPress={() => {
                      setActiveRequest(conn);
                      handleCancelConnection();
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel Ride</Text>
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
    marginBottom: 2,
  },
  destinationText: {
    fontSize: 16,
    fontWeight: '600',
  },
  exitButton: {
    marginLeft: 10,
    padding: 5,
  },
  centerButton: {
    position: 'absolute',
    top: 130,
    right: 10,
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
    opacity: 0.85,
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
    height: 60,
    paddingHorizontal: 10,
  },
  modeButtonBottom: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    opacity: 1,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  modeButtonLeft: {
  },
  modeButtonRight: {
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
    marginBottom: 10,
  },
  bottomSheetTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bottomSheetIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
  },
  detailText: {
    fontSize: 14,
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
  },
  vehicleConfirmNo: {
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  ratingModalContent: {
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
    fontSize: 16,
    fontWeight: '700',
  },
  customMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  markerArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
  },
  estimateContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  estimateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  estimateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  estimateItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  estimateTextContainer: {
    flex: 1,
  },
  estimateLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  estimateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  estimateCalculatingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  requestDetailCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  requestDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  requestDetailTextContainer: {
    flex: 1,
  },
  requestDetailLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  requestDetailValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  requestLocationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  requestLocationText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  balanceCheckContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  balanceCheckSufficient: {
    backgroundColor: '#e8f5e9',
  },
  balanceCheckInsufficient: {
    backgroundColor: '#ffebee',
  },
  balanceCheckText: {
    fontSize: 13,
    fontWeight: '600',
  },
  balanceCheckTextGreen: {
    color: '#2e7d32',
  },
  balanceCheckTextRed: {
    color: '#c62828',
  },
  requestButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
});

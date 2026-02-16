import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { Image } from 'expo-image';
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
import { darkMapStyle, lightMapStyle } from '@/constants/mapStyles';

const INDIA_EMERGENCY_NUMBER = '112';

export default function HomeScreen() {
  const router = useRouter();
  const { user, isAuthenticated, refreshUser } = useAuth();
  const { isDarkMode } = useTheme();
  const colors = Colors[isDarkMode ? 'dark' : 'light'];
  const {
    userState,
    setUserState,
    userLocation,
    destination,
    setDestination,
    markers,
    activeConnections,
    pendingRequests,
    isActive,
    refreshMarkers,
    refreshConnections,
    refreshRequests,
  } = useAppState();

  const mapRef = useRef<MapView>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showRequestPopup, setShowRequestPopup] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);
  const [ratingConnection, setRatingConnection] = useState<RideConnection | null>(null);
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [isPanicMode, setIsPanicMode] = useState(false);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [isExitingActive, setIsExitingActive] = useState(false);
  const previousActiveRequestIdRef = useRef<string | null>(null);
  const previousActiveRequestStateRef = useRef<string | null>(null);

  // Vehicle modal state
  const [showVehicleTypeModal, setShowVehicleTypeModal] = useState(false);
  const [selectedVehicleType, setSelectedVehicleType] = useState<VehicleType>(VEHICLE_TYPES[0]);
  const [isSavingVehicleType, setIsSavingVehicleType] = useState(false);
  const [modalVehicleName, setModalVehicleName] = useState('');
  const [modalVehicleModel, setModalVehicleModel] = useState('');
  const [modalVehicleRegistration, setModalVehicleRegistration] = useState('');

  // Trip estimate state for passenger preview
  const [tripEstimate, setTripEstimate] = useState<TripEstimate | null>(null);
  const [isCalculatingEstimate, setIsCalculatingEstimate] = useState(false);
  const [isRequestingRide, setIsRequestingRide] = useState(false);

  // Derive activeRequest from activeConnections (no duplicate state)
  const activeRequest = useMemo(() => {
    if (activeConnections.length === 0) return null;
    
    const myConnection = activeConnections.find(
      (c) => 
        (c.PassengerId === user?.Id || c.DriverId === user?.Id) &&
        c.State !== 'cancelled' && 
        c.State !== 'rejected' && 
        c.State !== 'completed'
    );
    return myConnection || null;
  }, [activeConnections, user?.Id]);

  // Derive currentRequest from pendingRequests (no duplicate state)
  const currentRequest = useMemo(() => {
    if (userState === 'driver' && pendingRequests.length > 0) {
      return pendingRequests[0];
    }
    return null;
  }, [pendingRequests, userState]);

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

  // Show request popup when currentRequest becomes available
  useEffect(() => {
    if (currentRequest) {
      setShowRequestPopup(true);
    }
  }, [currentRequest]);

  useEffect(() => {
    async function maybePromptRating() {
      if (!user || userState !== 'passenger') return;
      if (previousActiveRequestIdRef.current && !activeRequest) {
        await checkForPendingRating();
      }
      previousActiveRequestIdRef.current = activeRequest?.Id || null;
    }
    maybePromptRating();

    // Check for rejected requests (passenger only)
    if (userState === 'passenger') {
      const hadRequestBefore = previousActiveRequestIdRef.current !== null;
      const hasRequestNow = activeRequest !== null;
      const wasInRequestedState = previousActiveRequestStateRef.current === 'requested';

      // If passenger had a 'requested' state request and now it's gone (likely rejected by driver)
      if (hadRequestBefore && !hasRequestNow && wasInRequestedState) {
        Alert.alert(
          'Request Rejected',
          'The driver has declined your ride request. You can request another ride.',
          [{ text: 'OK' }]
        );
      }

      // Auto-exit active mode when ride completes (passenger only)
      const wasInActiveRide = previousActiveRequestStateRef.current === 'picked_up';
      if (hadRequestBefore && !hasRequestNow && wasInActiveRide && isActive) {
        // Ride just completed, exit active mode automatically for passenger
        setUserState('idle');
        setRouteCoordinates([]);
        setSearchQuery('');
        setIsPanicMode(false);
      }
    }

    // Update previous state reference
    previousActiveRequestStateRef.current = activeRequest?.State || null;
  }, [activeRequest, userState, user, checkForPendingRating, isActive, setDestination, setUserState]);

  useEffect(() => {
    if (!user || userState !== 'passenger') return;
    checkForPendingRating();
  }, [userState, user, checkForPendingRating]);

  useEffect(() => {
    if (user?.VehicleType) {
      setSelectedVehicleType(user.VehicleType);
    }
    if (user?.VehicleName) {
      setModalVehicleName(user.VehicleName);
    }
    if (user?.VehicleModel) {
      setModalVehicleModel(user.VehicleModel);
    }
    if (user?.VehicleRegistration) {
      setModalVehicleRegistration(user.VehicleRegistration);
    }
  }, [user?.VehicleType, user?.VehicleName, user?.VehicleModel, user?.VehicleRegistration]);

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
      if (selectedMarker && userState === 'passenger' && userLocation && destination) {
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
  }, [selectedMarker, userState, userLocation, destination]);

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
    // Set destination directly
    setDestination({ lat: place.lat, lng: place.lng });
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
    if (!destination) return;

    // Show loader immediately
    setIsLoadingRoute(true);

    if (selectedMode === 'driver' && !skipVehicleCheck) {
      // Check if vehicle details are complete
      const hasCompleteVehicleInfo = user?.VehicleType && 
                                      user?.VehicleName && 
                                      user?.VehicleModel && 
                                      user?.VehicleRegistration;
      
      if (!hasCompleteVehicleInfo) {
        setShowVehicleTypeModal(true);
        setIsLoadingRoute(false);
        return;
      }
    }

    // Check KYC for both modes - now mandatory
    if (!user?.IsKycVerified) {
      const modeText = selectedMode === 'driver' ? 'becoming a driver' : 'finding rides';
      Alert.alert(
        'KYC Verification Required',
        `You must complete KYC verification before ${modeText}. This ensures the safety and security of all users.`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => {
            setIsLoadingRoute(false);
          }},
          { text: 'Verify Now', onPress: () => {
            router.push('/kyc-verification' as any);
            setIsLoadingRoute(false);
          }}
        ]
      );
      return;
    }

    proceedWithModeActivation(selectedMode);
  }

  async function handleSaveVehicleTypeAndContinue() {
    if (!selectedVehicleType) {
      Alert.alert('Required', 'Please select a vehicle type');
      return;
    }

    if (!modalVehicleName.trim()) {
      Alert.alert('Required', 'Please enter vehicle name (e.g., Honda, Toyota)');
      return;
    }

    if (!modalVehicleModel.trim()) {
      Alert.alert('Required', 'Please enter vehicle model');
      return;
    }

    if (!modalVehicleRegistration.trim()) {
      Alert.alert('Required', 'Please enter vehicle registration number');
      return;
    }

    // Validate registration format
    const regPattern = /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}$/i;
    if (!regPattern.test(modalVehicleRegistration.trim())) {
      Alert.alert('Invalid Registration', 'Registration format should be like KL34C3423');
      return;
    }

    try {
      setIsSavingVehicleType(true);
      await api.updateVehicleDetails({
        vehicleType: selectedVehicleType,
        vehicleName: modalVehicleName.trim(),
        vehicleModel: modalVehicleModel.trim(),
        vehicleRegistration: modalVehicleRegistration.trim(),
      });
      await refreshUser();
      setShowVehicleTypeModal(false);
      await handleModeSelection('driver', true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save vehicle information');
    } finally {
      setIsSavingVehicleType(false);
    }
  }

  async function proceedWithModeActivation(selectedMode: 'driver' | 'passenger') {
    if (!destination || !userLocation) return;

    try {
      // Set userState
      setUserState(selectedMode);

      // If passenger mode, refresh markers to get available drivers
      let freshMarkers: MarkerData[] = [];
      if (selectedMode === 'passenger') {
        freshMarkers = await refreshMarkers(selectedMode);
      }

      // Fetch and draw route using OSRM API (free alternative to Google Directions)
      const routeResult = await getRoute(
        { lat: userLocation.lat, lng: userLocation.lng },
        { lat: destination.lat, lng: destination.lng }
      );

      if (routeResult && routeResult.coordinates.length > 0) {
        setRouteCoordinates(routeResult.coordinates);

        // Fit map to show entire route and nearest driver (for passengers)
        if (mapRef.current) {
          let coordinatesToFit = [...routeResult.coordinates];
          let nearestDriver: MarkerData | null = null;

          // If passenger mode, include nearest driver in map bounds
          if (selectedMode === 'passenger' && freshMarkers.length > 0) {
            // Find nearest driver
            let minDistance = Infinity;

            freshMarkers.forEach((marker) => {
              const distance = calculateDistance(
                userLocation.lat,
                userLocation.lng,
                marker.lastLocation.lat,
                marker.lastLocation.lng
              );
              if (distance < minDistance) {
                minDistance = distance;
                nearestDriver = marker;
              }
            });

            // Add nearest driver's location to coordinates for fitting
            if (nearestDriver) {
              const driver = nearestDriver as MarkerData;
              coordinatesToFit.push({
                latitude: driver.lastLocation.lat,
                longitude: driver.lastLocation.lng,
              });
            }
          }

          mapRef.current.fitToCoordinates(coordinatesToFit, {
            edgePadding: { top: 100, right: 50, bottom: 150, left: 50 },
            animated: true,
          });
        }
      }

      // Stop loading state
      setIsLoadingRoute(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to activate mode');
      setIsLoadingRoute(false);
    }
  }

  function handleClearSearch() {
    setDestination(null);
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

    // Prevent exiting if passenger has an active request
    if (userState === 'passenger' && activeRequest) {
      Alert.alert(
        'Cannot Exit Active Mode',
        'You have an active ride request. Please cancel it first or wait for it to complete.'
      );
      return;
    }

    Alert.alert('Exit Active Mode', 'Are you sure you want to exit?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Exit',
        onPress: async () => {
          try {
            // Show loader immediately when exiting
            setIsExitingActive(true);
            setIsLoadingRoute(true);

            setUserState('idle');
            setRouteCoordinates([]);
            setSearchQuery('');
            setIsPanicMode(false);

            // Clear loaders after everything is done
            setIsLoadingRoute(false);
            setIsExitingActive(false);
          } catch (error: any) {
            Alert.alert('Error', error.message);
            setIsLoadingRoute(false);
            setIsExitingActive(false);
          }
        },
      },
    ]);
  }

  async function handleMapPoiClick(event: any) {
    // Prevent place selection when in active mode
    if (isActive) {
      return;
    }

    const poi = event.nativeEvent;
    if (poi.coordinate) {
      const { latitude, longitude } = poi.coordinate;
      const destinationName = poi.name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

      // Set destination directly
      setDestination({ lat: latitude, lng: longitude });
      setSearchQuery(destinationName);
      Keyboard.dismiss();

      // Focus map on selected destination
      if (mapRef.current) {
        mapRef.current.animateToRegion(
          {
            latitude,
            longitude,
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

    // Prevent requesting ride from yourself
    if (marker.userId === user?.Id) {
      Alert.alert('Error', 'You cannot request a ride from yourself');
      return;
    }

    const minBalance = 150; // ₹150 minimum balance
    if (balance < minBalance) {
      Alert.alert(
        'Insufficient Balance',
        'You need at least ₹150 to request a ride. Please top up your wallet.',
        [{ text: 'Go to Account', onPress: () => router.push('/(tabs)/account') }]
      );
      return;
    }

    try {
      setIsRequestingRide(true);
      await api.requestRide(marker.userId, userLocation, destination);
      setSelectedMarker(null);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to request ride');
    } finally {
      setIsRequestingRide(false);
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
            Alert.alert('Success', 'Request cancelled');
            // Refresh connections to remove cancelled request from active list
            await refreshConnections();
            await refreshRequests();
          } catch (error: any) {
            Alert.alert('Error', error.message);
          }
        },
      },
    ]);
  }

  async function handleCancelConnection(connection?: RideConnection) {
    const connToCancel = connection || activeRequest;
    if (!connToCancel) return;

    const isDriver = userState === 'driver';
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
            const result = await api.cancelConnection(connToCancel.Id);
            
            if (result.penalty > 0) {
              Alert.alert(
                'Ride Cancelled',
                `${result.message}\nNew Balance: ₹${result.newBalance?.toFixed(2) || '0.00'}`,
                [{ text: 'OK', onPress: () => refreshUser() }]
              );
            } else {
              Alert.alert('Success', result.message);
            }
            
            // Refresh connections to remove cancelled ride from active list
            await refreshConnections();
            await refreshRequests();
            
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
      Alert.alert('Success', `Request ${action}`);
      // Refresh connections to remove rejected rides from active list
      await refreshConnections();
      await refreshRequests();
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



  async function handleCompleteRide(connectionId: string) {
    try {
      const { fare, paymentStatus, passengerPointsAwarded } = await api.completeRide(connectionId);
      const pointsLine = passengerPointsAwarded ? `\nYou earned ${passengerPointsAwarded} passenger points.` : '';
      Alert.alert('Ride Completed', `Payment ${paymentStatus}! Fare: ₹${fare.toFixed(2)}${pointsLine}`);
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
        customMapStyle={isDarkMode ? darkMapStyle : lightMapStyle}
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
          const markerIsDriver = userState === 'passenger';
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
        {destination ? (
          <Marker
            coordinate={{
              latitude: destination.lat,
              longitude: destination.lng
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
              showExternalLoader={isLoadingRoute}
            />
          </View>
        ) : (
          // Active mode: Show destination name with exit button
          <View style={[styles.destinationDisplay, { backgroundColor: colors.card }]}>
            <View style={styles.destinationTextContainer}>
              <Text style={[styles.destinationPrefix, { color: colors.textSecondary }]}>
                {userState === 'driver' ? 'Driving to' : 'Going to'}
              </Text>
              <Text style={[styles.destinationText, { color: colors.text }]} numberOfLines={1}>
                {searchQuery || 'Destination'}
              </Text>
            </View>
            {isLoadingRoute || isExitingActive ? (
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
      <TouchableOpacity 
        style={[
          styles.centerButton, 
          { backgroundColor: colors.card },
          isActive && styles.centerButtonActive
        ]} 
        onPress={centerOnUser}
      >
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
      {destination && !isActive && (
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
              },
            ]}
            onPress={() => handleModeSelection('passenger')}
            disabled={isLoadingRoute}
          >
            <MaterialIcons name="person" size={24} color="#fff" />
            <Text style={styles.modeButtonTextBottom}>Passenger</Text>
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
              },
            ]}
            onPress={() => handleModeSelection('driver')}
            disabled={isLoadingRoute}
          >
            <MaterialIcons name="drive-eta" size={24} color="#fff" />
            <Text style={styles.modeButtonTextBottom}>Driver</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Selected marker detail (passenger view in active mode) */}
      {selectedMarker && userState === 'passenger' && isActive && (
        <View style={[styles.bottomSheet, { backgroundColor: colors.card }]}>
          <View style={styles.bottomSheetHeader}>
            <View style={styles.bottomSheetTitleContainer}>
              {/* Profile Picture or Avatar */}
              {selectedMarker.profilePictureUrl ? (
                <Image
                  source={{ uri: selectedMarker.profilePictureUrl }}
                  style={styles.driverProfileImage}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.bottomSheetIcon, { backgroundColor: colors.info }]}>
                  <MaterialIcons name="drive-eta" size={16} color="#fff" />
                </View>
              )}
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
          
          {/* Vehicle Information */}
          <View style={styles.vehicleInfoSection}>
            <View style={styles.detailRow}>
              <MaterialIcons name="directions-car" size={16} color={colors.textSecondary} />
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                Vehicle: {selectedMarker.vehicle || 'N/A'}
              </Text>
            </View>
            {selectedMarker.vehicleName && (
              <View style={styles.detailRow}>
                <MaterialIcons name="info-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                  {selectedMarker.vehicleName}{selectedMarker.vehicleModel ? ` ${selectedMarker.vehicleModel}` : ''}
                </Text>
              </View>
            )}
            {selectedMarker.vehicleRegistration && (
              <View style={styles.detailRow}>
                <MaterialIcons name="pin" size={16} color={colors.textSecondary} />
                <Text style={[styles.detailText, { color: colors.text, fontFamily: 'Inter-SemiBold' }]}>
                  {selectedMarker.vehicleRegistration}
                </Text>
              </View>
            )}
          </View>

          {/* Trip Estimate Section */}
          {isCalculatingEstimate ? (
            <View style={[styles.estimateContainer, { backgroundColor: colors.background }]}>
              <ActivityIndicator size="small" color={colors.tint} />
              <Text style={[styles.estimateCalculatingText, { color: colors.textSecondary }]}>Calculating trip details...</Text>
            </View>
          ) : tripEstimate ? (
            <View style={[styles.estimateContainer, { backgroundColor: colors.background }]}>
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
              (tripEstimate && balance < tripEstimate.fare || isRequestingRide) && styles.requestButtonDisabled
            ]}
            onPress={() => handleRequestRide(selectedMarker)}
            disabled={tripEstimate ? balance < tripEstimate.fare || isRequestingRide : isRequestingRide}
          >
            {isRequestingRide ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.requestButtonText}>
                {tripEstimate && balance < tripEstimate.fare ? 'Insufficient Balance' : 'Request Ride'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Active request pane */}
      {activeRequest && userState === 'passenger' && !isMinimized && (
        <View style={[styles.bottomSheet, { backgroundColor: colors.card }]}>
          <View style={styles.bottomSheetHeader}>
            <Text style={[styles.bottomSheetTitle, { color: colors.text }]}>
              {activeRequest.State === 'picked_up' ? 'Active Ride' : 'Active Request'}
            </Text>
            <TouchableOpacity onPress={() => setIsMinimized(true)}>
              <Text style={[styles.closeButton, { color: colors.textSecondary }]}>−</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>Status: {activeRequest.State}</Text>

          {/* Trip Details */}
          {activeRequest.Fare && activeRequest.Distance && (
            <View style={[styles.estimateContainer, { backgroundColor: colors.background }]}>
              <Text style={[styles.estimateTitle, { color: colors.text }]}>Trip Details</Text>

              <View style={styles.estimateRow}>
                <View style={styles.estimateItem}>
                  <MaterialIcons name="payments" size={20} color={colors.tint} />
                  <View style={styles.estimateTextContainer}>
                    <Text style={[styles.estimateLabel, { color: colors.textSecondary }]}>Fare</Text>
                    <Text style={[styles.estimateValue, { color: colors.text }]}>{formatFare(activeRequest.Fare)}</Text>
                  </View>
                </View>

                <View style={styles.estimateItem}>
                  <MaterialIcons name="straighten" size={20} color={colors.tint} />
                  <View style={styles.estimateTextContainer}>
                    <Text style={[styles.estimateLabel, { color: colors.textSecondary }]}>Distance</Text>
                    <Text style={[styles.estimateValue, { color: colors.text }]}>{formatDistanceKm(activeRequest.Distance)}</Text>
                  </View>
                </View>
              </View>

              {activeRequest.RideTotalTime && (
                <View style={styles.estimateRow}>
                  <View style={styles.estimateItem}>
                    <MaterialIcons name="schedule" size={20} color={colors.tint} />
                    <View style={styles.estimateTextContainer}>
                      <Text style={[styles.estimateLabel, { color: colors.textSecondary }]}>Duration</Text>
                      <Text style={[styles.estimateValue, { color: colors.text }]}>{formatDuration(activeRequest.RideTotalTime)}</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Vehicle Information */}
          {activeRequest.RequestedVehicleType && (
            <View style={styles.vehicleInfoSection}>
              <View style={styles.detailRow}>
                <MaterialIcons name="directions-car" size={16} color={colors.textSecondary} />
                <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                  Expected Vehicle: {activeRequest.RequestedVehicleType}
                </Text>
              </View>
              {activeRequest.RequestedVehicleName && (
                <View style={styles.detailRow}>
                  <MaterialIcons name="info-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                    {activeRequest.RequestedVehicleName}
                    {activeRequest.RequestedVehicleModel ? ` ${activeRequest.RequestedVehicleModel}` : ''}
                  </Text>
                </View>
              )}
              {activeRequest.RequestedVehicleRegistration && (
                <View style={styles.detailRow}>
                  <MaterialIcons name="pin" size={16} color={colors.textSecondary} />
                  <Text style={[styles.detailText, { color: colors.text, fontFamily: 'Inter-SemiBold' }]}>
                    {activeRequest.RequestedVehicleRegistration}
                  </Text>
                </View>
              )}
            </View>
          )}

          {activeRequest.State === 'accepted' && activeRequest.OtpCode && (
            <>
              <Text style={[styles.otpText, { color: colors.tint }]}>OTP: {activeRequest.OtpCode}</Text>
              <Text style={[styles.otpInstructionText, { color: colors.textSecondary }]}>Share this OTP with your driver to confirm pickup</Text>
            </>
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
          {activeRequest.State === 'accepted' && (
            <TouchableOpacity style={[styles.cancelButton, { backgroundColor: colors.error }]} onPress={() => handleCancelConnection()}>
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
          <Text style={styles.minimizedText}>
            {activeRequest.State === 'picked_up' ? 'Active Ride' : 'Active Request'} - Tap to expand
          </Text>
        </TouchableOpacity>
      )}

      {/* Driver request popup */}
      <Modal visible={showRequestPopup} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Ride Request</Text>
            {currentRequest && (
              <>
                <View style={[styles.requestDetailCard, { backgroundColor: colors.background }]}>
                  <View style={styles.requestDetailRow}>
                    <MaterialIcons name="attach-money" size={24} color={colors.success} />
                    <View style={styles.requestDetailTextContainer}>
                      <Text style={[styles.requestDetailLabel, { color: colors.textSecondary }]}>Fare</Text>
                      <Text style={[styles.requestDetailValue, { color: colors.text }]}>₹{currentRequest.Fare.toFixed(2)}</Text>
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
                        <Text style={[styles.requestDetailLabel, { color: colors.textSecondary }]}>Pickup ETA</Text>
                        <Text style={[styles.requestDetailValue, { color: colors.text }]}>
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
                      <Text style={[styles.requestDetailLabel, { color: colors.textSecondary }]}>Est. Completion</Text>
                      <Text style={[styles.requestDetailValue, { color: colors.text }]}>
                        {formatETA(new Date(Date.now() + (currentRequest.Distance / 30) * 3600 * 1000))}
                      </Text>
                    </View>
                  </View>

                  {currentRequest.PickupLocation && (
                    <View style={[styles.requestLocationInfo, { borderTopColor: colors.border }]}>
                      <MaterialIcons name="place" size={20} color={colors.textSecondary} />
                      <Text style={[styles.requestLocationText, { color: colors.textSecondary }]}>
                        Pickup: {currentRequest.PickupLocation.lat.toFixed(4)}, {currentRequest.PickupLocation.lng.toFixed(4)}
                      </Text>
                    </View>
                  )}

                  {currentRequest.Destination && (
                    <View style={[styles.requestLocationInfo, { borderTopColor: colors.border }]}>
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

      {/* Vehicle details modal for drivers */}
      <Modal visible={showVehicleTypeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Complete Vehicle Information</Text>
            <Text style={[styles.modalText, { color: colors.textSecondary }]}>
              Please provide complete vehicle details. Passengers will use this to identify your vehicle.
            </Text>
            
            <Text style={[styles.modalSectionLabel, { color: colors.text }]}>Vehicle Type *</Text>
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
                      { color: selectedVehicleType === type ? colors.tint : colors.textSecondary },
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalSectionLabel, { color: colors.text }]}>Vehicle Name/Company *</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="e.g., Honda, Toyota, Maruti"
              placeholderTextColor={colors.textSecondary}
              value={modalVehicleName}
              onChangeText={setModalVehicleName}
              editable={!isSavingVehicleType}
            />

            <Text style={[styles.modalSectionLabel, { color: colors.text }]}>Model *</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="e.g., City, Innova, Swift"
              placeholderTextColor={colors.textSecondary}
              value={modalVehicleModel}
              onChangeText={setModalVehicleModel}
              editable={!isSavingVehicleType}
            />

            <Text style={[styles.modalSectionLabel, { color: colors.text }]}>Registration Number *</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="e.g., KL34C3423"
              placeholderTextColor={colors.textSecondary}
              value={modalVehicleRegistration}
              onChangeText={(text) => setModalVehicleRegistration(text.toUpperCase())}
              autoCapitalize="characters"
              editable={!isSavingVehicleType}
              maxLength={13}
            />

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
                style={[styles.modalButton, styles.acceptButton, isSavingVehicleType && styles.disabledActionButton]}
                onPress={handleSaveVehicleTypeAndContinue}
                disabled={isSavingVehicleType}
              >
                {isSavingVehicleType ? (
                  <ActivityIndicator size="small" color="#fff" />
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
      {userState === 'driver' && activeConnections.length > 0 && isActive && (
        <View style={[styles.connectionManager, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <Text style={[styles.connectionTitle, { color: colors.text }]}>Active Connections</Text>
          <ScrollView style={styles.connectionList}>
            {activeConnections.map((conn) => (
              <View key={conn.Id} style={[styles.connectionItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.connectionText, { color: colors.text }]}>Status: {conn.State}</Text>
                <TouchableOpacity
                  style={styles.driverShareButton}
                  onPress={() => handleShareRide(conn.Id)}
                >
                  <Text style={styles.driverShareButtonText}>Share Ride Link</Text>
                </TouchableOpacity>
                {conn.State === 'accepted' && (
                  <View style={styles.otpEntry}>
                    <TextInput
                      style={[styles.otpInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                      placeholder="Enter 6-digit OTP"
                      placeholderTextColor={colors.textSecondary}
                      maxLength={6}
                      keyboardType="numeric"
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
                    onPress={() => handleCancelConnection(conn)}
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
    fontFamily: 'Inter-Regular',
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
    fontFamily: 'Inter-Regular',
    marginBottom: 2,
  },
  destinationText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
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
  centerButtonActive: {
    top: 140,
  },
  panicButton: {
    position: 'absolute',
    top: 200,
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
    fontFamily: 'Inter-Bold',
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

  modeButtonTextBottom: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
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
     width: 32,
     height: 32,
     borderRadius: 16,
     alignItems: 'center',
     justifyContent: 'center',
   },
   driverProfileImage: {
     width: 32,
     height: 32,
     borderRadius: 16,
     backgroundColor: '#E0E0E0',
   },
  bottomSheetTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  closeButton: {
    fontSize: 24,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  detailText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#333',
  },
  otpText: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#e86713',
    marginBottom: 10,
    textAlign: 'center',
  },
  otpInstructionText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    marginTop: 4,
    marginBottom: 8,
    textAlign: 'center',
  },
  vehicleInfoSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
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
    fontFamily: 'Inter-Bold',
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
    fontFamily: 'Inter-Bold',
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
    fontFamily: 'Inter-Bold',
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
    fontFamily: 'Inter-Bold',
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
    fontFamily: 'Inter-Bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
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
    fontFamily: 'Inter-Bold',
  },
  vehicleOptionList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginBottom: 12,
  },
  vehicleOptionButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  vehicleOptionText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },

  modalSectionLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginTop: 12,
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    marginBottom: 8,
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
    borderTopWidth: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  connectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 10,
  },
  connectionList: {
    flexShrink: 1,
  },
  connectionItem: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
  },
  connectionText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
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
    fontFamily: 'Inter-Bold',
    fontSize: 14,
  },
  otpEntry: {
    marginTop: 10,
  },
  otpInput: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
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
    fontFamily: 'Inter-Bold',
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
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  estimateTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
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
    fontFamily: 'Inter-Regular',
    marginBottom: 2,
  },
  estimateValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  estimateCalculatingText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginLeft: 8,
  },
  requestDetailCard: {
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
    fontFamily: 'Inter-Regular',
    marginBottom: 2,
  },
  requestDetailValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  requestLocationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  requestLocationText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
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
    fontFamily: 'Inter-SemiBold',
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

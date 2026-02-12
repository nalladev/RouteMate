import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import PlacesAutocomplete from '@/components/PlacesAutocomplete';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useAppState } from '@/contexts/AppStateContext';
import { MarkerData, RideConnection } from '@/types';
import { api } from '@/utils/api';

export default function HomeScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
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
  const searchInputRef = useRef<TextInput>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);
  const [activeRequest, setActiveRequest] = useState<RideConnection | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showRequestPopup, setShowRequestPopup] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<RideConnection | null>(null);
  const [showPlacesSearch, setShowPlacesSearch] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);

  // New state for mode selection flow
  const [tempDestination, setTempDestination] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [isSelectingMode, setIsSelectingMode] = useState(false);


  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

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
      if (myConnection) {
        setActiveRequest(myConnection);
      }
    }
  }, [activeConnections, user]);

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

  function handleSearchDestination() {
    setShowPlacesSearch(true);
  }

  function handleSearchBlur() {
    if (!tempDestination && !showPlacesSearch) {
      searchInputRef.current?.blur();
    }
  }

  async function handlePlaceSelected(place: any) {
    // Nominatim format: place contains lat, lon, and display_name
    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);
    const destinationName = place.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;

    if (!isNaN(lat) && !isNaN(lon)) {
      // Store temporarily and show mode selection buttons
      setTempDestination({ lat, lng: lon, name: destinationName });
      setSearchQuery(destinationName);
      setShowPlacesSearch(false);
      Keyboard.dismiss();
    }
  }

  async function handleModeSelection(selectedMode: 'driver' | 'passenger') {
    if (!tempDestination || isSelectingMode) return;

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

  async function proceedWithModeActivation(selectedMode: 'driver' | 'passenger') {
    if (!tempDestination || !userLocation) return;

    try {
      // Set destination
      setDestination({ lat: tempDestination.lat, lng: tempDestination.lng });

      // Fetch and draw route using OSRM (Open Source Routing Machine)
      const url = `https://router.project-osrm.org/route/v1/driving/${userLocation.lng},${userLocation.lat};${tempDestination.lng},${tempDestination.lat}?overview=full&geometries=polyline`;

      const response = await fetch(url);
      const result = await response.json();

      if (result.routes && result.routes.length > 0) {
        const points = result.routes[0].geometry;
        const decodedPoints = decodePolyline(points);
        setRouteCoordinates(decodedPoints);

        // Fit map to show entire route
        if (mapRef.current) {
          mapRef.current.fitToCoordinates(decodedPoints, {
            edgePadding: { top: 100, right: 50, bottom: 150, left: 50 },
            animated: true,
          });
        }
      }

      // Update user state to active mode
      const state = selectedMode === 'driver' ? 'driving' : 'riding';
      await updateUserState(state, { lat: tempDestination.lat, lng: tempDestination.lng });

      // Clear temporary state
      setTempDestination(null);
      setIsSelectingMode(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to activate mode');
      setTempDestination(null);
      setSearchQuery('');
      setIsSelectingMode(false);
    }
  }

  // Decode Google's encoded polyline format
  function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
    const points: { latitude: number; longitude: number }[] = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }

    return points;
  }

  function handleCancelPlacesSearch() {
    setShowPlacesSearch(false);
    Keyboard.dismiss();
    searchInputRef.current?.blur();
  }

  function handleExitActive() {
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
      
      // Close Places search and blur input
      setShowPlacesSearch(false);
      searchInputRef.current?.blur();
      Keyboard.dismiss();
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

  async function handleCompleteRide(connectionId: string) {
    try {
      const { fare, paymentStatus } = await api.completeRide(connectionId);
      Alert.alert('Ride Completed', `Payment ${paymentStatus}! Fare: ₹${fare.toFixed(2)}`);
      setActiveRequest(null);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
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
          searchInputRef.current?.blur();
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
          !showPlacesSearch ? (
            <View style={styles.searchInputContainer}>
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder="Search destination..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={handleSearchDestination}
                onBlur={handleSearchBlur}
                editable={!tempDestination}
              />
              {tempDestination && (
                <View style={styles.clearButtonWrapper} pointerEvents="box-none">
                  <TouchableOpacity
                    style={styles.clearButton}
                    activeOpacity={0.7}
                    onPress={() => {
                      setTempDestination(null);
                      setSearchQuery('');
                      setShowPlacesSearch(false);
                    }}
                  >
                    <MaterialIcons name="close" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.placesSearchContainer}>
              <PlacesAutocomplete
                placeholder="Search destination..."
                onPlaceSelected={handlePlaceSelected}
                onCancel={handleCancelPlacesSearch}
                autoFocus={true}
              />
            </View>
          )
        ) : (
          // Active mode: Show destination name with exit button
          <View style={styles.destinationDisplay}>
            <Text style={styles.destinationText} numberOfLines={1}>
              {searchQuery || 'Destination'}
            </Text>
            <TouchableOpacity style={styles.exitButton} onPress={handleExitActive}>
              <MaterialIcons name="close" size={24} color="#e86713" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Center on user button */}
      <TouchableOpacity style={styles.centerButton} onPress={centerOnUser}>
        <MaterialIcons name="my-location" size={24} color="#e86713" />
      </TouchableOpacity>

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
          <Text style={styles.detailText}>Rating: {selectedMarker.rating || 'N/A'}</Text>
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
          {activeRequest.State === 'accepted' && activeRequest.OtpCode && (
            <Text style={styles.otpText}>OTP: {activeRequest.OtpCode}</Text>
          )}
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

      {/* Connection Manager for drivers */}
      {role === 'driver' && activeConnections.length > 0 && isActive && (
        <View style={styles.connectionManager}>
          <Text style={styles.connectionTitle}>Active Connections</Text>
          <ScrollView style={styles.connectionList}>
            {activeConnections.map((conn) => (
              <View key={conn.Id} style={styles.connectionItem}>
                <Text style={styles.connectionText}>Status: {conn.State}</Text>
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
  searchInputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    height: 50,
    paddingHorizontal: 15,
    paddingRight: 45,
    borderRadius: 8,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  clearButtonWrapper: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 15,
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
  destinationText: {
    flex: 1,
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
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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

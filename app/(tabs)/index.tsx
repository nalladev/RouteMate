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
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useAppState } from '@/contexts/AppStateContext';
import { MarkerData, RideConnection } from '@/types';
import { api } from '@/utils/api';
import { GOOGLE_MAPS_API_KEY } from '@/config/env';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);
  const [activeRequest, setActiveRequest] = useState<RideConnection | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showRequestPopup, setShowRequestPopup] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<RideConnection | null>(null);
  const [showPlacesSearch, setShowPlacesSearch] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);

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

  async function handlePlaceSelected(data: any, details: any) {
    if (details?.geometry?.location) {
      const { lat, lng } = details.geometry.location;
      setDestination({ lat, lng });
      setSearchQuery(data.description || '');
      setShowPlacesSearch(false);
      Keyboard.dismiss();
      
      // Fetch route from Google Directions API
      if (userLocation) {
        try {
          const origin = `${userLocation.lat},${userLocation.lng}`;
          const destination = `${lat},${lng}`;
          const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${GOOGLE_MAPS_API_KEY}`;
          
          const response = await fetch(url);
          const result = await response.json();
          
          if (result.routes && result.routes.length > 0) {
            const points = result.routes[0].overview_polyline.points;
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
        } catch (error) {
          console.error('Error fetching route:', error);
        }
      }
      
      // Automatically enter active mode (riding or driving based on role)
      try {
        const state = role === 'driver' ? 'driving' : 'riding';
        await updateUserState(state, { lat, lng });
      } catch (error: any) {
        Alert.alert('Error', error.message);
      }
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
          } catch (error: any) {
            Alert.alert('Error', error.message);
          }
        },
      },
    ]);
  }

  async function handleRequestRide(marker: MarkerData) {
    if (!userLocation || !destination) return;

    // Recommend KYC verification for passengers (non-blocking)
    if (!user?.IsKycVerified) {
      Alert.alert(
        'KYC Verification Recommended',
        'For enhanced security and trust, we recommend completing KYC verification. You can still request rides without it.',
        [
          { text: 'Verify Later', style: 'cancel', onPress: () => proceedWithRideRequest(marker) },
          { text: 'Verify Now', onPress: () => router.push('/kyc-verification' as any) }
        ]
      );
      return;
    }

    proceedWithRideRequest(marker);
  }

  async function proceedWithRideRequest(marker: MarkerData) {
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
        onPoiClick={async (event) => {
          const poi = event.nativeEvent;
          if (poi.coordinate && poi.name) {
            const { latitude, longitude } = poi.coordinate;
            setDestination({ lat: latitude, lng: longitude });
            setSearchQuery(poi.name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
            
            // Fetch route from Google Directions API
            if (userLocation) {
              try {
                const origin = `${userLocation.lat},${userLocation.lng}`;
                const destination = `${latitude},${longitude}`;
                const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${GOOGLE_MAPS_API_KEY}`;
                
                const response = await fetch(url);
                const result = await response.json();
                
                if (result.routes && result.routes.length > 0) {
                  const points = result.routes[0].overview_polyline.points;
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
              } catch (error) {
                console.error('Error fetching route:', error);
              }
            }
            
            // Automatically enter active mode
            try {
              const state = role === 'driver' ? 'driving' : 'riding';
              await updateUserState(state, { lat: latitude, lng: longitude });
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          }
        }}
      >
        {markers.map((marker) => (
          <Marker
            key={marker.userId}
            coordinate={{ latitude: marker.lastLocation.lat, longitude: marker.lastLocation.lng }}
            title={marker.name}
            onPress={() => setSelectedMarker(marker)}
          />
        ))}

        {/* Destination marker (red pin like Google Maps) */}
        {destination && (
          <Marker
            coordinate={{ latitude: destination.lat, longitude: destination.lng }}
            title="Destination"
            pinColor="red"
          />
        )}

        {/* Route polyline - only show when route is fetched */}
        {routeCoordinates.length > 0 && isActive && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#4285F4"
            strokeWidth={4}
          />
        )}
      </MapView>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        {!showPlacesSearch ? (
          <TextInput
            style={styles.searchInput}
            placeholder="Search destination..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={handleSearchDestination}
          />
        ) : (
          <View style={styles.placesSearchContainer}>
            <GooglePlacesAutocomplete
              placeholder="Search destination..."
              onPress={handlePlaceSelected}
              query={{
                key: GOOGLE_MAPS_API_KEY,
                language: 'en',
              }}
              fetchDetails={true}
              enablePoweredByContainer={false}
              onFail={() => {
                Alert.alert(
                  'Search Unavailable', 
                  'Location search requires Google Places API with billing enabled. You can tap anywhere on the map to set your destination instead.',
                  [{ text: 'OK', onPress: handleCancelPlacesSearch }]
                );
              }}
              textInputProps={{
                autoFocus: true,
                onBlur: handleCancelPlacesSearch,
              }}
              styles={{
                container: {
                  flex: 0,
                },
                textInputContainer: {
                  backgroundColor: '#fff',
                  borderTopWidth: 0,
                  borderBottomWidth: 0,
                },
                textInput: {
                  height: 44,
                  color: '#000',
                  fontSize: 16,
                  backgroundColor: '#fff',
                  borderRadius: 8,
                  paddingHorizontal: 15,
                },
                listView: {
                  backgroundColor: '#fff',
                  borderRadius: 8,
                  marginTop: 4,
                },
              }}
            />
          </View>
        )}
        {isActive && (
          <TouchableOpacity style={styles.exitButton} onPress={handleExitActive}>
            <Text style={styles.exitButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Center on user button */}
      <TouchableOpacity style={styles.centerButton} onPress={centerOnUser}>
        <MaterialIcons name="my-location" size={24} color="#e86713" />
      </TouchableOpacity>

      {/* Role toggle */}
      <View style={styles.roleToggle}>
        <TouchableOpacity
          style={[styles.roleButton, role === 'passenger' && styles.roleButtonActive]}
          onPress={() => {
            setRole('passenger');
          }}
        >
          <Text style={[styles.roleButtonText, role === 'passenger' && styles.roleButtonTextActive]}>
            Passenger
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.roleButton, role === 'driver' && styles.roleButtonActive]}
          onPress={() => {
            if (!user?.IsKycVerified) {
              Alert.alert(
                'KYC Verification Required',
                'You must complete KYC verification before becoming a driver. This ensures the safety and security of all users.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Verify Now', onPress: () => router.push('/kyc-verification' as any) }
                ]
              );
              return;
            }
            setRole('driver');
          }}
        >
          <Text style={[styles.roleButtonText, role === 'driver' && styles.roleButtonTextActive]}>
            Driver
          </Text>
        </TouchableOpacity>
      </View>

      {/* Selected marker detail */}
      {selectedMarker && role === 'passenger' && (
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
      {role === 'driver' && activeConnections.length > 0 && (
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
    top: 50,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    zIndex: 1000,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  placesSearchContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exitButton: {
    marginLeft: 10,
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
  exitButtonText: {
    fontSize: 24,
    color: '#333',
  },
  centerButton: {
    position: 'absolute',
    top: 120,
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
  centerButtonText: {
    fontSize: 24,
  },
  roleToggle: {
    position: 'absolute',
    bottom: 20,
    left: 10,
    right: 10,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  roleButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRadius: 20,
  },
  roleButtonActive: {
    backgroundColor: '#e86713',
  },
  roleButtonText: {
    fontSize: 16,
    color: '#333',
  },
  roleButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 150,
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
  },
  otpText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 15,
    color: '#e86713',
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
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  minimizedBar: {
    position: 'absolute',
    bottom: 150,
    left: 10,
    right: 10,
    backgroundColor: '#e86713',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  minimizedText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 10,
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
  acceptButton: {
    backgroundColor: '#34C759',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  connectionManager: {
    position: 'absolute',
    bottom: 150,
    left: 10,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
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
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 10,
  },
  connectionText: {
    fontSize: 14,
    marginBottom: 5,
  },
  otpEntry: {
    marginTop: 10,
  },
  otpInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  completeButton: {
    backgroundColor: '#34C759',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../utils/api';
import { Location } from '../types';

// Predefined test locations
const TEST_LOCATIONS = {
  JOSH_PAVILION: { lat: 9.916753188760277, lng: 76.68918886912743, name: 'Josh Pavilion' },
  SMITA_HOSPITAL: { lat: 9.910506727770638, lng: 76.70018821394399, name: 'Smita Hospital' },
  VENGALLOOR: { lat: 9.908799342158796, lng: 76.70249383321571, name: 'Vengalloor' },
};

// Predefined test profiles
const TEST_PROFILES = {
  DRIVER: {
    name: 'Test Driver',
    role: 'driver' as const,
    location: TEST_LOCATIONS.JOSH_PAVILION,
    vehicleType: 'Hatchback',
    vehicleName: 'Maruti Swift',
    vehicleModel: '2020',
    vehicleRegistration: 'KL01AB1234',
  },
  PASSENGER: {
    name: 'Test Passenger',
    role: 'passenger' as const,
    location: TEST_LOCATIONS.SMITA_HOSPITAL,
    destination: TEST_LOCATIONS.VENGALLOOR,
  },
};

interface TestUserPanelProps {
  visible: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
}

export function TestUserPanel({
  visible,
  onClose,
  isDarkMode = false,
}: TestUserPanelProps) {
  const [testUserActive, setTestUserActive] = useState(false);
  const [testUserInfo, setTestUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [autoMoving, setAutoMoving] = useState(false);
  const [updateInterval, setUpdateInterval] = useState<any>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null);
  const [connectionRequests, setConnectionRequests] = useState<any[]>([]);
  const [acceptedConnections, setAcceptedConnections] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [otpInputs, setOtpInputs] = useState<{ [key: string]: string }>({});
  const [verifyingOtp, setVerifyingOtp] = useState<{ [key: string]: boolean }>({});
  const [completingRide, setCompletingRide] = useState<{ [key: string]: boolean }>({});

  const colors = {
    background: isDarkMode ? '#1a1a1a' : '#ffffff',
    card: isDarkMode ? '#2a2a2a' : '#f5f5f5',
    text: isDarkMode ? '#ffffff' : '#000000',
    textSecondary: isDarkMode ? '#aaaaaa' : '#666666',
    border: isDarkMode ? '#444444' : '#dddddd',
    primary: '#007AFF',
    success: '#34C759',
    danger: '#FF3B30',
    warning: '#FF9500',
  };

  const fetchConnectionRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const requestsResponse = await api.getRequests(true);
      setConnectionRequests(requestsResponse.requests || []);

      const connectionsResponse = await api.getConnections(true);
      setAcceptedConnections(connectionsResponse.connections || []);
    } catch (error: any) {
      console.error('[TestUserPanel] Failed to fetch requests:', error);
      Alert.alert('Error', `Failed to fetch requests: ${error.message || 'Unknown error'}`);
      setConnectionRequests([]);
      setAcceptedConnections([]);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  const checkTestUserStatus = useCallback(async () => {
    try {
      const response = await api.testGetStatus();
      setTestUserActive(response.exists);
      setTestUserInfo(response.user || null);

      // Reset selections first
      setSelectedLocation(null);
      setSelectedDestination(null);

      // Update selected location and destination based on current test user info
      if (response.exists && response.user?.location) {
        const matchedLocation = Object.entries(TEST_LOCATIONS).find(([key, loc]) =>
          Math.abs(loc.lat - response.user.location.lat) < 0.0001 &&
          Math.abs(loc.lng - response.user.location.lng) < 0.0001
        );
        if (matchedLocation) {
          setSelectedLocation(matchedLocation[0]);
        }
      }

      if (response.exists && response.user?.destination) {
        const matchedDestination = Object.entries(TEST_LOCATIONS).find(([key, loc]) =>
          Math.abs(loc.lat - response.user.destination.lat) < 0.0001 &&
          Math.abs(loc.lng - response.user.destination.lng) < 0.0001
        );
        if (matchedDestination) {
          setSelectedDestination(matchedDestination[0]);
        }
      }

      // Auto-fetch connection requests if user is a driver (state: 'driving')
      if (response.exists && response.user?.state === 'driving') {
        fetchConnectionRequests();
      }
    } catch (error: any) {
      console.error('[BackendTestUserPanel] Failed to check test user status:', error);
      console.error('[BackendTestUserPanel] Error details:', error.message || error);
      setTestUserActive(false);
      setTestUserInfo(null);
      setSelectedLocation(null);
      setSelectedDestination(null);
      setConnectionRequests([]);
      setAcceptedConnections([]);
    }
  }, [fetchConnectionRequests]);

  useEffect(() => {
    if (visible) {
      setInitialLoading(true);
      checkTestUserStatus().finally(() => setInitialLoading(false));
    }
  }, [visible, checkTestUserStatus]);

  useEffect(() => {
    return () => {
      if (updateInterval) {
        clearInterval(updateInterval);
      }
    };
  }, [updateInterval]);

  const handleAcceptRequest = async (requestId: string) => {
    setLoadingRequests(true);
    try {
      await api.respondToRequest(requestId, 'accepted', true);
      Alert.alert('Success', 'Request accepted');
      await fetchConnectionRequests();
      await checkTestUserStatus();
    } catch (error: any) {
      console.error('[TestUserPanel] Failed to accept request:', error);
      Alert.alert('Error', `Failed to accept request: ${error.message || 'Unknown error'}`);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setLoadingRequests(true);
    try {
      await api.respondToRequest(requestId, 'rejected', true);
      Alert.alert('Success', 'Request rejected');
      await fetchConnectionRequests();
    } catch (error: any) {
      console.error('[TestUserPanel] Failed to reject request:', error);
      Alert.alert('Error', `Failed to reject request: ${error.message || 'Unknown error'}`);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleVerifyOtp = async (connectionId: string) => {
    const otp = otpInputs[connectionId];
    if (!otp || otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    try {
      await api.verifyOtp(connectionId, otp, true);
      Alert.alert('Success', 'OTP verified! Passenger picked up.');
      setOtpInputs({ ...otpInputs, [connectionId]: '' });
      await fetchConnectionRequests();
    } catch (error: any) {
      console.error('[TestUserPanel] Failed to verify OTP:', error);
      Alert.alert('Error', `Failed to verify OTP: ${error.message || 'Invalid OTP'}`);
    } finally {
      setVerifyingOtp({ ...verifyingOtp, [connectionId]: false });
    }
  };

  const handleCompleteRide = async (connectionId: string) => {
    setLoadingRequests(true);
    try {
      const result = await api.completeRide(connectionId, true);
      const pointsLine = result.passengerPointsAwarded ? `\nYou earned ${result.passengerPointsAwarded} passenger points.` : '';
      Alert.alert('Success', `Ride completed! Payment ${result.paymentStatus}. Fare: ₹${result.fare.toFixed(2)}${pointsLine}`);
      await fetchConnectionRequests();
      await checkTestUserStatus();
    } catch (error: any) {
      console.error('[TestUserPanel] Failed to complete ride:', error);
      Alert.alert('Error', `Failed to complete ride: ${error.message || 'Unknown error'}`);
    } finally {
      setCompletingRide({ ...completingRide, [connectionId]: false });
    }
  };

  const handleSpawnUser = async (profileKey: string, destinationKey?: string) => {
    setLoading(true);
    try {
      const profile = TEST_PROFILES[profileKey as keyof typeof TEST_PROFILES];

      let destination = 'destination' in profile ? profile.destination : undefined;

      // For driver, use selected destination
      if (profile.role === 'driver' && destinationKey) {
        const destLocation = TEST_LOCATIONS[destinationKey as keyof typeof TEST_LOCATIONS];
        destination = destLocation;
      }

      await api.testSpawnUser({
        name: profile.name,
        role: profile.role,
        location: profile.location,
        destination,
        vehicleType: 'vehicleType' in profile ? profile.vehicleType : undefined,
        vehicleName: 'vehicleName' in profile ? profile.vehicleName : undefined,
        vehicleModel: 'vehicleModel' in profile ? profile.vehicleModel : undefined,
        vehicleRegistration: 'vehicleRegistration' in profile ? profile.vehicleRegistration : undefined,
      });

      // Set the user to active state
      const state = profile.role === 'driver' ? 'driving' : 'riding';
      await api.testSetState(state, destination);

      await checkTestUserStatus();
    } catch (error: any) {
      console.error('[BackendTestUserPanel] Spawn error:', error);
      Alert.alert('Error', `Failed to spawn: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSpawnDriver = (destinationKey: string) => {
    handleSpawnUser('DRIVER', destinationKey);
  };

  const handleUpdateLocation = async (location: typeof TEST_LOCATIONS[keyof typeof TEST_LOCATIONS], key: string) => {
    try {
      setLoading(true);
      setSelectedLocation(key);
      await api.testUpdateLocation(location);
      await checkTestUserStatus();
    } catch (error: any) {
      console.error('[TestUserPanel] Failed to update location:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMove = async (direction: 'north' | 'south' | 'east' | 'west') => {
    if (!testUserInfo?.location) return;

    const distanceKm = 0.5;
    const lat = testUserInfo.location.lat;

    const latDelta = distanceKm / 111;
    const lngDelta = distanceKm / (111 * Math.cos((lat * Math.PI) / 180));

    let newLocation = { ...testUserInfo.location };

    switch (direction) {
      case 'north':
        newLocation.lat += latDelta;
        break;
      case 'south':
        newLocation.lat -= latDelta;
        break;
      case 'east':
        newLocation.lng += lngDelta;
        break;
      case 'west':
        newLocation.lng -= lngDelta;
        break;
    }

    await api.testUpdateLocation(newLocation);
    await checkTestUserStatus();
  };

  const startAutoMovement = async () => {
    if (!testUserInfo?.location || !testUserInfo?.destination) {
      return;
    }

    setAutoMoving(true);

    // Generate route points
    const start = testUserInfo.location;
    const end = testUserInfo.destination;
    const numPoints = 30;
    const routePoints: Location[] = [];

    for (let i = 0; i <= numPoints; i++) {
      const ratio = i / numPoints;
      routePoints.push({
        lat: start.lat + (end.lat - start.lat) * ratio,
        lng: start.lng + (end.lng - start.lng) * ratio,
      });
    }

    let currentIndex = 0;

    const interval = setInterval(async () => {
      currentIndex++;

      if (currentIndex >= routePoints.length) {
        clearInterval(interval);
        setAutoMoving(false);
        setUpdateInterval(null);
        return;
      }

      const nextLocation = routePoints[currentIndex];
      try {
        await api.testUpdateLocation(nextLocation);
      } catch {
        // Silently fail auto-movement updates
      }
    }, 3000); // Update every 3 seconds

    setUpdateInterval(interval);
  };

  const stopAutoMovement = () => {
    if (updateInterval) {
      clearInterval(updateInterval);
      setUpdateInterval(null);
    }
    setAutoMoving(false);
  };

  const handleDespawn = async () => {
    Alert.alert(
      'Delete Test User',
      'This will permanently delete the test user document. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              if (updateInterval) {
                clearInterval(updateInterval);
                setUpdateInterval(null);
              }
              setAutoMoving(false);

              await api.testDespawn();
              await checkTestUserStatus();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete test user');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.panel, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="server" size={24} color={colors.warning} />
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Backend Test User
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Initial Loading */}
            {initialLoading && (
              <View style={[styles.section, { backgroundColor: colors.card, alignItems: 'center', padding: 40 }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.statusLabel, { color: colors.textSecondary, marginTop: 16 }]}>
                  Checking test user status...
                </Text>
              </View>
            )}

            {/* Create Test User Button */}
            {!initialLoading && !testUserActive && (
              <View style={[styles.section, { backgroundColor: colors.card, alignItems: 'center', padding: 40 }]}>
                <Ionicons name="person-add" size={48} color={colors.primary} style={{ marginBottom: 16 }} />
                <Text style={[styles.sectionTitle, { color: colors.text, textAlign: 'center', marginBottom: 8 }]}>
                  No Test User
                </Text>
                <Text style={[styles.description, { color: colors.textSecondary, textAlign: 'center', marginBottom: 24 }]}>
                  Create a virtual test user to test driver/passenger discovery and ride features.
                </Text>
                <TouchableOpacity
                  style={[styles.createButton, { backgroundColor: colors.primary }]}
                  onPress={() => handleSpawnDriver('SMITA_HOSPITAL')}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="add-circle" size={24} color="#fff" />
                      <Text style={[styles.createButtonText, { color: '#fff' }]}>
                        Create Test User
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Status */}
            {testUserActive && testUserInfo && (
              <View style={[styles.section, { backgroundColor: colors.card }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Test User Status
                </Text>
                <View style={styles.statusRow}>
                  <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
                    🟢 Active
                  </Text>
                  <Text style={[styles.statusValue, { color: colors.text }]}>
                    {testUserInfo.name}
                  </Text>
                </View>

                <View style={styles.statusRow}>
                  <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
                    State:
                  </Text>
                  <Text style={[styles.statusValue, { color: colors.text }]}>
                    {testUserInfo.state}
                  </Text>
                </View>
                {testUserInfo.location && (
                  <View style={styles.statusRow}>
                    <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
                      Location:
                    </Text>
                    <Text style={[styles.statusValue, { color: colors.text }]}>
                      {testUserInfo.location.lat.toFixed(4)}, {testUserInfo.location.lng.toFixed(4)}
                    </Text>
                  </View>
                )}
                {autoMoving && (
                  <View style={styles.statusRow}>
                    <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
                      Auto-Moving:
                    </Text>
                    <Text style={[styles.statusValue, { color: colors.success }]}>
                      Yes
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Connection Requests & Connections Section */}
            {testUserActive && testUserInfo?.state === 'driving' && (
              <View style={[styles.section, { backgroundColor: colors.card }]}>
                <View style={styles.autoMoveRow}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Connections
                  </Text>
                  <TouchableOpacity
                    style={[styles.controlButton, { backgroundColor: colors.primary }]}
                    onPress={fetchConnectionRequests}
                    disabled={loadingRequests}
                  >
                    {loadingRequests ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="refresh" size={16} color="#fff" />
                        <Text style={styles.controlButtonText}>Reload</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Pending Requests */}
                <Text style={[styles.subSectionTitle, { color: colors.text }]}>
                  Pending Requests ({connectionRequests.length})
                </Text>
                {connectionRequests.length === 0 ? (
                  <Text style={[styles.description, { color: colors.textSecondary, textAlign: 'center', marginTop: 4, marginBottom: 12 }]}>
                    No pending requests
                  </Text>
                ) : (
                  connectionRequests.map((request) => (
                    <View
                      key={request.Id}
                      style={[
                        styles.requestCard,
                        { backgroundColor: colors.background, borderColor: colors.border }
                      ]}
                    >
                      <View style={styles.requestInfo}>
                        <Text style={[styles.requestLabel, { color: colors.textSecondary }]}>
                          Passenger
                        </Text>
                        <Text style={[styles.requestValue, { color: colors.text }]}>
                          {request.PassengerId?.substring(0, 8)}...
                        </Text>
                      </View>

                      <View style={styles.requestInfo}>
                        <Text style={[styles.requestLabel, { color: colors.textSecondary }]}>
                          Pickup
                        </Text>
                        <Text style={[styles.requestValue, { color: colors.text }]}>
                          {request.PickupLocation?.lat?.toFixed(4)}, {request.PickupLocation?.lng?.toFixed(4)}
                        </Text>
                      </View>

                      <View style={styles.requestInfo}>
                        <Text style={[styles.requestLabel, { color: colors.textSecondary }]}>
                          Destination
                        </Text>
                        <Text style={[styles.requestValue, { color: colors.text }]}>
                          {request.Destination?.lat?.toFixed(4)}, {request.Destination?.lng?.toFixed(4)}
                        </Text>
                      </View>

                      <View style={styles.requestInfo}>
                        <Text style={[styles.requestLabel, { color: colors.textSecondary }]}>
                          Fare
                        </Text>
                        <Text style={[styles.requestValue, { color: colors.text }]}>
                          ₹{request.Fare?.toFixed(2) || '0.00'}
                        </Text>
                      </View>

                      <View style={styles.requestActions}>
                        <TouchableOpacity
                          style={[styles.requestButton, { backgroundColor: colors.danger }]}
                          onPress={() => handleRejectRequest(request.Id)}
                          disabled={loadingRequests}
                        >
                          <Ionicons name="close-circle" size={18} color="#fff" />
                          <Text style={styles.requestButtonText}>Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.requestButton, { backgroundColor: colors.success }]}
                          onPress={() => handleAcceptRequest(request.Id)}
                          disabled={loadingRequests}
                        >
                          <Ionicons name="checkmark-circle" size={18} color="#fff" />
                          <Text style={styles.requestButtonText}>Accept</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}

                {/* Accepted Connections */}
                <Text style={[styles.subSectionTitle, { color: colors.text, marginTop: 16 }]}>
                  Accepted Connections ({acceptedConnections.length})
                </Text>
                {acceptedConnections.length === 0 ? (
                  <Text style={[styles.description, { color: colors.textSecondary, textAlign: 'center', marginTop: 4 }]}>
                    No accepted connections
                  </Text>
                ) : (
                  acceptedConnections.map((connection) => (
                    <View
                      key={connection.Id}
                      style={[
                        styles.requestCard,
                        { backgroundColor: colors.background, borderColor: colors.success }
                      ]}
                    >
                      <View style={styles.requestInfo}>
                        <Text style={[styles.requestLabel, { color: colors.textSecondary }]}>
                          State
                        </Text>
                        <Text style={[styles.requestValue, { color: colors.success, fontFamily: 'Poppins-SemiBold' }]}>
                          {connection.State?.toUpperCase()}
                        </Text>
                      </View>

                      <View style={styles.requestInfo}>
                        <Text style={[styles.requestLabel, { color: colors.textSecondary }]}>
                          Passenger
                        </Text>
                        <Text style={[styles.requestValue, { color: colors.text }]}>
                          {connection.PassengerId?.substring(0, 8)}...
                        </Text>
                      </View>

                      <View style={styles.requestInfo}>
                        <Text style={[styles.requestLabel, { color: colors.textSecondary }]}>
                          Pickup
                        </Text>
                        <Text style={[styles.requestValue, { color: colors.text }]}>
                          {connection.PickupLocation?.lat?.toFixed(4)}, {connection.PickupLocation?.lng?.toFixed(4)}
                        </Text>
                      </View>

                      <View style={styles.requestInfo}>
                        <Text style={[styles.requestLabel, { color: colors.textSecondary }]}>
                          Destination
                        </Text>
                        <Text style={[styles.requestValue, { color: colors.text }]}>
                          {connection.Destination?.lat?.toFixed(4)}, {connection.Destination?.lng?.toFixed(4)}
                        </Text>
                      </View>

                      <View style={styles.requestInfo}>
                        <Text style={[styles.requestLabel, { color: colors.textSecondary }]}>
                          Fare
                        </Text>
                        <Text style={[styles.requestValue, { color: colors.text }]}>
                          ₹{connection.Fare?.toFixed(2) || '0.00'}
                        </Text>
                      </View>

                      {connection.State === 'accepted' && (
                        <View style={[styles.otpVerificationContainer, { borderTopColor: colors.border }]}>
                          <Text style={[styles.requestLabel, { color: colors.textSecondary, marginBottom: 8 }]}>
                            Enter OTP from Passenger
                          </Text>
                          <View style={styles.otpInputRow}>
                            <TextInput
                              style={[
                                styles.otpInput,
                                { 
                                  borderColor: colors.border,
                                  color: colors.text,
                                  backgroundColor: colors.background,
                                }
                              ]}
                              placeholder="6-digit OTP"
                              placeholderTextColor={colors.textSecondary}
                              value={otpInputs[connection.Id] || ''}
                              onChangeText={(text) => setOtpInputs({ ...otpInputs, [connection.Id]: text })}
                              maxLength={6}
                              keyboardType="numeric"
                            />
                            <TouchableOpacity
                              style={[
                                styles.verifyButton,
                                { backgroundColor: colors.primary },
                                verifyingOtp[connection.Id] && { opacity: 0.6 }
                              ]}
                              onPress={() => handleVerifyOtp(connection.Id)}
                              disabled={verifyingOtp[connection.Id]}
                            >
                              {verifyingOtp[connection.Id] ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <Ionicons name="checkmark" size={20} color="#fff" />
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}

                      {connection.State === 'picked_up' && (
                        <View style={[styles.otpVerificationContainer, { borderTopColor: colors.border }]}>
                          <TouchableOpacity
                            style={[
                              styles.completeRideButton,
                              { backgroundColor: colors.success },
                              completingRide[connection.Id] && { opacity: 0.6 }
                            ]}
                            onPress={() => handleCompleteRide(connection.Id)}
                            disabled={completingRide[connection.Id]}
                          >
                            {completingRide[connection.Id] ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <>
                                <Ionicons name="checkmark-done" size={20} color="#fff" />
                                <Text style={styles.completeRideButtonText}>Complete Ride</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ))
                )}
              </View>
            )}

            {/* Controls */}
            {testUserActive && (
              <>
                {/* State Toggle */}
                <View style={[styles.section, { backgroundColor: colors.card }]}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    State
                  </Text>
                  <View style={styles.roleToggleContainer}>
                    <TouchableOpacity
                      style={[
                        styles.roleToggleButton,
                        { borderColor: colors.border },
                        testUserInfo?.state === 'idle' && { backgroundColor: colors.textSecondary, borderColor: colors.textSecondary }
                      ]}
                      onPress={async () => {
                        try {
                          setLoading(true);
                          await api.testSetState('idle', null);
                          await checkTestUserStatus();
                        } catch (error: any) {
                          console.error('[TestUserPanel] Failed to set idle:', error);
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                    >
                      <Text style={[
                        styles.roleToggleText,
                        { color: colors.text },
                        testUserInfo?.state === 'idle' && { color: '#fff' }
                      ]}>
                        Idle
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.roleToggleButton,
                        { borderColor: colors.border },
                        testUserInfo?.state === 'driving' && { backgroundColor: colors.primary, borderColor: colors.primary }
                      ]}
                      onPress={async () => {
                        try {
                          setLoading(true);
                          await api.testSetState('driving', testUserInfo.destination);
                          await checkTestUserStatus();
                        } catch (error: any) {
                          console.error('[TestUserPanel] Failed to set driving:', error);
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                    >
                      <Text style={[
                        styles.roleToggleText,
                        { color: colors.text },
                        testUserInfo?.state === 'driving' && { color: '#fff' }
                      ]}>
                        Driving
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.roleToggleButton,
                        { borderColor: colors.border },
                        testUserInfo?.state === 'riding' && { backgroundColor: colors.success, borderColor: colors.success }
                      ]}
                      onPress={async () => {
                        try {
                          setLoading(true);
                          await api.testSetState('riding', testUserInfo.destination);
                          await checkTestUserStatus();
                        } catch (error: any) {
                          console.error('[TestUserPanel] Failed to set riding:', error);
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                    >
                      <Text style={[
                        styles.roleToggleText,
                        { color: colors.text },
                        testUserInfo?.state === 'riding' && { color: '#fff' }
                      ]}>
                        Riding
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Location and Destination Selectors */}
                <View style={[styles.section, { backgroundColor: colors.card }]}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Location & Destination
                  </Text>

                  <Text style={[styles.label, { color: colors.text, marginBottom: 8 }]}>Current Location</Text>
                  {Object.entries(TEST_LOCATIONS).map(([key, location]) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.locationButton,
                        { borderColor: colors.border },
                        selectedLocation === key && { backgroundColor: colors.primary, borderColor: colors.primary }
                      ]}
                      onPress={() => handleUpdateLocation(location, key)}
                      disabled={loading}
                    >
                      <Ionicons name="location" size={20} color={selectedLocation === key ? '#fff' : colors.primary} />
                      <Text style={[
                        styles.locationName,
                        { color: selectedLocation === key ? '#fff' : colors.text }
                      ]}>
                        {location.name}
                      </Text>
                    </TouchableOpacity>
                  ))}

                  <Text style={[styles.label, { color: colors.text, marginTop: 16, marginBottom: 8 }]}>Destination</Text>
                  {Object.entries(TEST_LOCATIONS).map(([key, location]) => (
                    <TouchableOpacity
                      key={`dest-${key}`}
                      style={[
                        styles.locationButton,
                        { borderColor: colors.border },
                        selectedDestination === key && { backgroundColor: colors.success, borderColor: colors.success }
                      ]}
                      onPress={async () => {
                        try {
                          setLoading(true);
                          setSelectedDestination(key);
                          await api.testSetState(testUserInfo.state, location);
                          await checkTestUserStatus();
                        } catch (error: any) {
                          console.error('[TestUserPanel] Failed to update destination:', error);
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                    >
                      <Ionicons name="flag" size={20} color={selectedDestination === key ? '#fff' : colors.success} />
                      <Text style={[
                        styles.locationName,
                        { color: selectedDestination === key ? '#fff' : colors.text }
                      ]}>
                        {location.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Movement Controls */}
                <View style={[styles.section, { backgroundColor: colors.card }]}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Movement Controls
                  </Text>

                  <View style={styles.autoMoveRow}>
                    <Text style={[styles.label, { color: colors.text }]}>Auto-Movement</Text>
                    <View style={styles.autoMoveButtons}>
                      {!autoMoving ? (
                        <TouchableOpacity
                          style={[styles.controlButton, { backgroundColor: colors.success }]}
                          onPress={startAutoMovement}
                          disabled={loading}
                        >
                          <Ionicons name="play" size={16} color="#fff" />
                          <Text style={styles.controlButtonText}>Start</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={[styles.controlButton, { backgroundColor: colors.danger }]}
                          onPress={stopAutoMovement}
                        >
                          <Ionicons name="pause" size={16} color="#fff" />
                          <Text style={styles.controlButtonText}>Stop</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <Text style={[styles.subSectionTitle, { color: colors.textSecondary }]}>
                    Manual Movement (0.5 km)
                  </Text>
                  <View style={styles.directionPad}>
                    <TouchableOpacity
                      style={[styles.directionButton, { backgroundColor: colors.primary }]}
                      onPress={() => handleMove('north')}
                      disabled={loading}
                    >
                      <Ionicons name="arrow-up" size={24} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.directionRow}>
                      <TouchableOpacity
                        style={[styles.directionButton, { backgroundColor: colors.primary }]}
                        onPress={() => handleMove('west')}
                        disabled={loading}
                      >
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.directionButton, { backgroundColor: colors.primary }]}
                        onPress={() => handleMove('east')}
                        disabled={loading}
                      >
                        <Ionicons name="arrow-forward" size={24} color="#fff" />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      style={[styles.directionButton, { backgroundColor: colors.primary }]}
                      onPress={() => handleMove('south')}
                      disabled={loading}
                    >
                      <Ionicons name="arrow-down" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>





                {/* Despawn */}
                <TouchableOpacity
                  style={[styles.despawnButton, { backgroundColor: colors.danger }]}
                  onPress={handleDespawn}
                  disabled={loading}
                >
                  <Ionicons name="trash" size={20} color="#fff" />
                  <Text style={styles.despawnButtonText}>Delete Test User</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  panel: {
    height: '90%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 12,
  },
  subSectionTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    marginTop: 12,
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    marginBottom: 12,
    lineHeight: 20,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
  },
  statusValue: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    flex: 1,
    textAlign: 'right',
  },
  profileButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
  },
  autoMoveRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
  },
  autoMoveButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
  },
  directionPad: {
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  directionRow: {
    flexDirection: 'row',
    gap: 80,
  },
  directionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  locationName: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
  },
  jumpButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  jumpButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
  },
  despawnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  despawnButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
  roleToggleContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  roleToggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleToggleText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
  },
  createButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
  requestCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  requestInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestLabel: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
  },
  requestValue: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    flex: 1,
    textAlign: 'right',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  requestButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 6,
  },
  requestButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
  },
  otpVerificationContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  otpInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  otpInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    textAlign: 'center',
  },
  verifyButton: {
    width: 44,
    height: 44,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeRideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 6,
  },
  completeRideButtonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
  },
});

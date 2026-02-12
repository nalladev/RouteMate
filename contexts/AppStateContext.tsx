import React, { createContext, useState, useContext, useEffect, useMemo, ReactNode } from 'react';
import * as Location from 'expo-location';
import { Location as LocationType, RideConnection, MarkerData, UserState } from '../types';
import { api } from '../utils/api';
import { useAuth } from './AuthContext';

interface AppStateContextType {
  role: 'driver' | 'passenger';
  setRole: (role: 'driver' | 'passenger') => void;
  userLocation: LocationType | null;
  destination: LocationType | null;
  setDestination: (dest: LocationType | null) => void;
  markers: MarkerData[];
  activeConnections: RideConnection[];
  pendingRequests: RideConnection[];
  isActive: boolean;
  refreshMarkers: () => Promise<void>;
  refreshConnections: () => Promise<void>;
  refreshRequests: () => Promise<void>;
  updateUserState: (state: UserState, dest?: LocationType | null) => Promise<void>;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [role, setRole] = useState<'driver' | 'passenger'>('passenger');
  const [userLocation, setUserLocation] = useState<LocationType | null>(null);
  const [destination, setDestination] = useState<LocationType | null>(null);
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [activeConnections, setActiveConnections] = useState<RideConnection[]>([]);
  const [pendingRequests, setPendingRequests] = useState<RideConnection[]>([]);
  const [isActive, setIsActive] = useState(false);

  // Location tracking
  useEffect(() => {
    if (!isAuthenticated) return;

    let locationSubscription: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('Location permission not granted');
        return;
      }

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10,
        },
        (location) => {
          const newLocation = {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
          };
          setUserLocation(newLocation);
          
          // Update location on server
          api.updateLocation(newLocation.lat, newLocation.lng).catch((error) => {
            console.error('Failed to update location:', error);
          });
        }
      );
    })();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [isAuthenticated]);

  // Polling for updates
  useEffect(() => {
    if (!isAuthenticated || !userLocation) return;

    const interval = setInterval(async () => {
      try {
        await Promise.all([
          refreshMarkers(),
          refreshConnections(),
          role === 'driver' && refreshRequests(),
        ].filter(Boolean));
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated, userLocation, role, destination]);

  async function refreshMarkers() {
    if (!userLocation) return;
    
    try {
      const { markers: newMarkers } = await api.getMarkers(
        role,
        userLocation.lat,
        userLocation.lng
      );
      setMarkers(newMarkers);
    } catch (error) {
      console.error('Failed to refresh markers:', error);
    }
  }

  async function refreshConnections() {
    try {
      const { connections } = await api.getConnections();
      setActiveConnections(connections);
    } catch (error) {
      console.error('Failed to refresh connections:', error);
    }
  }

  async function refreshRequests() {
    try {
      const { requests } = await api.getRequests();
      setPendingRequests(requests);
    } catch (error) {
      console.error('Failed to refresh requests:', error);
    }
  }

  async function updateUserState(state: UserState, dest?: LocationType | null) {
    try {
      await api.updateState(state, dest);
      setIsActive(state !== 'idle');
      if (state === 'idle') {
        setDestination(null);
      }
    } catch (error) {
      console.error('Failed to update state:', error);
      throw error;
    }
  }


  const contextValue = useMemo(
    () => ({
      role,
      setRole,
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
      updateUserState,
    }),
    [role, userLocation, destination, markers, activeConnections, pendingRequests, isActive, refreshMarkers, refreshConnections, refreshRequests, updateUserState]
  );

  return (
    <AppStateContext.Provider value={contextValue}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}
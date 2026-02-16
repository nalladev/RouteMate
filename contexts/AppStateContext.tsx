import React, { createContext, useState, useContext, useEffect, useMemo, useCallback, ReactNode } from 'react';
import * as Location from 'expo-location';
import { Location as LocationType, RideConnection, MarkerData, UserState } from '../types';
import { api } from '../utils/api';
import { useAuth } from './AuthContext';

interface AppStateContextType {
  userState: 'driver' | 'passenger' | 'idle';
  setUserState: (state: 'driver' | 'passenger' | 'idle') => void;
  activeCommunityId: string | null;
  userLocation: LocationType | null;
  destination: LocationType | null;
  setDestination: (dest: LocationType | null) => void;
  markers: MarkerData[];
  activeConnections: RideConnection[];
  pendingRequests: RideConnection[];
  isActive: boolean;
  refreshMarkers: () => Promise<MarkerData[]>;
  refreshConnections: () => Promise<void>;
  refreshRequests: () => Promise<void>;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [userState, setUserStateInternal] = useState<'driver' | 'passenger' | 'idle'>('idle');
  const [userLocation, setUserLocation] = useState<LocationType | null>(null);
  const [destination, setDestination] = useState<LocationType | null>(null);
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [activeConnections, setActiveConnections] = useState<RideConnection[]>([]);
  const [pendingRequests, setPendingRequests] = useState<RideConnection[]>([]);
  const activeCommunityId = user?.ActiveCommunityId || null;
  
  const isActive = userState !== 'idle';

  // Load user state from database on mount or user change
  useEffect(() => {
    if (user?.state) {
      // Convert DB state to client userState
      if (user.state === 'driving') {
        setUserStateInternal('driver');
      } else if (user.state === 'riding') {
        setUserStateInternal('passenger');
      } else {
        setUserStateInternal('idle');
      }
    }
    if (user?.Destination) {
      setDestination(user.Destination);
    }
  }, [user?.Id, user?.state, user?.Destination]);

  // Persist userState to database when it changes
  const setUserState = useCallback(async (newState: 'driver' | 'passenger' | 'idle') => {
    setUserStateInternal(newState);
    
    if (isAuthenticated) {
      try {
        // Convert client userState to DB state
        let dbState: UserState;
        if (newState === 'driver') {
          dbState = 'driving';
        } else if (newState === 'passenger') {
          dbState = 'riding';
        } else {
          dbState = 'idle';
        }
        await api.updateState(dbState, newState !== 'idle' ? destination : null);
      } catch (error) {
        console.error('Failed to update userState:', error);
      }
    }
  }, [isAuthenticated, destination]);

  // Auto-sync destination changes to database when active
  useEffect(() => {
    if (!isAuthenticated || !user || userState === 'idle') return;

    const syncDestination = async () => {
      try {
        const dbState: UserState = userState === 'driver' ? 'driving' : 'riding';
        await api.updateState(dbState, destination);
      } catch (error) {
        console.error('Failed to sync destination:', error);
      }
    };

    syncDestination();
  }, [destination, isAuthenticated, user, userState]);

  // Clear destination when going idle
  useEffect(() => {
    if (userState === 'idle') {
      setDestination(null);
    }
  }, [userState]);

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

  const refreshMarkers = useCallback(async (): Promise<MarkerData[]> => {
    if (!userLocation || userState === 'idle') return [];
    
    try {
      const { markers: newMarkers } = await api.getMarkers(
        userState,
        userLocation.lat,
        userLocation.lng
      );
      setMarkers(newMarkers);
      return newMarkers;
    } catch (error) {
      console.error('Failed to refresh markers:', error);
      return [];
    }
  }, [userLocation, userState]);

  const refreshConnections = useCallback(async () => {
    try {
      const { connections } = await api.getConnections();
      setActiveConnections(connections);
    } catch (error) {
      console.error('Failed to refresh connections:', error);
    }
  }, []);

  const refreshRequests = useCallback(async () => {
    try {
      const { requests } = await api.getRequests();
      setPendingRequests(requests);
    } catch (error) {
      console.error('Failed to refresh requests:', error);
    }
  }, []);

  // Polling for updates - only when user is active (driving or riding)
  useEffect(() => {
    if (!isAuthenticated || !userLocation || !isActive) return;

    const interval = setInterval(async () => {
      try {
        await Promise.all([
          refreshMarkers(),
          refreshConnections(),
          userState === 'driver' && refreshRequests(),
        ].filter(Boolean));
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated, userLocation, isActive, userState, refreshMarkers, refreshConnections, refreshRequests]);

  const contextValue = useMemo(
    () => ({
      userState,
      setUserState,
      activeCommunityId,
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
    }),
    [userState, setUserState, activeCommunityId, userLocation, destination, markers, activeConnections, pendingRequests, isActive, refreshMarkers, refreshConnections, refreshRequests]
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

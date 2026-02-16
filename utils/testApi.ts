import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from "expo-constants";
import type {
  RideConnection,
  MarkerData,
  Location,
} from '../types';

// Use relative URLs for local dev, production URL for production builds
const IS_PRODUCTION = process.env.NODE_ENV === 'production' || !!process.env.EXPO_PUBLIC_USE_PRODUCTION;
const PRODUCTION_URL = Constants.expoConfig?.extra?.productionAppUrl || 'https://www.routemate.tech';
const API_URL = IS_PRODUCTION ? PRODUCTION_URL : '';

async function getAuthToken(): Promise<string | null> {
  return await AsyncStorage.getItem('authToken');
}

async function getTestUserToken(): Promise<string | null> {
  return await AsyncStorage.getItem('testUserToken');
}

async function setTestUserToken(token: string | null): Promise<void> {
  if (token) {
    await AsyncStorage.setItem('testUserToken', token);
  } else {
    await AsyncStorage.removeItem('testUserToken');
  }
}

// Request function that uses main user token (for authorization)
async function mainUserRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const rawBody = await response.text();
  const contentType = response.headers.get('content-type') || '';
  let data: any = {};

  if (rawBody) {
    if (contentType.includes('application/json')) {
      try {
        data = JSON.parse(rawBody);
      } catch {
        data = { error: rawBody };
      }
    } else {
      try {
        data = JSON.parse(rawBody);
      } catch {
        data = { error: rawBody };
      }
    }
  }

  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data;
}

// Request function that uses test user token
async function testUserRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = await getTestUserToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const rawBody = await response.text();
  const contentType = response.headers.get('content-type') || '';
  let data: any = {};

  if (rawBody) {
    if (contentType.includes('application/json')) {
      try {
        data = JSON.parse(rawBody);
      } catch {
        data = { error: rawBody };
      }
    } else {
      try {
        data = JSON.parse(rawBody);
      } catch {
        data = { error: rawBody };
      }
    }
  }

  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data;
}

// Test Control API - Methods that use main user token for authorization
export const testControlApi = {
  createTestUser: async (params: {
    name: string;
    role: 'driver' | 'passenger';
    location: Location;
    destination?: Location | null;
    vehicleType?: string;
    vehicleName?: string;
    vehicleModel?: string;
    vehicleRegistration?: string;
  }): Promise<{ success: boolean; userId: string; token: string; name: string; role: string; location: Location }> => {
    const response = await mainUserRequest('/api/test/control', {
      method: 'POST',
      body: JSON.stringify({
        action: 'spawn',
        ...params,
      }),
    });
    // Store the test user token
    if (response.token) {
      await setTestUserToken(response.token);
    }
    return response;
  },

  testGetStatus: async (): Promise<{ exists: boolean; user?: any; token?: string }> => {
    const response = await mainUserRequest('/api/test/control', {
      method: 'GET',
    });
    // Store or clear the test user token based on existence
    if (response.exists && response.token) {
      await setTestUserToken(response.token);
    } else if (!response.exists) {
      await setTestUserToken(null);
    }
    return response;
  },
};

// Test User API - Methods that use test user token (acts as test user)
export const testApi = {
  // Test control methods
  testUpdateLocation: async (location: Location): Promise<{ success: boolean; location: Location }> => {
    return testUserRequest('/api/test/control', {
      method: 'POST',
      body: JSON.stringify({
        action: 'update_location',
        location,
      }),
    });
  },

  testSetState: async (state: 'idle' | 'riding' | 'driving', destination?: Location | null): Promise<{ success: boolean; state: string; destination?: Location | null }> => {
    return testUserRequest('/api/test/control', {
      method: 'POST',
      body: JSON.stringify({
        action: 'set_state',
        state,
        destination,
      }),
    });
  },

  testDespawn: async (): Promise<{ success: boolean; message: string }> => {
    const response = await testUserRequest('/api/test/control', {
      method: 'POST',
      body: JSON.stringify({
        action: 'despawn',
      }),
    });
    // Clear the test user token
    await setTestUserToken(null);
    return response;
  },

  // Regular ride endpoints (test user performing actions)
  getMarkers: async (role: 'driver' | 'passenger', lat: number, lng: number): Promise<{ markers: MarkerData[] }> => {
    return testUserRequest(`/api/match/markers?role=${role}&lat=${lat}&lng=${lng}`);
  },

  requestRide: async (driverId: string, pickupLocation: Location, destination: Location): Promise<{ requestId: string; expiresAt: string }> => {
    return testUserRequest('/api/rides/request', {
      method: 'POST',
      body: JSON.stringify({ driverId, pickupLocation, destination }),
    });
  },

  getRequests: async (): Promise<{ requests: RideConnection[] }> => {
    return testUserRequest('/api/rides/requests');
  },

  respondToRequest: async (requestId: string, action: 'accepted' | 'rejected'): Promise<{ connection: RideConnection }> => {
    return testUserRequest('/api/rides/request/respond', {
      method: 'POST',
      body: JSON.stringify({ requestId, action }),
    });
  },

  verifyOtp: async (connectionId: string, otp: string): Promise<{ success: boolean }> => {
    return testUserRequest('/api/rides/connection/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ connectionId, otp }),
    });
  },

  completeRide: async (connectionId: string): Promise<{
    success: boolean;
    paymentStatus: string;
    fare: number;
    passengerPointsAwarded?: number;
    passengerRewardPoints?: number;
  }> => {
    return testUserRequest('/api/rides/connection/complete', {
      method: 'POST',
      body: JSON.stringify({ connectionId }),
    });
  },

  getConnections: async (): Promise<{ connections: RideConnection[] }> => {
    return testUserRequest('/api/rides/connections');
  },
};
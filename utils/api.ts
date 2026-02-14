import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, RideConnection, MarkerData, Location } from '../types';
import type { VehicleType } from '../constants/vehicles';

// Use relative URLs for Expo Router API routes
// This works with tunnel mode, local network, and production
const API_URL = process.env.EXPO_PUBLIC_API_URL || '';

async function getAuthToken(): Promise<string | null> {
  return await AsyncStorage.getItem('authToken');
}

async function request(endpoint: string, options: RequestInit = {}): Promise<any> {
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

export const api = {
  // Auth
  login: async (mobile: string, password: string): Promise<{ token: string; user: User }> => {
    return request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ mobile, password }),
    });
  },

  otpLogin: async (otpToken: string): Promise<{ token: string; user: User }> => {
    return request('/api/auth/otp-login', {
      method: 'POST',
      body: JSON.stringify({ otpToken }),
    });
  },

  signup: async (otpToken: string, password: string): Promise<{ token: string; user: User }> => {
    return request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ otpToken, password }),
    });
  },

  logout: async (): Promise<{ success: boolean }> => {
    return request('/api/auth/logout', {
      method: 'POST',
    });
  },

  // User
  getMe: async (): Promise<{ user: User }> => {
    return request('/api/user/me');
  },

  updateState: async (state: 'driving' | 'riding' | 'idle', destination?: Location | null): Promise<{ success: boolean }> => {
    return request('/api/user/state', {
      method: 'POST',
      body: JSON.stringify({ state, destination }),
    });
  },

  updateLocation: async (lat: number, lng: number): Promise<{ success: boolean }> => {
    return request('/api/user/location', {
      method: 'POST',
      body: JSON.stringify({ lat, lng }),
    });
  },

  updateVehicleType: async (vehicleType: VehicleType): Promise<{ success: boolean; vehicleType: VehicleType }> => {
    return request('/api/user/vehicle', {
      method: 'POST',
      body: JSON.stringify({ vehicleType }),
    });
  },

  // Discovery
  getMarkers: async (role: 'driver' | 'passenger', lat: number, lng: number): Promise<{ markers: MarkerData[] }> => {
    return request(`/api/match/markers?role=${role}&lat=${lat}&lng=${lng}`);
  },

  // Rides
  requestRide: async (driverId: string, pickupLocation: Location, destination: Location): Promise<{ requestId: string; expiresAt: string }> => {
    return request('/api/rides/request', {
      method: 'POST',
      body: JSON.stringify({ driverId, pickupLocation, destination }),
    });
  },

  cancelRequest: async (requestId: string): Promise<{ success: boolean }> => {
    return request('/api/rides/request/cancel', {
      method: 'POST',
      body: JSON.stringify({ requestId }),
    });
  },

  getRequests: async (): Promise<{ requests: RideConnection[] }> => {
    return request('/api/rides/requests');
  },

  respondToRequest: async (requestId: string, action: 'accepted' | 'rejected'): Promise<{ connection: RideConnection }> => {
    return request('/api/rides/request/respond', {
      method: 'POST',
      body: JSON.stringify({ requestId, action }),
    });
  },

  verifyOtp: async (connectionId: string, otp: string): Promise<{ success: boolean }> => {
    return request('/api/rides/connection/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ connectionId, otp }),
    });
  },

  confirmVehicle: async (connectionId: string, isSameVehicle: boolean): Promise<{ success: boolean; confirmation: 'confirmed' | 'mismatch' }> => {
    return request('/api/rides/connection/confirm-vehicle', {
      method: 'POST',
      body: JSON.stringify({ connectionId, isSameVehicle }),
    });
  },

  completeRide: async (connectionId: string): Promise<{ success: boolean; paymentStatus: string; fare: number }> => {
    return request('/api/rides/connection/complete', {
      method: 'POST',
      body: JSON.stringify({ connectionId }),
    });
  },

  rateDriver: async (connectionId: string, rating: number): Promise<{ success: boolean; rating: number; driverRatingAverage: number; driverRatingCount: number }> => {
    return request('/api/rides/connection/rate', {
      method: 'POST',
      body: JSON.stringify({ connectionId, rating }),
    });
  },

  getConnections: async (): Promise<{ connections: RideConnection[] }> => {
    return request('/api/rides/connections');
  },

  getHistory: async (): Promise<{ rides: RideConnection[] }> => {
    return request('/api/rides/history');
  },

  // Wallet
  getWalletBalance: async (): Promise<{ balance: number }> => {
    return request('/api/wallet/balance');
  },

  createTopupOrder: async (amount: number): Promise<{ orderId: string; amount: number; currency: string; razorpayKeyId: string }> => {
    return request('/api/wallet/topup/create-order', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  },

  verifyTopup: async (razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string): Promise<{ success: boolean; balance: number; amount: number }> => {
    return request('/api/wallet/topup/verify', {
      method: 'POST',
      body: JSON.stringify({ razorpayOrderId, razorpayPaymentId, razorpaySignature }),
    });
  },

  requestPayout: async (amount: number, upiId?: string): Promise<{ success: boolean; payoutId: string; status: string; balance: number }> => {
    return request('/api/wallet/payout/request', {
      method: 'POST',
      body: JSON.stringify({ amount, upiId }),
    });
  },

  getTransactions: async (limit?: number, offset?: number): Promise<{ transactions: any[]; total: number; limit: number; offset: number; hasMore: boolean }> => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    const queryString = params.toString();
    return request(`/api/wallet/transactions${queryString ? '?' + queryString : ''}`);
  },

  updateUpiId: async (upiId: string): Promise<{ success: boolean; upiId: string }> => {
    return request('/api/wallet/upi/update', {
      method: 'POST',
      body: JSON.stringify({ upiId }),
    });
  },

  // KYC
  createKycSession: async (): Promise<{ sessionId: string; verificationUrl: string }> => {
    return request('/api/kyc/create-session', {
      method: 'POST',
    });
  },

  refreshKycStatus: async (sessionId?: string): Promise<{ success: boolean; verified: boolean; status: string }> => {
    return request('/api/kyc/verify', {
      method: 'POST',
      body: JSON.stringify(sessionId ? { sessionId } : {}),
    });
  },
};

export async function setAuthToken(token: string): Promise<void> {
  await AsyncStorage.setItem('authToken', token);
}

export async function clearAuthToken(): Promise<void> {
  await AsyncStorage.removeItem('authToken');
}

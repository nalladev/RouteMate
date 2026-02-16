import Constants from "expo-constants";
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  User,
  RideConnection,
  MarkerData,
  Location,
  RewardVoucher,
  RewardRedemption,
  RewardRole,
  Community,
  CommunityMember,
} from '../types';
import type { VehicleType } from '../constants/vehicles';

// Use relative URLs for local dev, production URL for production builds
const IS_PRODUCTION = process.env.NODE_ENV === 'production' || !!process.env.EXPO_PUBLIC_USE_PRODUCTION;
const PRODUCTION_URL = Constants.expoConfig?.extra?.productionAppUrl || 'https://www.routemate.tech';
const API_URL = IS_PRODUCTION ? PRODUCTION_URL : '';

console.log('[API] Environment:', { IS_PRODUCTION, API_URL: API_URL || 'relative URLs (local dev)' });

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

async function request(endpoint: string, options: RequestInit = {}, useTestUserToken: boolean = false): Promise<any> {
  const token = useTestUserToken ? await getTestUserToken() : await getAuthToken();

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

  updateVehicleDetails: async (data: {
    vehicleType: VehicleType;
    vehicleName?: string;
    vehicleModel?: string;
    vehicleRegistration?: string;
  }): Promise<{
    success: boolean;
    vehicleType: VehicleType;
    vehicleName?: string;
    vehicleModel?: string;
    vehicleRegistration?: string;
  }> => {
    return request('/api/user/vehicle', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Discovery
  getMarkers: async (role: 'driver' | 'passenger', lat: number, lng: number): Promise<{ markers: MarkerData[] }> => {
    return request(`/api/match/markers?role=${role}&lat=${lat}&lng=${lng}`);
  },

  // Communities
  getCommunities: async (): Promise<{ communities: Community[]; activeCommunityId: string | null }> => {
    try {
      const result = await request('/api/communities');
      return result;
    } catch (error) {
      throw error;
    }
  },

  createCommunity: async (name: string): Promise<{ community: Community }> => {
    return request('/api/communities/create', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  selectCommunityMode: async (communityId?: string | null): Promise<{ success: boolean; activeCommunityId: string | null }> => {
    return request('/api/communities/select', {
      method: 'POST',
      body: JSON.stringify({ communityId: communityId || null }),
    });
  },

  createCommunityInviteLink: async (
    communityId: string,
    expiresInHours: 1 | 6 | 24 | 72 | 168
  ): Promise<{ communityId: string; expiresInHours: number; expiresAt: string; inviteToken: string; inviteUrl: string }> => {
    return request('/api/communities/invite/create', {
      method: 'POST',
      body: JSON.stringify({ communityId, expiresInHours }),
    });
  },

  acceptCommunityInvite: async (token: string): Promise<{
    success: boolean;
    alreadyMember: boolean;
    community: { Id: string; Name: string; AdminId: string };
    activeCommunityId: string;
  }> => {
    return request('/api/communities/invite/accept', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },

  getCommunityMembers: async (
    communityId: string
  ): Promise<{ community: { Id: string; Name: string; AdminId: string }; members: CommunityMember[] }> => {
    return request(`/api/communities/${communityId}/members`);
  },

  removeCommunityMember: async (communityId: string, memberId: string): Promise<{ success: boolean }> => {
    return request(`/api/communities/${communityId}/members/remove`, {
      method: 'POST',
      body: JSON.stringify({ memberId }),
    });
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

  getRequests: async (useTestUser: boolean = false): Promise<{ requests: RideConnection[] }> => {
    return request('/api/rides/requests', {}, useTestUser);
  },

  respondToRequest: async (requestId: string, action: 'accepted' | 'rejected', useTestUser: boolean = false): Promise<{ connection: RideConnection }> => {
    return request('/api/rides/request/respond', {
      method: 'POST',
      body: JSON.stringify({ requestId, action }),
    }, useTestUser);
  },

  verifyOtp: async (connectionId: string, otp: string, useTestUser: boolean = false): Promise<{ success: boolean }> => {
    return request('/api/rides/connection/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ connectionId, otp }),
    }, useTestUser);
  },

  confirmVehicle: async (connectionId: string, isSameVehicle: boolean): Promise<{ success: boolean; confirmation: 'confirmed' | 'mismatch' }> => {
    return request('/api/rides/connection/confirm-vehicle', {
      method: 'POST',
      body: JSON.stringify({ connectionId, isSameVehicle }),
    });
  },

  completeRide: async (connectionId: string, useTestUser: boolean = false): Promise<{
    success: boolean;
    paymentStatus: string;
    fare: number;
    passengerPointsAwarded?: number;
    passengerRewardPoints?: number;
  }> => {
    return request('/api/rides/connection/complete', {
      method: 'POST',
      body: JSON.stringify({ connectionId }),
    }, useTestUser);
  },

  rateDriver: async (connectionId: string, rating: number): Promise<{
    success: boolean;
    rating: number;
    driverRatingAverage: number;
    driverRatingCount: number;
    driverPointsAwarded?: number;
    driverRewardPoints?: number;
  }> => {
    return request('/api/rides/connection/rate', {
      method: 'POST',
      body: JSON.stringify({ connectionId, rating }),
    });
  },

  cancelConnection: async (connectionId: string): Promise<{
    success: boolean;
    cancelled: boolean;
    cancelledBy: 'passenger' | 'driver';
    penalty: number;
    newBalance?: number;
    message: string;
  }> => {
    return request('/api/rides/connection/cancel', {
      method: 'POST',
      body: JSON.stringify({ connectionId }),
    });
  },

  getConnections: async (useTestUser: boolean = false): Promise<{ connections: RideConnection[] }> => {
    return request('/api/rides/connections', {}, useTestUser);
  },

  getHistory: async (): Promise<{ rides: RideConnection[] }> => {
    return request('/api/rides/history');
  },

  createRideShareLink: async (connectionId: string): Promise<{ success: boolean; shareToken: string; shareUrl: string }> => {
    return request('/api/rides/share/create', {
      method: 'POST',
      body: JSON.stringify({ connectionId }),
    });
  },

  // Rewards
  getRewards: async (): Promise<{
    points: {
      passenger: number;
      driver: number;
    };
    vouchers: {
      passenger: RewardVoucher[];
      driver: RewardVoucher[];
    };
    redemptions: RewardRedemption[];
  }> => {
    return request('/api/rewards/list');
  },

  redeemReward: async (role: RewardRole, voucherId: string): Promise<{
    success: boolean;
    role: RewardRole;
    voucher: RewardVoucher;
    remainingPoints: number;
  }> => {
    return request('/api/rewards/redeem', {
      method: 'POST',
      body: JSON.stringify({ role, voucherId }),
    });
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

  // Profile Picture
  uploadProfilePicture: async (imageBase64: string): Promise<{ success: boolean; profilePictureUrl: string }> => {
    return request('/api/user/profile-picture', {
      method: 'POST',
      body: JSON.stringify({ imageBase64 }),
    });
  },

  // Test Control API
  testSpawnUser: async (params: {
    name: string;
    role: 'driver' | 'passenger';
    location: Location;
    destination?: Location | null;
    vehicleType?: string;
    vehicleName?: string;
    vehicleModel?: string;
    vehicleRegistration?: string;
  }): Promise<{ success: boolean; userId: string; token: string; name: string; role: string; location: Location }> => {
    const response = await request('/api/test/control', {
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

  testUpdateLocation: async (location: Location): Promise<{ success: boolean; location: Location }> => {
    return request('/api/test/control', {
      method: 'POST',
      body: JSON.stringify({
        action: 'update_location',
        location,
      }),
    });
  },

  testSetState: async (state: 'idle' | 'riding' | 'driving', destination?: Location | null): Promise<{ success: boolean; state: string; destination?: Location | null }> => {
    return request('/api/test/control', {
      method: 'POST',
      body: JSON.stringify({
        action: 'set_state',
        state,
        destination,
      }),
    });
  },

  testDespawn: async (): Promise<{ success: boolean; message: string }> => {
    const response = await request('/api/test/control', {
      method: 'POST',
      body: JSON.stringify({
        action: 'despawn',
      }),
    });
    // Clear the test user token
    await setTestUserToken(null);
    return response;
  },

  testGetStatus: async (): Promise<{ exists: boolean; user?: any; token?: string }> => {
    const response = await request('/api/test/control', {
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

export async function setAuthToken(token: string): Promise<void> {
  await AsyncStorage.setItem('authToken', token);
}

export async function clearAuthToken(): Promise<void> {
  await AsyncStorage.removeItem('authToken');
}

import type { VehicleType } from '../constants/vehicles';

export interface Location {
  lat: number;
  lng: number;
}

export interface Session {
  token: string;
  tokens?: string[];
}

export type UserState = 'driving' | 'riding' | 'idle';

export interface KycData {
  sessionId: string;
  status: string;
  createdAt?: string;
  submittedAt?: string;
  updatedAt?: string;
  reviewedAt?: string;
  verifiedAt?: string;
  age?: number;
  gender?: string;
  portraitImage?: string;
  address?: string;
}

export interface User {
  Id: string;
  Name: string;
  Mobile: string;
  PasswordHash: string;
  Session: Session;
  WalletBalance: number;
  UpiId?: string;
  VehicleType?: VehicleType;
  VehicleName?: string;
  VehicleModel?: string;
  VehicleRegistration?: string;
  state: UserState;
  LastLocation?: Location;
  Destination?: Location;
  KycData?: KycData;
  KycStatus?:
    | 'not_started'
    | 'session_created'
    | 'submitted'
    | 'under_review'
    | 'approved'
    | 'rejected'
    | 'failed';
  IsKycVerified: boolean;
  DriverRatingAverage?: number;
  DriverRatingCount?: number;
  PassengerRewardPoints?: number;
  DriverRewardPoints?: number;
  ActiveCommunityId?: string | null;
}

export type RideConnectionState = 'requested' | 'accepted' | 'rejected' | 'picked_up' | 'completed' | 'cancelled';
export type CancellationInitiator = 'passenger' | 'driver';
export type PaymentStatus = 'pending' | 'success' | 'failed';

export interface RideConnection {
  Id: string;
  PassengerId: string;
  DriverId: string;
  PickupLocation: Location;
  Destination: Location;
  Distance: number;
  Fare: number;
  RideTotalTime?: number;
  OtpCode?: string;
  RequestedVehicleType?: VehicleType;
  RequestedVehicleName?: string;
  RequestedVehicleModel?: string;
  RequestedVehicleRegistration?: string;
  PassengerVehicleConfirmation?: 'pending' | 'confirmed' | 'mismatch';
  PassengerVehicleConfirmedAt?: any;
  State: RideConnectionState;
  PaymentStatus: PaymentStatus;
  DriverRating?: number;
  DriverRatedAt?: any;
  ShareToken?: string;
  ShareCreatedAt?: any;
  CommunityId?: string | null;
  AcceptedAt?: any;
  CancelledAt?: any;
  CancelledBy?: CancellationInitiator;
  CancellationPenalty?: number;
  CreatedAt: any;
}

export interface RideShareDetails {
  connection: {
    Id: string;
    State: RideConnectionState;
    PickupLocation: Location;
    Destination: Location;
    Distance: number;
    Fare: number;
    CreatedAt: string | null;
    RideTotalTime: number | null;
  };
  driver: {
    name: string;
    vehicleType: string | null;
    vehicleName: string | null;
    vehicleModel: string | null;
    vehicleRegistration: string | null;
    ratingAverage: number | null;
    ratingCount: number;
    lastLocation: Location | null;
  };
  passenger: {
    name: string;
    lastLocation: Location | null;
  };
  sharedAt: string | null;
  updatedAt: string;
}

export interface MarkerData {
  userId: string;
  name: string;
  rating?: number;
  vehicle?: string;
  vehicleName?: string;
  vehicleModel?: string;
  vehicleRegistration?: string;
  lastLocation: Location;
  destination: Location;
}

export interface UserPublic {
  Id: string;
  Name: string;
  Mobile: string;
  state: UserState;
  LastLocation?: Location;
  Destination?: Location;
  WalletBalance: number;
  UpiId?: string;
  VehicleType?: VehicleType;
  VehicleName?: string;
  VehicleModel?: string;
  VehicleRegistration?: string;
  KycStatus?:
    | 'not_started'
    | 'session_created'
    | 'submitted'
    | 'under_review'
    | 'approved'
    | 'rejected'
    | 'failed';
  IsKycVerified: boolean;
  PassengerRewardPoints?: number;
  DriverRewardPoints?: number;
  ActiveCommunityId?: string | null;
}

export interface Community {
  Id: string;
  Name: string;
  AdminId: string;
  participantCount: number;
  isAdmin: boolean;
  isActive: boolean;
  CreatedAt?: any;
}

export interface CommunityMember {
  Id: string;
  Name: string;
  Mobile: string;
  isAdmin: boolean;
}

export type RewardRole = 'passenger' | 'driver';

export interface RewardVoucher {
  id: string;
  role: RewardRole;
  title: string;
  description: string;
  pointsCost: number;
}

export interface RewardRedemption {
  Id: string;
  UserId: string;
  VoucherId: string;
  VoucherTitle: string;
  Role: RewardRole;
  PointsCost: number;
  Status: 'redeemed';
  CreatedAt: any;
}

export type TransactionType = 'topup' | 'payout' | 'ride_payment' | 'ride_earning';
export type TransactionStatus = 'pending' | 'success' | 'failed';

export interface Transaction {
  Id: string;
  UserId: string;
  Type: TransactionType;
  Amount: number;
  BalanceBefore: number;
  BalanceAfter: number;
  Status: TransactionStatus;
  RazorpayOrderId?: string;
  RazorpayPaymentId?: string;
  RazorpayPayoutId?: string;
  UpiId?: string;
  RideConnectionId?: string;
  Description: string;
  CreatedAt: any;
  UpdatedAt: any;
}

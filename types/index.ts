export interface Location {
  lat: number;
  lng: number;
}

export interface Session {
  token: string;
}

export interface Wallet {
  address: string;
  EncryptedKey: string;
}

export type UserState = 'driving' | 'riding' | 'idle';

export interface User {
  Id: string;
  Name: string;
  Mobile: string;
  PasswordHash: string;
  Session: Session;
  Wallet: Wallet;
  state: UserState;
  LastLocation?: Location;
  Destination?: Location;
  KycData?: any;
  IsKycVerified: boolean;
}

export type RideConnectionState = 'requested' | 'accepted' | 'rejected' | 'picked_up' | 'completed';

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
  State: RideConnectionState;
  CreatedAt: any;
}

export interface MarkerData {
  userId: string;
  name: string;
  rating?: number;
  vehicle?: string;
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
  Wallet: { address: string };
  IsKycVerified: boolean;
}
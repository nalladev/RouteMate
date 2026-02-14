import type { RewardRole, RewardVoucher } from '../types';

export const PASSENGER_POINTS_PER_COMPLETED_RIDE = 10;
export const DRIVER_POINTS_PER_FIVE_STAR_RIDE = 20;

export const PASSENGER_VOUCHERS: RewardVoucher[] = [
  {
    id: 'passenger_free_ride_50',
    role: 'passenger',
    title: 'Free Ride (Up to ₹50)',
    description: 'Use on your next ride fare up to ₹50.',
    pointsCost: 120,
  },
  {
    id: 'passenger_priority_support',
    role: 'passenger',
    title: 'Priority Support',
    description: 'Get priority handling for one support request.',
    pointsCost: 80,
  },
  {
    id: 'passenger_ride_discount_20',
    role: 'passenger',
    title: '₹20 Ride Discount',
    description: 'Flat ₹20 discount on one eligible ride.',
    pointsCost: 60,
  },
];

export const DRIVER_VOUCHERS: RewardVoucher[] = [
  {
    id: 'driver_free_fuel_100',
    role: 'driver',
    title: 'Free Fuel (₹100)',
    description: 'Fuel voucher worth ₹100 at participating pumps.',
    pointsCost: 180,
  },
  {
    id: 'driver_service_discount',
    role: 'driver',
    title: 'Vehicle Service Discount',
    description: '10% off on one partner service booking.',
    pointsCost: 140,
  },
  {
    id: 'driver_toll_rebate',
    role: 'driver',
    title: 'Toll Rebate',
    description: 'Dummy toll rebate voucher for one trip.',
    pointsCost: 90,
  },
];

export function getVouchersByRole(role: RewardRole): RewardVoucher[] {
  return role === 'driver' ? DRIVER_VOUCHERS : PASSENGER_VOUCHERS;
}

export function getVoucherById(role: RewardRole, voucherId: string): RewardVoucher | undefined {
  return getVouchersByRole(role).find((voucher) => voucher.id === voucherId);
}

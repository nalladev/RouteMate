export const VEHICLE_TYPES = ['Sedan', 'SUV', 'Hatchback', 'Bike', 'Auto', 'Van', 'Other'] as const;

export type VehicleType = (typeof VEHICLE_TYPES)[number];

export function isVehicleType(value: unknown): value is VehicleType {
  return typeof value === 'string' && VEHICLE_TYPES.includes(value as VehicleType);
}

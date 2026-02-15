/**
 * Trip estimation utilities for calculating fare, ETA, and ride duration
 */

import { Location } from '@/types';
import { getRoute, calculateDistance as calcDistanceMeters } from './routing';
import { calculateFare, formatFare as formatFareAmount } from '@/config/fare';

export interface TripEstimate {
  distance: number; // in km
  distanceMeters: number; // in meters
  duration: number; // in seconds
  durationMinutes: number; // in minutes
  fare: number; // in currency units
  eta: Date; // estimated time of arrival
  rideCompletionTime: Date; // estimated ride completion time
}



/**
 * Calculate distance in kilometers using Haversine formula
 * @param lat1 - First point latitude
 * @param lng1 - First point longitude
 * @param lat2 - Second point latitude
 * @param lng2 - Second point longitude
 * @returns Distance in kilometers
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Estimate ETA to pickup location
 * Assumes average speed of 30 km/h in urban areas
 * @param driverLocation - Driver's current location
 * @param pickupLocation - Passenger's pickup location
 * @returns ETA in minutes
 */
export function estimatePickupETA(driverLocation: Location, pickupLocation: Location): number {
  const distanceKm = calculateDistance(
    driverLocation.lat,
    driverLocation.lng,
    pickupLocation.lat,
    pickupLocation.lng
  );
  const averageSpeedKmh = 30; // Urban driving speed
  const etaMinutes = (distanceKm / averageSpeedKmh) * 60;
  return Math.ceil(etaMinutes);
}

/**
 * Get comprehensive trip estimate with route information
 * @param origin - Starting point
 * @param destination - Ending point
 * @param driverLocation - Optional driver location for ETA calculation
 * @returns Trip estimate with all details
 */
export async function getTripEstimate(
  origin: Location,
  destination: Location,
  driverLocation?: Location
): Promise<TripEstimate | null> {
  try {
    // Get route information from OSRM
    const route = await getRoute(origin, destination);
    
    if (!route) {
      // Fallback to straight-line distance if route API fails
      const distanceMeters = calcDistanceMeters(
        origin.lat,
        origin.lng,
        destination.lat,
        destination.lng
      );
      const distanceKm = distanceMeters / 1000;
      const estimatedDurationSeconds = (distanceKm / 30) * 3600; // 30 km/h average
      
      const fare = calculateFare(distanceKm);
      const now = new Date();
      
      let pickupEtaMinutes = 0;
      if (driverLocation) {
        pickupEtaMinutes = estimatePickupETA(driverLocation, origin);
      }
      
      const eta = new Date(now.getTime() + pickupEtaMinutes * 60 * 1000);
      const rideCompletionTime = new Date(
        eta.getTime() + estimatedDurationSeconds * 1000
      );
      
      return {
        distance: distanceKm,
        distanceMeters,
        duration: estimatedDurationSeconds,
        durationMinutes: Math.ceil(estimatedDurationSeconds / 60),
        fare,
        eta,
        rideCompletionTime,
      };
    }
    
    // Use route data from OSRM
    const distanceKm = route.distance / 1000;
    const fare = calculateFare(distanceKm);
    const now = new Date();
    
    let pickupEtaMinutes = 0;
    if (driverLocation) {
      pickupEtaMinutes = estimatePickupETA(driverLocation, origin);
    }
    
    const eta = new Date(now.getTime() + pickupEtaMinutes * 60 * 1000);
    const rideCompletionTime = new Date(eta.getTime() + route.duration * 1000);
    
    return {
      distance: distanceKm,
      distanceMeters: route.distance,
      duration: route.duration,
      durationMinutes: Math.ceil(route.duration / 60),
      fare,
      eta,
      rideCompletionTime,
    };
  } catch (error) {
    console.error('Error calculating trip estimate:', error);
    return null;
  }
}

/**
 * Format time for display (e.g., "15 min", "1h 30m")
 * @param minutes - Duration in minutes
 * @returns Formatted string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

/**
 * Format ETA for display (e.g., "3:45 PM")
 * @param date - Date object
 * @returns Formatted time string
 */
export function formatETA(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format distance for display
 * @param km - Distance in kilometers
 * @returns Formatted string (e.g., "5.2 km")
 */
export function formatDistanceKm(km: number): string {
  return `${km.toFixed(1)} km`;
}

/**
 * Format fare for display
 * @param fare - Fare amount
 * @returns Formatted string (e.g., "₹150.00")
 */
export function formatFare(fare: number): string {
  return formatFareAmount(fare);
}

/**
 * Get simple estimate without route API (faster but less accurate)
 * Used for quick previews before detailed calculation
 */
export function getQuickEstimate(
  origin: Location,
  destination: Location,
  driverLocation?: Location
): TripEstimate {
  const distanceMeters = calcDistanceMeters(
    origin.lat,
    origin.lng,
    destination.lat,
    destination.lng
  );
  const distanceKm = distanceMeters / 1000;
  const estimatedDurationSeconds = (distanceKm / 30) * 3600; // 30 km/h average
  
  const fare = calculateFare(distanceKm);
  const now = new Date();
  
  let pickupEtaMinutes = 0;
  if (driverLocation) {
    pickupEtaMinutes = estimatePickupETA(driverLocation, origin);
  }
  
  const eta = new Date(now.getTime() + pickupEtaMinutes * 60 * 1000);
  const rideCompletionTime = new Date(
    eta.getTime() + estimatedDurationSeconds * 1000
  );
  
  return {
    distance: distanceKm,
    distanceMeters,
    duration: estimatedDurationSeconds,
    durationMinutes: Math.ceil(estimatedDurationSeconds / 60),
    fare,
    eta,
    rideCompletionTime,
  };
}
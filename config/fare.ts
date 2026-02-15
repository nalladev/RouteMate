/**
 * Centralized fare configuration for the entire app
 * All fare-related constants and functions should use this configuration
 */

// Currency configuration
export const CURRENCY_SYMBOL = '₹';
export const CURRENCY_CODE = 'INR';

// Fare calculation constants (in INR)
export const BASE_FARE = 30; // ₹30 base fare
export const PER_KM_RATE = 12; // ₹12 per km

/**
 * Calculate fare based on distance
 * @param distanceKm - Distance in kilometers
 * @returns Calculated fare in INR
 */
export function calculateFare(distanceKm: number): number {
  return BASE_FARE + (distanceKm * PER_KM_RATE);
}

/**
 * Format fare for display with currency symbol
 * @param fare - Fare amount
 * @returns Formatted string (e.g., "₹150.00")
 */
export function formatFare(fare: number): string {
  return `${CURRENCY_SYMBOL}${fare.toFixed(2)}`;
}

/**
 * Format currency amount for display
 * @param amount - Amount to format
 * @returns Formatted string with currency symbol
 */
export function formatCurrency(amount: number): string {
  return `${CURRENCY_SYMBOL}${amount.toFixed(2)}`;
}
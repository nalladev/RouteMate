// Cancellation penalty configuration

// Time windows in minutes
export const PENALTY_FREE_WINDOW_MINUTES = 2; // No penalty if driver cancels within 2 minutes of accepting
export const PENALTY_TIER_1_MINUTES = 5; // Low penalty up to 5 minutes
export const PENALTY_TIER_2_MINUTES = 10; // Medium penalty up to 10 minutes
// Above 10 minutes = High penalty

// Penalty amounts in rupees
export const PENALTY_TIER_1_AMOUNT = 10; // ₹10 for 2-5 minutes
export const PENALTY_TIER_2_AMOUNT = 20; // ₹20 for 5-10 minutes
export const PENALTY_TIER_3_AMOUNT = 50; // ₹50 for >10 minutes

/**
 * Calculate driver cancellation penalty based on time elapsed since acceptance
 * @param acceptedAt - The date when the driver accepted the ride
 * @param cancelledAt - The date when the driver cancelled the ride
 * @returns The penalty amount in rupees
 */
export function calculateDriverCancellationPenalty(
  acceptedAt: Date,
  cancelledAt: Date = new Date()
): number {
  const minutesElapsed = (cancelledAt.getTime() - acceptedAt.getTime()) / (1000 * 60);

  if (minutesElapsed <= PENALTY_FREE_WINDOW_MINUTES) {
    return 0;
  } else if (minutesElapsed <= PENALTY_TIER_1_MINUTES) {
    return PENALTY_TIER_1_AMOUNT;
  } else if (minutesElapsed <= PENALTY_TIER_2_MINUTES) {
    return PENALTY_TIER_2_AMOUNT;
  } else {
    return PENALTY_TIER_3_AMOUNT;
  }
}

/**
 * Get cancellation penalty description for UI display
 * @param penalty - Penalty amount
 * @param minutesElapsed - Minutes elapsed since acceptance
 * @returns Human-readable description
 */
export function getCancellationPenaltyDescription(
  penalty: number,
  minutesElapsed: number
): string {
  if (penalty === 0) {
    return 'No penalty - cancelled within grace period';
  } else if (penalty === PENALTY_TIER_1_AMOUNT) {
    return `Penalty of ₹${penalty} for cancelling after ${minutesElapsed.toFixed(1)} minutes`;
  } else if (penalty === PENALTY_TIER_2_AMOUNT) {
    return `Penalty of ₹${penalty} for cancelling after ${minutesElapsed.toFixed(1)} minutes`;
  } else {
    return `Penalty of ₹${penalty} for cancelling after ${minutesElapsed.toFixed(1)} minutes`;
  }
}
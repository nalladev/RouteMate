import { getAllDocuments, updateDocument } from './firestore';

/**
 * Background job to auto-expire ride requests that are older than 10 minutes
 * Should be called periodically (e.g., every minute)
 */
export async function expireOldRequests(): Promise<void> {
  try {
    const connections = await getAllDocuments('rideconnections');
    const now = new Date();
    
    for (const connection of connections) {
      if (connection.State === 'requested' && connection.ExpiresAt) {
        const expiresAt = new Date(connection.ExpiresAt);
        
        if (expiresAt < now) {
          await updateDocument('rideconnections', connection.Id, {
            State: 'rejected',
          });
          console.log(`Expired request ${connection.Id}`);
        }
      }
    }
  } catch (error) {
    console.error('Error expiring old requests:', error);
  }
}

/**
 * Start the background job runner
 * Runs expireOldRequests every minute
 */
export function startBackgroundJobs(): void {
  // Run immediately
  expireOldRequests();
  
  // Then run every minute
  setInterval(() => {
    expireOldRequests();
  }, 60000); // 60 seconds
}
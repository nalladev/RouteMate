import { updateDocument, initializeFirestore } from './firestore';

/**
 * Background job to auto-expire ride requests that are older than 10 minutes
 * Should be called periodically (e.g., every minute)
 * 
 * OPTIMIZED: Only queries 'requested' state rides instead of all connections
 */
export async function expireOldRequests(): Promise<void> {
  try {
    const firestore = initializeFirestore();
    const now = new Date();
    
    // OPTIMIZATION: Only fetch 'requested' state connections instead of all connections
    // This dramatically reduces Firestore reads
    const snapshot = await firestore
      .collection('rideconnections')
      .where('State', '==', 'requested')
      .get();
    
    const connections = snapshot.docs.map((doc: any) => ({ Id: doc.id, ...doc.data() }));
    
    let expiredCount = 0;
    
    for (const connection of connections) {
      if (connection.ExpiresAt) {
        const expiresAt = new Date(connection.ExpiresAt);
        
        if (expiresAt < now) {
          await updateDocument('rideconnections', connection.Id, {
            State: 'rejected',
            RejectionReason: 'Request expired (10 minutes timeout)',
            RejectedAt: now.toISOString(),
          });
          expiredCount++;
        }
      }
    }
    
    if (expiredCount > 0) {
      console.log(`[Background Job] Expired ${expiredCount} old ride requests`);
    }
  } catch (error) {
    console.error('[Background Job] Error expiring old requests:', error);
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
import { getAuthToken, validateSession } from '../../../lib/middleware';
import { getDocument } from '../../../lib/firestore';

export async function GET(request: Request) {
  try {
    const token = getAuthToken(request);

    if (!token) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await validateSession(token);

    if (!user) {
      return Response.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Get all pending requests for this driver
    const allRequests = await getDocument('rideconnections', { DriverId: user.Id });
    
    // Filter for pending/requested state and check expiry
    const now = new Date();
    const requests = allRequests.filter((r: any) => {
      if (r.State !== 'requested') return false;
      
      // Check if expired
      if (r.ExpiresAt && new Date(r.ExpiresAt) < now) {
        return false;
      }
      
      return true;
    });

    return Response.json({
      requests,
    });
  } catch (error) {
    console.error('Get requests error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
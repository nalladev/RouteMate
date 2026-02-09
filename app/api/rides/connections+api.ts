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

    // Get connections where user is either driver or passenger
    const driverConnections = await getDocument('rideconnections', { DriverId: user.Id });
    const passengerConnections = await getDocument('rideconnections', { PassengerId: user.Id });

    // Combine and filter for active connections
    const allConnections = [...driverConnections, ...passengerConnections];
    const activeConnections = allConnections.filter((c: any) => 
      c.State !== 'completed' && c.State !== 'rejected'
    );

    return Response.json({
      connections: activeConnections,
    });
  } catch (error) {
    console.error('Get connections error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
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

    // Get completed rides where user is either driver or passenger
    const driverRides = await getDocument('rideconnections', { DriverId: user.Id });
    const passengerRides = await getDocument('rideconnections', { PassengerId: user.Id });

    // Combine and filter for completed rides only
    const allRides = [...driverRides, ...passengerRides];
    const completedRides = allRides.filter((r: any) => r.State === 'completed');

    // Sort by completion date (most recent first)
    completedRides.sort((a: any, b: any) => {
      const dateA = a.CompletedAt ? new Date(a.CompletedAt).getTime() : 0;
      const dateB = b.CompletedAt ? new Date(b.CompletedAt).getTime() : 0;
      return dateB - dateA;
    });

    return Response.json({
      rides: completedRides,
    });
  } catch (error) {
    console.error('Get history error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
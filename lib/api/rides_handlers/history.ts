import { getAuthToken, validateSession } from '../../middleware';
import { getDocument } from '../../firestore';

export async function handleHistory(request: Request) {
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
    const dateA = a.CompletedAt?.toDate ? a.CompletedAt.toDate().getTime() : (a.CompletedAt ? new Date(a.CompletedAt).getTime() : 0);
    const dateB = b.CompletedAt?.toDate ? b.CompletedAt.toDate().getTime() : (b.CompletedAt ? new Date(b.CompletedAt).getTime() : 0);
    return dateB - dateA;
  });

  // Convert Firestore Timestamps to ISO strings for JSON serialization
  const serializedRides = completedRides.map((ride: any) => ({
    ...ride,
    CreatedAt: ride.CreatedAt?.toDate ? ride.CreatedAt.toDate().toISOString() : ride.CreatedAt,
    CompletedAt: ride.CompletedAt?.toDate ? ride.CompletedAt.toDate().toISOString() : ride.CompletedAt,
    AcceptedAt: ride.AcceptedAt?.toDate ? ride.AcceptedAt.toDate().toISOString() : ride.AcceptedAt,
    CancelledAt: ride.CancelledAt?.toDate ? ride.CancelledAt.toDate().toISOString() : ride.CancelledAt,
    DriverRatedAt: ride.DriverRatedAt?.toDate ? ride.DriverRatedAt.toDate().toISOString() : ride.DriverRatedAt,
  }));

  return Response.json({
    rides: serializedRides,
  });
}
export default function Handler() { return null; }

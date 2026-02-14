import { getAuthToken, validateSession } from '../../middleware';
import { getDocumentById, runTransaction, initializeFirestore } from '../../firestore';
import { RideConnection, User } from '../../../types';
import { DRIVER_POINTS_PER_FIVE_STAR_RIDE } from '../../../constants/rewards';

export async function handleConnectionRate(request: Request) {
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

  const body = await request.json();
  const { connectionId, rating } = body;

  if (!connectionId || rating === undefined) {
    return Response.json(
      { error: 'connectionId and rating are required' },
      { status: 400 }
    );
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return Response.json(
      { error: 'rating must be an integer between 1 and 5' },
      { status: 400 }
    );
  }

  const connection = await getDocumentById('rideconnections', connectionId) as RideConnection;

  if (!connection) {
    return Response.json(
      { error: 'Connection not found' },
      { status: 404 }
    );
  }

  if (connection.PassengerId !== user.Id) {
    return Response.json(
      { error: 'Only the passenger can rate this ride' },
      { status: 403 }
    );
  }

  if (connection.State !== 'completed') {
    return Response.json(
      { error: 'Only completed rides can be rated' },
      { status: 400 }
    );
  }

  if (connection.DriverRating !== undefined && connection.DriverRating !== null) {
    return Response.json(
      { error: 'This ride has already been rated' },
      { status: 400 }
    );
  }

  const db = initializeFirestore();
  const result = await runTransaction(async (transaction) => {
    const connectionRef = db.collection('rideconnections').doc(connectionId);
    const driverRef = db.collection('users').doc(connection.DriverId);

    const connectionDoc = await transaction.get(connectionRef);
    const driverDoc = await transaction.get(driverRef);

    if (!connectionDoc.exists) {
      throw new Error('Connection not found in transaction');
    }

    if (!driverDoc.exists) {
      throw new Error('Driver not found in transaction');
    }

    const connectionData = { Id: connectionDoc.id, ...connectionDoc.data() } as RideConnection;
    const driverData = { Id: driverDoc.id, ...driverDoc.data() } as User;

    if (connectionData.DriverRating !== undefined && connectionData.DriverRating !== null) {
      throw new Error('This ride has already been rated');
    }

    const currentCount = driverData.DriverRatingCount || 0;
    const currentAverage = driverData.DriverRatingAverage || 0;
    const currentDriverRewardPoints = driverData.DriverRewardPoints || 0;
    const newCount = currentCount + 1;
    const newAverage = ((currentAverage * currentCount) + rating) / newCount;
    const driverPointsAwarded = rating === 5 ? DRIVER_POINTS_PER_FIVE_STAR_RIDE : 0;
    const newDriverRewardPoints = currentDriverRewardPoints + driverPointsAwarded;

    transaction.update(connectionRef, {
      DriverRating: rating,
      DriverRatedAt: new Date(),
    });

    transaction.update(driverRef, {
      DriverRatingCount: newCount,
      DriverRatingAverage: Number(newAverage.toFixed(2)),
      DriverRewardPoints: newDriverRewardPoints,
    });

    return {
      success: true,
      rating,
      driverRatingAverage: Number(newAverage.toFixed(2)),
      driverRatingCount: newCount,
      driverPointsAwarded,
      driverRewardPoints: newDriverRewardPoints,
    };
  });

  return Response.json(result);
}
export default function Handler() { return null; }

import { getAuthToken, validateSession } from '../../../../lib/middleware';
import { getDocumentById, runTransaction, initializeFirestore } from '../../../../lib/firestore';
import { RideConnection, User } from '../../../../types';

export async function POST(request: Request) {
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
      const newCount = currentCount + 1;
      const newAverage = ((currentAverage * currentCount) + rating) / newCount;

      transaction.update(connectionRef, {
        DriverRating: rating,
        DriverRatedAt: new Date(),
      });

      transaction.update(driverRef, {
        DriverRatingCount: newCount,
        DriverRatingAverage: Number(newAverage.toFixed(2)),
      });

      return {
        success: true,
        rating,
        driverRatingAverage: Number(newAverage.toFixed(2)),
        driverRatingCount: newCount,
      };
    });

    return Response.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'This ride has already been rated') {
      return Response.json(
        { error: error.message },
        { status: 400 }
      );
    }

    console.error('Rate ride error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

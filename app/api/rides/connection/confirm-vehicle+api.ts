import { getAuthToken, validateSession } from '../../../../lib/middleware';
import { getDocumentById, updateDocument } from '../../../../lib/firestore';

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
    const { connectionId, isSameVehicle } = body;

    if (!connectionId || typeof isSameVehicle !== 'boolean') {
      return Response.json(
        { error: 'connectionId and isSameVehicle are required' },
        { status: 400 }
      );
    }

    const connection = await getDocumentById('rideconnections', connectionId);

    if (!connection) {
      return Response.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    if (connection.PassengerId !== user.Id) {
      return Response.json(
        { error: 'Only passenger can confirm vehicle' },
        { status: 403 }
      );
    }

    if (!['accepted', 'picked_up'].includes(connection.State)) {
      return Response.json(
        { error: 'Vehicle can only be confirmed after request acceptance' },
        { status: 400 }
      );
    }

    if (!connection.RequestedVehicleType) {
      return Response.json(
        { error: 'No requested vehicle type available for this ride' },
        { status: 400 }
      );
    }

    const confirmationState = isSameVehicle ? 'confirmed' : 'mismatch';

    await updateDocument('rideconnections', connectionId, {
      PassengerVehicleConfirmation: confirmationState,
      PassengerVehicleConfirmedAt: new Date(),
    });

    return Response.json({
      success: true,
      confirmation: confirmationState,
    });
  } catch (error) {
    console.error('Confirm vehicle error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

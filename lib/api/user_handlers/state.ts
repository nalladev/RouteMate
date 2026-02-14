import { getAuthToken, validateSession } from '../../middleware';
import { getDocument, updateDocument } from '../../firestore';

export async function handleState(request: Request) {
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
  const { state, destination } = body;

  if (!state || !['driving', 'riding', 'idle'].includes(state)) {
    return Response.json(
      { error: 'Invalid state. Must be driving, riding, or idle' },
      { status: 400 }
    );
  }

  const updateData: any = { state };

  if (state === 'driving' && !user.VehicleType) {
    return Response.json(
      { error: 'Driver vehicle type is required before starting driving mode' },
      { status: 400 }
    );
  }

  if (state === 'idle') {
    const [driverConnections, passengerConnections] = await Promise.all([
      getDocument('rideconnections', { DriverId: user.Id }),
      getDocument('rideconnections', { PassengerId: user.Id }),
    ]);

    const hasConnectedPassenger = driverConnections.some((connection: any) =>
      connection.State === 'accepted' || connection.State === 'picked_up'
    );
    const hasAcceptedRideAsPassenger = passengerConnections.some((connection: any) =>
      connection.State === 'accepted' || connection.State === 'picked_up'
    );

    if (hasConnectedPassenger || hasAcceptedRideAsPassenger) {
      return Response.json(
        { error: 'Cannot exit active mode while a connected ride is in progress. Complete the ride first.' },
        { status: 409 }
      );
    }
  }

  if (destination) {
    if (typeof destination.lat !== 'number' || typeof destination.lng !== 'number') {
      return Response.json(
        { error: 'Invalid destination format' },
        { status: 400 }
      );
    }
    updateData.Destination = destination;
  } else {
    updateData.Destination = null;
  }

  await updateDocument('users', user.Id, updateData);

  return Response.json({
    success: true,
  });
}
export default function Handler() { return null; }

import { getAuthToken, validateSession } from '../../middleware';
import { getDocumentById, updateDocument } from '../../firestore';

export async function handleConnectionVerifyOtp(request: Request) {
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
  const { connectionId, otp } = body;

  if (!connectionId || !otp) {
    return Response.json(
      { error: 'connectionId and otp are required' },
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

  if (connection.DriverId !== user.Id) {
    return Response.json(
      { error: 'Unauthorized to verify this connection' },
      { status: 403 }
    );
  }

  if (connection.State !== 'accepted') {
    return Response.json(
      { error: 'Connection must be in accepted state' },
      { status: 400 }
    );
  }

  if (connection.RequestedVehicleType && connection.PassengerVehicleConfirmation !== 'confirmed') {
    const message =
      connection.PassengerVehicleConfirmation === 'mismatch'
        ? 'Passenger reported a vehicle mismatch. Resolve before pickup.'
        : 'Passenger must confirm the vehicle before pickup.';
    return Response.json(
      { error: message },
      { status: 400 }
    );
  }

  if (connection.OtpCode !== otp) {
    return Response.json(
      { error: 'Invalid OTP code' },
      { status: 400 }
    );
  }

  await updateDocument('rideconnections', connectionId, {
    State: 'picked_up',
  });

  return Response.json({
    success: true,
  });
}
export default function Handler() { return null; }

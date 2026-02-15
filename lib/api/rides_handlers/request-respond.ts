import { getAuthToken, validateSession } from '../../middleware';
import { getDocumentById, updateDocument } from '../../firestore';

export async function handleRequestRespond(request: Request) {
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
  const { requestId, action } = body;

  if (!requestId || !action) {
    return Response.json(
      { error: 'requestId and action are required' },
      { status: 400 }
    );
  }

  if (!['accepted', 'rejected'].includes(action)) {
    return Response.json(
      { error: 'action must be either accepted or rejected' },
      { status: 400 }
    );
  }

  const connection = await getDocumentById('rideconnections', requestId);

  if (!connection) {
    return Response.json(
      { error: 'Request not found' },
      { status: 404 }
    );
  }

  if (connection.DriverId !== user.Id) {
    return Response.json(
      { error: 'Unauthorized to respond to this request' },
      { status: 403 }
    );
  }

  if (user.ActiveCommunityId && connection.CommunityId !== user.ActiveCommunityId) {
    return Response.json(
      { error: 'Request is not in your active community' },
      { status: 403 }
    );
  }

  if (connection.State !== 'requested') {
    return Response.json(
      { error: 'Request is no longer pending' },
      { status: 400 }
    );
  }

  // Check if expired
  const expiresAt = connection.ExpiresAt?.toDate
    ? connection.ExpiresAt.toDate()
    : (connection.ExpiresAt ? new Date(connection.ExpiresAt) : null);
  if (expiresAt && expiresAt < new Date()) {
    await updateDocument('rideconnections', requestId, {
      State: 'rejected',
    });
    return Response.json(
      { error: 'Request has expired' },
      { status: 400 }
    );
  }

  const updateData: any = {
    State: action,
  };

  // Track when driver accepts the ride for cancellation penalty calculation
  if (action === 'accepted') {
    updateData.AcceptedAt = new Date();
  }

  await updateDocument('rideconnections', requestId, updateData);

  const updatedConnection = await getDocumentById('rideconnections', requestId);

  return Response.json({
    connection: updatedConnection,
  });
}
export default function Handler() { return null; }

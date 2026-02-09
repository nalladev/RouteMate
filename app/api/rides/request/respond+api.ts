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

    if (connection.State !== 'requested') {
      return Response.json(
        { error: 'Request is no longer pending' },
        { status: 400 }
      );
    }

    // Check if expired
    if (connection.ExpiresAt && new Date(connection.ExpiresAt) < new Date()) {
      await updateDocument('rideconnections', requestId, {
        State: 'rejected',
      });
      return Response.json(
        { error: 'Request has expired' },
        { status: 400 }
      );
    }

    await updateDocument('rideconnections', requestId, {
      State: action,
    });

    const updatedConnection = await getDocumentById('rideconnections', requestId);

    return Response.json({
      connection: updatedConnection,
    });
  } catch (error) {
    console.error('Respond to request error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
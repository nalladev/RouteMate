import { getAuthToken, validateSession } from '../../middleware';
import { getDocumentById, updateDocument } from '../../firestore';

export async function handleRequestCancel(request: Request) {
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
  const { requestId } = body;

  if (!requestId) {
    return Response.json(
      { error: 'requestId is required' },
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

  if (connection.PassengerId !== user.Id) {
    return Response.json(
      { error: 'Unauthorized to cancel this request' },
      { status: 403 }
    );
  }

  if (connection.State === 'completed' || connection.State === 'rejected') {
    return Response.json(
      { error: 'Cannot cancel completed or rejected request' },
      { status: 400 }
    );
  }

  await updateDocument('rideconnections', requestId, {
    State: 'rejected',
  });

  return Response.json({
    success: true,
  });
}
export default function Handler() { return null; }

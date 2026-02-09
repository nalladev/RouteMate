import { getAuthToken, validateSession } from '../../../lib/middleware';
import { updateDocument } from '../../../lib/firestore';

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
    const { lat, lng } = body;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return Response.json(
        { error: 'Invalid location format. lat and lng must be numbers' },
        { status: 400 }
      );
    }

    await updateDocument('users', user.Id, {
      LastLocation: { lat, lng },
    });

    return Response.json({
      success: true,
    });
  } catch (error) {
    console.error('Update location error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
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
    const { state, destination } = body;

    if (!state || !['driving', 'riding', 'idle'].includes(state)) {
      return Response.json(
        { error: 'Invalid state. Must be driving, riding, or idle' },
        { status: 400 }
      );
    }

    const updateData: any = { state };

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
  } catch (error) {
    console.error('Update state error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
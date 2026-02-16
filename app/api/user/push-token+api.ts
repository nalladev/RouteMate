import { getAuthToken, validateSession } from '../../../lib/middleware';
import { updateDocument } from '../../../lib/firestore';

export async function POST(request: Request) {
  try {
    const token = getAuthToken(request);

    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateSession(token);
    if (!user) {
      return Response.json({ error: 'Invalid session' }, { status: 401 });
    }

    const body = await request.json();
    const { pushToken } = body;

    if (!pushToken || typeof pushToken !== 'string') {
      return Response.json({ error: 'Push token is required' }, { status: 400 });
    }

    // Validate Expo push token format
    if (!pushToken.startsWith('ExponentPushToken[')) {
      return Response.json({ error: 'Invalid push token format' }, { status: 400 });
    }

    await updateDocument('users', user.Id, {
      PushToken: pushToken,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Update push token error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
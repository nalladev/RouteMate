import { getAuthToken, validateSession } from '../../middleware';
import { updateDocument } from '../../firestore';

export async function handleLocation(request: Request) {
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
}
export default function Handler() { return null; }

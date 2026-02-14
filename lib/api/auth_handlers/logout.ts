import { getAuthToken, validateSession } from '../../middleware';
import { removeSessionToken } from '../../session';

export async function handleLogout(request: Request) {
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

  await removeSessionToken(user.Id, token);

  return Response.json({
    success: true,
  });
}
export default function Handler() { return null; }

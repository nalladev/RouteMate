import { getAuthToken, validateSession } from '../../middleware';

export async function handleMe(request: Request) {
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

  const { PasswordHash, ...userPublic } = user;

  return Response.json({
    user: userPublic,
  });
}
export default function Handler() { return null; }

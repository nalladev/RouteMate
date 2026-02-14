import { verifyPassword, generateSessionToken } from '../../auth';
import { getDocument } from '../../firestore';
import { addSessionToken } from '../../session';
import { User } from '../../../types';

export async function handleLogin(request: Request) {
  const body = await request.json();
  const { mobile, password } = body;

  if (!mobile || !password) {
    return Response.json(
      { error: 'Mobile and password are required' },
      { status: 400 }
    );
  }

  const users = await getDocument('users', { Mobile: mobile });

  if (users.length === 0) {
    return Response.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  }

  const user = users[0] as User;

  const isValid = await verifyPassword(password, user.PasswordHash);

  if (!isValid) {
    return Response.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  }

  const token = generateSessionToken();
  const session = await addSessionToken(user.Id, token);

  const { PasswordHash, ...userWithoutPassword } = user;
  const updatedUser = {
    ...userWithoutPassword,
    Session: session,
  };

  return Response.json({
    token,
    user: updatedUser,
  });
}
export default function Handler() { return null; }

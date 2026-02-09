import { verifyPassword, generateSessionToken } from '../../../lib/auth';
import { getDocument, updateDocument } from '../../../lib/firestore';
import { User } from '../../../types';

export async function POST(request: Request) {
  try {
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
    await updateDocument('users', user.Id, {
      Session: { token },
    });

    const { PasswordHash, ...userWithoutPassword } = user;
    const updatedUser = {
      ...userWithoutPassword,
      Session: { token },
    };

    return Response.json({
      token,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Login error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
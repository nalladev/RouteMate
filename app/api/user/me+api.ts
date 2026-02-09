import { getAuthToken, validateSession } from '../../../lib/middleware';

export async function GET(request: Request) {
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

    const { PasswordHash, Wallet, ...userPublic } = user;
    const userResponse = {
      ...userPublic,
      Wallet: { address: Wallet.address },
    };

    return Response.json({
      user: userResponse,
    });
  } catch (error) {
    console.error('Get user error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
import { getAuthToken, validateSession } from '../../../lib/middleware';
import { getWalletBalance } from '../../../lib/wallet';

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

    const balance = await getWalletBalance(user.Wallet.address);

    return Response.json({
      balance,
      address: user.Wallet.address,
    });
  } catch (error) {
    console.error('Get wallet balance error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
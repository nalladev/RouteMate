import { generateSessionToken } from '../../../lib/auth';
import { getDocument, updateDocument } from '../../../lib/firestore';
import { decodePhoneEmailToken } from '../../../lib/jwt';
import { User } from '../../../types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { otpToken } = body;

    if (!otpToken) {
      return Response.json(
        { error: 'OTP token is required' },
        { status: 400 }
      );
    }

    const verificationResult = decodePhoneEmailToken(otpToken);

    if (!verificationResult) {
      return Response.json(
        { error: 'Invalid OTP token' },
        { status: 401 }
      );
    }

    const users = await getDocument('users', { Mobile: verificationResult.mobile });

    if (users.length === 0) {
      // User doesn't exist - return flag to frontend for signup flow
      return Response.json({
        userExists: false,
        mobile: verificationResult.mobile,
      });
    }

    const user = users[0] as User;

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
      userExists: true,
      token,
      user: updatedUser,
    });
  } catch (error) {
    console.error('OTP login error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
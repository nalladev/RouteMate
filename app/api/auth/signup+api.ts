import { hashPassword, generateSessionToken } from '../../../lib/auth';
import { addDocument, getDocument } from '../../../lib/firestore';
import { decodePhoneEmailToken } from '../../../lib/jwt';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { otpToken, password } = body;

    if (!otpToken || !password) {
      return Response.json(
        { error: 'OTP token and password are required' },
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

    const existingUsers = await getDocument('users', { Mobile: verificationResult.mobile });

    if (existingUsers.length > 0) {
      return Response.json(
        { error: 'User already exists. Please login.' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const token = generateSessionToken();

    // TEMPORARY: Give new users 2000 rupees starting balance until payment gateway is implemented
    const userId = await addDocument('users', {
      Name: '',
      Mobile: verificationResult.mobile,
      PasswordHash: passwordHash,
      Session: { token, tokens: [token] },
      WalletBalance: 2000,
      UpiId: '',
      state: 'idle',
      KycStatus: 'not_started',
      IsKycVerified: false,
      DriverRatingAverage: 0,
      DriverRatingCount: 0,
    });

    const user = {
      Id: userId,
      Name: '',
      Mobile: verificationResult.mobile,
      state: 'idle' as const,
      Session: { token, tokens: [token] },
      WalletBalance: 2000,
      UpiId: '',
      KycStatus: 'not_started' as const,
      IsKycVerified: false,
      DriverRatingAverage: 0,
      DriverRatingCount: 0,
    };

    return Response.json({
      token,
      user,
    });
  } catch (error) {
    console.error('Signup error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

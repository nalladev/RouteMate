import { hashPassword, generateSessionToken } from '../../auth';
import { addDocument, getDocument } from '../../firestore';
import { decodePhoneEmailToken } from '../../jwt';

export async function handleSignup(request: Request) {
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
    VehicleType: '',
    state: 'idle',
    KycStatus: 'not_started',
    IsKycVerified: false,
    DriverRatingAverage: 0,
    DriverRatingCount: 0,
    PassengerRewardPoints: 0,
    DriverRewardPoints: 0,
    ActiveCommunityId: null,
  });

  const user = {
    Id: userId,
    Name: '',
    Mobile: verificationResult.mobile,
    state: 'idle' as const,
    Session: { token, tokens: [token] },
    WalletBalance: 2000,
    UpiId: '',
    VehicleType: '',
    KycStatus: 'not_started' as const,
    IsKycVerified: false,
    DriverRatingAverage: 0,
    DriverRatingCount: 0,
    PassengerRewardPoints: 0,
    DriverRewardPoints: 0,
    ActiveCommunityId: null,
  };

  return Response.json({
    token,
    user,
  });
}
export default function Handler() { return null; }

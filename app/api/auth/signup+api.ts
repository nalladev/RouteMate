import { hashPassword, generateSessionToken } from '../../../lib/auth';
import { addDocument, getDocument } from '../../../lib/firestore';
import { generateWallet, encryptPrivateKey } from '../../../lib/wallet';

async function verifyPhoneEmailToken(token: string): Promise<{ mobile: string; email?: string } | null> {
  const phoneEmailApiKey = process.env.PHONE_EMAIL_API_KEY;
  if (!phoneEmailApiKey) {
    throw new Error('PHONE_EMAIL_API_KEY is not set');
  }

  try {
    // TODO: Replace with actual phone.email API call
    // const response = await fetch('https://api.phone.email/verify', {
    //   method: 'POST',
    //   headers: { 'Authorization': `Bearer ${phoneEmailApiKey}` },
    //   body: JSON.stringify({ token })
    // });
    // const data = await response.json();
    // return { mobile: data.phone, email: data.email };
    
    return null;
  } catch (error) {
    console.error('Phone.email verification error:', error);
    return null;
  }
}

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

    const verificationResult = await verifyPhoneEmailToken(otpToken);

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
    const wallet = generateWallet();
    const encryptedKey = encryptPrivateKey(wallet.privateKey);

    const userId = await addDocument('users', {
      Name: '',
      Mobile: verificationResult.mobile,
      PasswordHash: passwordHash,
      Session: { token },
      Wallet: {
        address: wallet.publicKey,
        EncryptedKey: encryptedKey,
      },
      state: 'idle',
      IsKycVerified: false,
    });

    const user = {
      Id: userId,
      Name: '',
      Mobile: verificationResult.mobile,
      state: 'idle' as const,
      Session: { token },
      Wallet: { address: wallet.publicKey },
      IsKycVerified: false,
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
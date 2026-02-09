import { hashPassword, generateSessionToken } from '../../../lib/auth';
import { addDocument, getDocument } from '../../../lib/firestore';

async function verifyPhoneEmailToken(token: string): Promise<{ mobile: string; email?: string } | null> {
  const phoneEmailApiKey = process.env.PHONE_EMAIL_API_KEY;
  if (!phoneEmailApiKey) {
    throw new Error('PHONE_EMAIL_API_KEY is not set');
  }

  try {
    // Verify token with phone.email API
    const response = await fetch('https://api.phone.email/v1/verify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${phoneEmailApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Phone.email API error:', response.status, errorData);
      return null;
    }

    const data = await response.json();
    
    // phone.email returns the verified phone number and optional email
    if (data.phone_number) {
      return {
        mobile: data.phone_number,
        email: data.email || undefined,
      };
    }
    
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

    const userId = await addDocument('users', {
      Name: '',
      Mobile: verificationResult.mobile,
      PasswordHash: passwordHash,
      Session: { token },
      WalletBalance: 0,
      UpiId: '',
      state: 'idle',
      IsKycVerified: false,
    });

    const user = {
      Id: userId,
      Name: '',
      Mobile: verificationResult.mobile,
      state: 'idle' as const,
      Session: { token },
      WalletBalance: 0,
      UpiId: '',
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
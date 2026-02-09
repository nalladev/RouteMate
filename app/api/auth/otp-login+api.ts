import { generateSessionToken } from '../../../lib/auth';
import { getDocument, updateDocument } from '../../../lib/firestore';
import { User } from '../../../types';

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
    const { otpToken } = body;

    if (!otpToken) {
      return Response.json(
        { error: 'OTP token is required' },
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
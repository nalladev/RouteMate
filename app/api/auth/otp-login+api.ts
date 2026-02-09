import { generateSessionToken } from '../../../lib/auth';
import { getDocument, updateDocument } from '../../../lib/firestore';
import { User } from '../../../types';

async function verifyPhoneEmailToken(token: string): Promise<{ mobile: string; email?: string } | null> {
  // TODO: Implement phone.email API verification
  // This should call phone.email API to verify the token
  // For now, returning mock data
  const phoneEmailApiKey = process.env.PHONE_EMAIL_API_KEY;
  if (!phoneEmailApiKey) {
    throw new Error('PHONE_EMAIL_API_KEY is not set');
  }

  try {
    // Mock implementation - replace with actual phone.email API call
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
      return Response.json(
        { error: 'User not found. Please sign up first.' },
        { status: 404 }
      );
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
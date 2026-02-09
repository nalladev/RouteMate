import { getAuthToken, validateSession } from '../../../lib/middleware';
import { updateDocument } from '../../../lib/firestore';

async function verifyWithDidit(kycData: any): Promise<boolean> {
  const diditApiKey = process.env.DIDIT_API_KEY;
  if (!diditApiKey) {
    throw new Error('DIDIT_API_KEY is not set');
  }

  try {
    // TODO: Implement actual Didit API verification
    // const response = await fetch('https://api.didit.com/verify', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${diditApiKey}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify(kycData),
    // });
    // const result = await response.json();
    // return result.verified;
    
    return false;
  } catch (error) {
    console.error('Didit verification error:', error);
    return false;
  }
}

export async function POST(request: Request) {
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

    const body = await request.json();
    const { kycData } = body;

    if (!kycData) {
      return Response.json(
        { error: 'KYC data is required' },
        { status: 400 }
      );
    }

    const isVerified = await verifyWithDidit(kycData);

    if (!isVerified) {
      return Response.json(
        { error: 'KYC verification failed' },
        { status: 400 }
      );
    }

    // Extract name from KYC data
    const name = kycData.name || kycData.fullName || '';

    await updateDocument('users', user.Id, {
      Name: name,
      KycData: kycData,
      IsKycVerified: true,
    });

    return Response.json({
      success: true,
      verified: true,
    });
  } catch (error) {
    console.error('KYC verification error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
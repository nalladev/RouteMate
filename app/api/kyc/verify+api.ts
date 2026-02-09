import { getAuthToken, validateSession } from '../../../lib/middleware';
import { updateDocument } from '../../../lib/firestore';

async function verifySessionWithDidit(sessionId: string): Promise<{ verified: boolean; data?: any }> {
  const diditApiKey = process.env.DIDIT_API_KEY;
  if (!diditApiKey) {
    throw new Error('DIDIT_API_KEY is not set');
  }

  try {
    // Get session details from Didit API
    const response = await fetch(`https://verification.didit.me/v3/session/${sessionId}`, {
      method: 'GET',
      headers: {
        'x-api-key': diditApiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Didit API error:', response.status, errorData);
      return { verified: false };
    }

    const result = await response.json();
    
    // Check if session is approved
    const isApproved = result.status === 'Approved' || result.status === 'approved';
    
    return {
      verified: isApproved,
      data: result,
    };
  } catch (error) {
    console.error('Didit verification error:', error);
    return { verified: false };
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
    const { sessionId, status } = body;

    if (!sessionId) {
      return Response.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Verify the session with Didit
    const verificationResult = await verifySessionWithDidit(sessionId);

    if (!verificationResult.verified) {
      return Response.json(
        { error: 'KYC verification failed or session not approved' },
        { status: 400 }
      );
    }

    // Extract user data from verification result
    const kycData = verificationResult.data;
    const name = kycData?.user_data?.name || kycData?.full_name || '';

    await updateDocument('users', user.Id, {
      Name: name,
      KycData: {
        sessionId,
        status,
        verifiedAt: new Date().toISOString(),
        diditData: kycData,
      },
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
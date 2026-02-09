import { getAuthToken, validateSession } from '../../../lib/middleware';
import { updateDocument } from '../../../lib/firestore';

async function verifyWithDidit(kycData: any): Promise<boolean> {
  const diditApiKey = process.env.DIDIT_API_KEY;
  if (!diditApiKey) {
    throw new Error('DIDIT_API_KEY is not set');
  }

  try {
    // Call Didit API for KYC verification
    const response = await fetch('https://api.didit.me/v1/kyc/verify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${diditApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: kycData.userId,
        full_name: kycData.fullName || kycData.name,
        date_of_birth: kycData.dateOfBirth,
        nationality: kycData.nationality,
        document_type: kycData.documentType, // passport, drivers_license, national_id
        document_number: kycData.documentNumber,
        document_front: kycData.documentFront, // base64 image
        document_back: kycData.documentBack, // base64 image (if applicable)
        selfie: kycData.selfie, // base64 image
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Didit API error:', response.status, errorData);
      return false;
    }

    const result = await response.json();
    
    // Didit returns verification status and confidence score
    return result.verified === true && (result.confidence_score || 0) >= 0.8;
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
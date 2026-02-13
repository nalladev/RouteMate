import { getAuthToken, validateSession } from '../../../lib/middleware';
import { updateDocument } from '../../../lib/firestore';
import { extractKycProfile, isApprovedKycStatus, normalizeDiditStatus } from '../../../lib/kyc';

async function fetchDiditSession(sessionId: string): Promise<any> {
  const diditApiKey = process.env.DIDIT_API_KEY;
  if (!diditApiKey) {
    throw new Error('DIDIT_API_KEY is not set');
  }

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
    throw new Error('Failed to fetch verification status');
  }

  return response.json();
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

    const body = await request.json().catch(() => ({}));
    const sessionId = body?.sessionId || user.KycData?.sessionId;

    if (!sessionId) {
      return Response.json(
        { error: 'No KYC session found for user' },
        { status: 400 }
      );
    }

    const diditSession = await fetchDiditSession(sessionId);
    const normalizedStatus = normalizeDiditStatus(diditSession?.status);
    const now = new Date().toISOString();
    const verified = isApprovedKycStatus(normalizedStatus);
    const extractedProfile = extractKycProfile(diditSession);

    const updateData: any = {
      IsKycVerified: verified,
      KycStatus: normalizedStatus,
      KycData: {
        ...(user.KycData || {}),
        sessionId,
        status: normalizedStatus,
        updatedAt: now,
      },
    };

    if (normalizedStatus === 'submitted' || normalizedStatus === 'under_review') {
      updateData.KycData.submittedAt = user.KycData?.submittedAt || now;
    }

    if (normalizedStatus === 'approved' || normalizedStatus === 'rejected') {
      updateData.KycData.reviewedAt = now;
    }

    if (verified) {
      updateData.KycData.verifiedAt = now;
      updateData.KycData.age = extractedProfile.age;
      updateData.KycData.gender = extractedProfile.gender;
      updateData.KycData.portraitImage = extractedProfile.portraitImage;
      updateData.KycData.address = extractedProfile.address;
      if (extractedProfile.name) {
        updateData.Name = extractedProfile.name;
      }
    }

    await updateDocument('users', user.Id, updateData);

    return Response.json({
      success: true,
      verified,
      status: normalizedStatus,
    });
  } catch (error) {
    console.error('KYC verification error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

import { getAuthToken, validateSession } from '../../middleware';
import { updateDocument } from '../../firestore';

export async function handleCreateSession(request: Request) {
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

  const diditApiKey = process.env.DIDIT_API_KEY;
  const workflowId = process.env.DIDIT_WORKFLOW_ID;
  const callbackUrl = process.env.DIDIT_CALLBACK_URL || 'https://routemate.app/kyc-callback';

  if (!diditApiKey || !workflowId) {
    console.error('Didit configuration missing');
    return Response.json(
      { error: 'KYC service configuration error' },
      { status: 500 }
    );
  }

  // Create verification session with Didit
  const response = await fetch('https://verification.didit.me/v3/session/', {
    method: 'POST',
    headers: {
      'x-api-key': diditApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      workflow_id: workflowId,
      vendor_data: user.Id,
      callback: callbackUrl,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Didit session creation error:', response.status, errorData);
    return Response.json(
      { error: 'Failed to create verification session' },
      { status: 500 }
    );
  }

  const data = await response.json();
  const now = new Date().toISOString();

  await updateDocument('users', user.Id, {
    IsKycVerified: false,
    KycStatus: 'session_created',
    KycData: {
      ...(user.KycData || {}),
      sessionId: data.session_id,
      status: 'session_created',
      createdAt: now,
      updatedAt: now,
    },
  });

  return Response.json({
    sessionId: data.session_id,
    verificationUrl: data.url,
  });
}
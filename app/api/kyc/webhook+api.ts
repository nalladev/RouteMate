import crypto from 'crypto';
import { getDocument, getDocumentById, updateDocument } from '../../../lib/firestore';
import { extractKycProfile, isApprovedKycStatus, normalizeDiditStatus } from '../../../lib/kyc';

function safeCompare(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function verifyDiditWebhookSignature(rawBody: string, headers: Headers): boolean {
  const webhookSecret = process.env.DIDIT_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return true;
  }

  const providedSignature =
    headers.get('x-didit-signature') ||
    headers.get('x-signature') ||
    headers.get('signature') ||
    '';
  const timestamp = headers.get('x-didit-timestamp') || headers.get('x-timestamp');

  if (!providedSignature) {
    return false;
  }

  const payloadVariants = [rawBody];
  if (timestamp) {
    payloadVariants.push(`${timestamp}.${rawBody}`);
  }

  for (const payload of payloadVariants) {
    const hmac = crypto.createHmac('sha256', webhookSecret).update(payload);
    const expectedHex = hmac.digest('hex');
    const expectedBase64 = crypto.createHmac('sha256', webhookSecret).update(payload).digest('base64');

    if (safeCompare(providedSignature, expectedHex) || safeCompare(providedSignature, expectedBase64)) {
      return true;
    }
  }

  return false;
}

function extractSessionId(payload: any): string | null {
  return (
    payload?.session_id ||
    payload?.sessionId ||
    payload?.verification_session_id ||
    payload?.verificationSessionId ||
    payload?.data?.session_id ||
    payload?.data?.sessionId ||
    payload?.session?.id ||
    null
  );
}

function extractVendorData(payload: any): string | null {
  return (
    payload?.vendor_data ||
    payload?.vendorData ||
    payload?.data?.vendor_data ||
    payload?.data?.vendorData ||
    payload?.session?.vendor_data ||
    null
  );
}

function extractRawStatus(payload: any): string | null {
  return (
    payload?.status ||
    payload?.verification_status ||
    payload?.verificationStatus ||
    payload?.data?.status ||
    payload?.session?.status ||
    null
  );
}

async function fetchDiditSession(sessionId: string): Promise<any | null> {
  const diditApiKey = process.env.DIDIT_API_KEY;
  if (!diditApiKey) return null;

  const response = await fetch(`https://verification.didit.me/v3/session/${sessionId}`, {
    method: 'GET',
    headers: {
      'x-api-key': diditApiKey,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    if (!verifyDiditWebhookSignature(rawBody, request.headers)) {
      return Response.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    const payload = JSON.parse(rawBody || '{}');
    const sessionId = extractSessionId(payload);
    const vendorData = extractVendorData(payload);
    const normalizedStatus = normalizeDiditStatus(extractRawStatus(payload));
    const now = new Date().toISOString();

    let user: any = null;

    if (sessionId) {
      const usersBySession = await getDocument('users', { 'KycData.sessionId': sessionId });
      if (usersBySession.length > 0) {
        user = usersBySession[0];
      }
    }

    if (!user && vendorData) {
      user = await getDocumentById('users', vendorData);
    }

    if (!user) {
      console.warn('Didit webhook user not found', { sessionId, vendorData });
      return Response.json({ received: true });
    }

    const effectiveSessionId = sessionId || user.KycData?.sessionId;
    const diditSession = effectiveSessionId ? await fetchDiditSession(effectiveSessionId) : null;
    const extractedProfile = extractKycProfile(diditSession || payload);
    const isVerified = isApprovedKycStatus(normalizedStatus);
    const kycData: any = {
      ...(user.KycData || {}),
      status: normalizedStatus,
      updatedAt: now,
    };

    if (effectiveSessionId) {
      kycData.sessionId = effectiveSessionId;
    }

    const updateData: any = {
      IsKycVerified: isVerified,
      KycStatus: normalizedStatus,
      KycData: kycData,
    };

    if (normalizedStatus === 'submitted' || normalizedStatus === 'under_review') {
      updateData.KycData.submittedAt = user.KycData?.submittedAt || now;
    }

    if (normalizedStatus === 'approved' || normalizedStatus === 'rejected') {
      updateData.KycData.reviewedAt = now;
    }

    if (isVerified) {
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

    return Response.json({ received: true });
  } catch (error) {
    console.error('Didit webhook processing error:', error);
    return Response.json(
      { error: 'Invalid webhook payload' },
      { status: 400 }
    );
  }
}

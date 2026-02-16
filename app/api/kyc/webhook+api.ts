import crypto from 'crypto';
import { getDocument, getDocumentById, updateDocument } from '../../../lib/firestore';
import { extractKycProfile, isApprovedKycStatus, normalizeDiditStatus } from '../../../lib/kyc';
import { sendKycApprovalNotification, sendKycRejectionNotification } from '../../../lib/notifications';

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
    
    // Ignore data.updated events, only process status.updated
    if (payload.webhook_type === 'data.updated') {
      return Response.json({ received: true, ignored: 'data.updated event' });
    }

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
    const isVerified = isApprovedKycStatus(normalizedStatus);
    
    // Only extract profile data if status is approved and decision field exists
    let extractedProfile = null;
    if (isVerified && payload.decision) {
      extractedProfile = extractKycProfile(payload);
    }
    
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

    if (extractedProfile) {
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

    // Send push notification for KYC approval or rejection
    if (normalizedStatus === 'approved') {
      await sendKycApprovalNotification(user.Id);
    } else if (normalizedStatus === 'rejected') {
      await sendKycRejectionNotification(user.Id);
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Didit webhook processing error:', error);
    return Response.json(
      { error: 'Invalid webhook payload' },
      { status: 400 }
    );
  }
}

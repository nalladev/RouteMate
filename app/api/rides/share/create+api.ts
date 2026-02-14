import crypto from 'crypto';
import { getAuthToken, validateSession } from '../../../../lib/middleware';
import { getDocumentById, updateDocument } from '../../../../lib/firestore';
import { RideConnection } from '../../../../types';

function sanitizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

function resolveBaseUrl(request: Request): string {
  const configured = process.env.EXPO_PUBLIC_APP_URL;
  if (configured) {
    return sanitizeBaseUrl(configured);
  }

  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');
  if (forwardedHost && forwardedProto) {
    return sanitizeBaseUrl(`${forwardedProto}://${forwardedHost}`);
  }

  return sanitizeBaseUrl(new URL(request.url).origin);
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
    const connectionId = body?.connectionId as string | undefined;

    if (!connectionId) {
      return Response.json(
        { error: 'connectionId is required' },
        { status: 400 }
      );
    }

    const connection = await getDocumentById('rideconnections', connectionId) as RideConnection | null;
    if (!connection) {
      return Response.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    const isParticipant = connection.DriverId === user.Id || connection.PassengerId === user.Id;
    if (!isParticipant) {
      return Response.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    if (connection.State === 'rejected') {
      return Response.json(
        { error: 'Cannot share a rejected ride' },
        { status: 400 }
      );
    }

    const shareToken = connection.ShareToken || crypto.randomBytes(16).toString('hex');
    if (!connection.ShareToken) {
      await updateDocument('rideconnections', connectionId, {
        ShareToken: shareToken,
        ShareCreatedAt: new Date(),
      });
    }

    const shareUrl = `${resolveBaseUrl(request)}/ride-share/${shareToken}`;

    return Response.json({
      success: true,
      shareToken,
      shareUrl,
    });
  } catch (error) {
    console.error('Create ride share link error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

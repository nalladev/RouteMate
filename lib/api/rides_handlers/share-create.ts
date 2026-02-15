import Constants from "expo-constants";
import { getAuthToken, validateSession } from '../../middleware';
import { getDocumentById, updateDocument } from '../../firestore';
import { RideConnection } from '../../../types';

// Use crypto only on server (Node.js environment)
async function generateRandomToken(): Promise<string> {
  if (typeof window === 'undefined') {
    // Server-side (Node.js)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require('crypto');
    return crypto.randomBytes(16).toString('hex');
  }
  // This should never be called on client, but provide fallback
  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

function sanitizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

function resolveBaseUrl(request: Request): string {
  // Check if we should use production URL
  const isProduction = process.env.NODE_ENV === 'production' || !!process.env.EXPO_PUBLIC_USE_PRODUCTION;
  const productionUrl = Constants.expoConfig?.extra?.productionAppUrl || 'https://www.routemate.tech';
  
  if (isProduction) {
    return sanitizeBaseUrl(productionUrl);
  }

  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');
  if (forwardedHost && forwardedProto) {
    return sanitizeBaseUrl(`${forwardedProto}://${forwardedHost}`);
  }

  return sanitizeBaseUrl(new URL(request.url).origin);
}

export async function handleShareCreate(request: Request) {
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

  const shareToken = connection.ShareToken || await generateRandomToken();
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
}
export default function Handler() { return null; }

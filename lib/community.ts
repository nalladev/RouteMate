import crypto from 'crypto';
import Constants from "expo-constants";
import { initializeFirestore } from './firestore';
import { COMMUNITY_INVITE_PRESET_HOURS, type CommunityInvitePresetHours } from '../constants/community';

export interface CommunityRecord {
  Id: string;
  Name: string;
  AdminId: string;
  MemberIds: string[];
  CreatedAt?: any;
}

export interface CommunityInviteRecord {
  Id: string;
  CommunityId: string;
  CreatedBy: string;
  Token: string;
  ExpiresAt: any;
  IsRevoked?: boolean;
  CreatedAt?: any;
}

function sanitizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

export function resolvePublicAppUrl(request: Request): string {
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

export function buildCommunityInviteUrl(request: Request, token: string): string {
  return `${resolvePublicAppUrl(request)}/community/join/${token}`;
}

export function isInvitePresetHours(value: number): value is CommunityInvitePresetHours {
  return COMMUNITY_INVITE_PRESET_HOURS.includes(value as CommunityInvitePresetHours);
}

export function generateInviteToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

export async function getCommunityById(communityId: string): Promise<CommunityRecord | null> {
  const db = initializeFirestore();
  const doc = await db.collection('communities').doc(communityId).get();
  if (!doc.exists) {
    return null;
  }

  return {
    Id: doc.id,
    ...(doc.data() || {}),
  } as CommunityRecord;
}

export async function getCommunitiesForUser(userId: string): Promise<CommunityRecord[]> {

  const db = initializeFirestore();

  const snapshot = await db
    .collection('communities')
    .where('MemberIds', 'array-contains', userId)
    .get();


  const results = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      Id: doc.id,
      ...(data || {}),
    } as CommunityRecord;
  });

  return results;
}

export async function getCommunityInviteByToken(token: string): Promise<CommunityInviteRecord | null> {
  const db = initializeFirestore();
  const snapshot = await db
    .collection('communityinvites')
    .where('Token', '==', token)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const inviteDoc = snapshot.docs[0];
  return {
    Id: inviteDoc.id,
    ...(inviteDoc.data() || {}),
  } as CommunityInviteRecord;
}

export async function getCommunityMemberSet(communityId: string): Promise<Set<string> | null> {
  const community = await getCommunityById(communityId);
  if (!community) {
    return null;
  }

  return new Set(community.MemberIds || []);
}

export async function areUsersInCommunity(communityId: string, userIds: string[]): Promise<boolean> {
  const memberSet = await getCommunityMemberSet(communityId);
  if (!memberSet) {
    return false;
  }

  return userIds.every((userId) => memberSet.has(userId));
}

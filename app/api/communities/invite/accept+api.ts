import * as admin from 'firebase-admin';
import { getAuthToken, validateSession } from '../../../../lib/middleware';
import { getCommunityById, getCommunityInviteByToken } from '../../../../lib/community';
import { initializeFirestore } from '../../../../lib/firestore';

export async function POST(request: Request) {
  try {
    const token = getAuthToken(request);

    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateSession(token);
    if (!user) {
      return Response.json({ error: 'Invalid session' }, { status: 401 });
    }

    const body = await request.json();
    const inviteToken = typeof body?.token === 'string' ? body.token.trim() : '';

    if (!inviteToken) {
      return Response.json({ error: 'token is required' }, { status: 400 });
    }

    const invite = await getCommunityInviteByToken(inviteToken);
    if (!invite) {
      return Response.json({ error: 'Invite link not found' }, { status: 404 });
    }

    if (invite.IsRevoked) {
      return Response.json({ error: 'Invite link has been revoked' }, { status: 400 });
    }

    const expiresAt = invite.ExpiresAt?.toDate ? invite.ExpiresAt.toDate() : new Date(invite.ExpiresAt);
    if (!invite.ExpiresAt || expiresAt < new Date()) {
      return Response.json({ error: 'Invite link has expired' }, { status: 400 });
    }

    const community = await getCommunityById(invite.CommunityId);
    if (!community) {
      return Response.json({ error: 'Community not found' }, { status: 404 });
    }

    const alreadyMember = Array.isArray(community.MemberIds) && community.MemberIds.includes(user.Id);
    const db = initializeFirestore();

    await db.runTransaction(async (transaction) => {
      const communityRef = db.collection('communities').doc(community.Id);
      const userRef = db.collection('users').doc(user.Id);

      if (!alreadyMember) {
        transaction.update(communityRef, {
          MemberIds: admin.firestore.FieldValue.arrayUnion(user.Id),
        });
      }

      transaction.update(userRef, {
        ActiveCommunityId: community.Id,
      });
    });

    return Response.json({
      success: true,
      alreadyMember,
      community: {
        Id: community.Id,
        Name: community.Name || 'Community',
        AdminId: community.AdminId,
      },
      activeCommunityId: community.Id,
    });
  } catch (error) {
    console.error('Accept community invite error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

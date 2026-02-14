import * as admin from 'firebase-admin';
import { getAuthToken, validateSession } from '../../middleware';
import { getCommunityById } from '../../community';
import { initializeFirestore } from '../../firestore';

export async function handleMembersRemove(request: Request, communityId: string) {
  const token = getAuthToken(request);

  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await validateSession(token);
  if (!user) {
    return Response.json({ error: 'Invalid session' }, { status: 401 });
  }

  const community = await getCommunityById(communityId);
  if (!community) {
    return Response.json({ error: 'Community not found' }, { status: 404 });
  }

  if (community.AdminId !== user.Id) {
    return Response.json({ error: 'Only community admin can remove members' }, { status: 403 });
  }

  const body = await request.json();
  const memberId = typeof body?.memberId === 'string' ? body.memberId : '';

  if (!memberId) {
    return Response.json({ error: 'memberId is required' }, { status: 400 });
  }

  if (memberId === community.AdminId) {
    return Response.json({ error: 'Community admin cannot be removed' }, { status: 400 });
  }

  if (!Array.isArray(community.MemberIds) || !community.MemberIds.includes(memberId)) {
    return Response.json({ error: 'Member not found in this community' }, { status: 404 });
  }

  const db = initializeFirestore();
  await db.runTransaction(async (transaction: admin.firestore.Transaction) => {
    const communityRef = db.collection('communities').doc(communityId);
    const memberRef = db.collection('users').doc(memberId);

    transaction.update(communityRef, {
      MemberIds: admin.firestore.FieldValue.arrayRemove(memberId),
    });

    const memberDoc = await transaction.get(memberRef);
    if (memberDoc.exists) {
      const memberData = memberDoc.data() || {};
      if (memberData.ActiveCommunityId === communityId) {
        transaction.update(memberRef, {
          ActiveCommunityId: null,
        });
      }
    }
  });

  return Response.json({ success: true });
}
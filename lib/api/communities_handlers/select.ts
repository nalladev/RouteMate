import { getAuthToken, validateSession } from '../../middleware';
import { getCommunityById } from '../../community';
import { updateDocument } from '../../firestore';

export async function handleSelect(request: Request) {
  const token = getAuthToken(request);

  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await validateSession(token);
  if (!user) {
    return Response.json({ error: 'Invalid session' }, { status: 401 });
  }

  const body = await request.json();
  const communityId = typeof body?.communityId === 'string' ? body.communityId : null;

  if (!communityId) {
    await updateDocument('users', user.Id, {
      ActiveCommunityId: null,
    });

    return Response.json({
      success: true,
      activeCommunityId: null,
    });
  }

  const community = await getCommunityById(communityId);
  if (!community) {
    return Response.json({ error: 'Community not found' }, { status: 404 });
  }

  const isMember = Array.isArray(community.MemberIds) && community.MemberIds.includes(user.Id);
  if (!isMember) {
    return Response.json(
      { error: 'You are not a member of this community' },
      { status: 403 }
    );
  }

  await updateDocument('users', user.Id, {
    ActiveCommunityId: communityId,
  });

  return Response.json({
    success: true,
    activeCommunityId: communityId,
  });
}
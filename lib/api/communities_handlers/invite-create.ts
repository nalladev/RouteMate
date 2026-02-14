import { getAuthToken, validateSession } from '../../middleware';
import { getCommunityById, generateInviteToken, buildCommunityInviteUrl, isInvitePresetHours } from '../../community';
import { addDocument } from '../../firestore';

export async function handleInviteCreate(request: Request) {
  const token = getAuthToken(request);

  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await validateSession(token);
  if (!user) {
    return Response.json({ error: 'Invalid session' }, { status: 401 });
  }

  const body = await request.json();
  const communityId = typeof body?.communityId === 'string' ? body.communityId : '';
  const expiresInHours = Number(body?.expiresInHours);

  if (!communityId) {
    return Response.json({ error: 'communityId is required' }, { status: 400 });
  }

  if (!isInvitePresetHours(expiresInHours)) {
    return Response.json(
      { error: 'Invalid expiresInHours. Use one of: 1, 6, 24, 72, 168' },
      { status: 400 }
    );
  }

  const community = await getCommunityById(communityId);
  if (!community) {
    return Response.json({ error: 'Community not found' }, { status: 404 });
  }

  if (community.AdminId !== user.Id) {
    return Response.json(
      { error: 'Only community admin can create invite links' },
      { status: 403 }
    );
  }

  const tokenValue = generateInviteToken();
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  await addDocument('communityinvites', {
    CommunityId: communityId,
    CreatedBy: user.Id,
    Token: tokenValue,
    ExpiresAt: expiresAt,
    IsRevoked: false,
    CreatedAt: new Date(),
  });

  return Response.json({
    communityId,
    expiresInHours,
    expiresAt: expiresAt.toISOString(),
    inviteToken: tokenValue,
    inviteUrl: buildCommunityInviteUrl(request, tokenValue),
  });
}
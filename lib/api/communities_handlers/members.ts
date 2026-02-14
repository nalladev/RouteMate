import { getAuthToken, validateSession } from '../../middleware';
import { getCommunityById } from '../../community';
import { getDocumentById } from '../../firestore';
import { CommunityMember } from '../../../types';

export async function handleMembers(request: Request, communityId: string) {
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
    return Response.json({ error: 'Only community admin can view members' }, { status: 403 });
  }

  const memberIds = Array.isArray(community.MemberIds) ? community.MemberIds : [];
  const users = await Promise.all(
    memberIds.map((memberId: string) => getDocumentById('users', memberId))
  );

  const members: CommunityMember[] = users
    .filter(Boolean)
    .map((member: any) => ({
      Id: member.Id,
      Name: member.Name || '',
      Mobile: member.Mobile || '',
      isAdmin: member.Id === community.AdminId,
    }))
    .sort((a: CommunityMember, b: CommunityMember) => {
      if (a.isAdmin) return -1;
      if (b.isAdmin) return 1;
      return (a.Name || '').localeCompare(b.Name || '');
    });

  return Response.json({
    community: {
      Id: community.Id,
      Name: community.Name || 'Community',
      AdminId: community.AdminId,
    },
    members,
  });
}
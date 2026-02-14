import { getAuthToken, validateSession } from '../../lib/middleware';
import { getCommunitiesForUser } from '../../lib/community';

export async function GET(request: Request) {
  try {
    const token = getAuthToken(request);

    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateSession(token);
    if (!user) {
      return Response.json({ error: 'Invalid session' }, { status: 401 });
    }

    const communities = await getCommunitiesForUser(user.Id);
    const response = communities
      .sort((a, b) => {
        const aMs = a.CreatedAt?.toDate ? a.CreatedAt.toDate().getTime() : 0;
        const bMs = b.CreatedAt?.toDate ? b.CreatedAt.toDate().getTime() : 0;
        return bMs - aMs;
      })
      .map((community) => ({
        Id: community.Id,
        Name: community.Name || 'Community',
        AdminId: community.AdminId,
        participantCount: Array.isArray(community.MemberIds) ? community.MemberIds.length : 0,
        isAdmin: community.AdminId === user.Id,
        isActive: !!user.ActiveCommunityId && user.ActiveCommunityId === community.Id,
        CreatedAt: community.CreatedAt || null,
      }));

    return Response.json({
      communities: response,
      activeCommunityId: user.ActiveCommunityId || null,
    });
  } catch (error) {
    console.error('Get communities error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

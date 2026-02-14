import { getAuthToken, validateSession } from '../../../lib/middleware';
import { initializeFirestore } from '../../../lib/firestore';

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
    const name = typeof body?.name === 'string' ? body.name.trim() : '';

    if (!name || name.length < 3 || name.length > 64) {
      return Response.json(
        { error: 'name is required and must be between 3 and 64 characters' },
        { status: 400 }
      );
    }

    const db = initializeFirestore();
    const communityRef = db.collection('communities').doc();
    const createdAt = new Date();

    await db.runTransaction(async (transaction) => {
      transaction.set(communityRef, {
        Name: name,
        AdminId: user.Id,
        MemberIds: [user.Id],
        CreatedAt: createdAt,
      });

      transaction.update(db.collection('users').doc(user.Id), {
        ActiveCommunityId: communityRef.id,
      });
    });

    return Response.json(
      {
        community: {
          Id: communityRef.id,
          Name: name,
          AdminId: user.Id,
          participantCount: 1,
          isAdmin: true,
          isActive: true,
          CreatedAt: createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create community error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

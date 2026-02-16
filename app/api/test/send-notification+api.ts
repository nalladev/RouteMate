import { getAuthToken, validateSession } from '../../../lib/middleware';
import { sendKycApprovalNotification, sendKycRejectionNotification, sendNotificationToUser } from '../../../lib/notifications';

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
    const { type, userId, title, message } = body;

    if (!type) {
      return Response.json({ error: 'Notification type is required' }, { status: 400 });
    }

    let success = false;
    const targetUserId = userId || user.Id;

    switch (type) {
      case 'kyc_approved':
        success = await sendKycApprovalNotification(targetUserId);
        break;

      case 'kyc_rejected':
        success = await sendKycRejectionNotification(targetUserId);
        break;

      case 'custom':
        if (!title || !message) {
          return Response.json({ error: 'Title and message are required for custom notifications' }, { status: 400 });
        }
        success = await sendNotificationToUser(targetUserId, {
          title,
          body: message,
          data: {
            type: 'custom',
            userId: targetUserId,
          },
        });
        break;

      default:
        return Response.json({ error: `Unknown notification type: ${type}` }, { status: 400 });
    }

    if (success) {
      return Response.json({ success: true, message: 'Notification sent successfully' });
    } else {
      return Response.json({ success: false, message: 'Failed to send notification' }, { status: 500 });
    }
  } catch (error) {
    console.error('Test notification error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
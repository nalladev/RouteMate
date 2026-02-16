import { initializeFirestore } from './firestore';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

/**
 * Send a push notification to a user via their Expo push token
 */
export async function sendPushNotification(
  pushToken: string,
  payload: NotificationPayload
): Promise<boolean> {
  try {
    if (!pushToken || !pushToken.startsWith('ExponentPushToken[')) {
      console.warn('Invalid push token format:', pushToken);
      return false;
    }

    const message = {
      to: pushToken,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();

    if (!response.ok || result.data?.status === 'error') {
      console.error('Failed to send push notification:', result);
      return false;
    }

    console.log('Push notification sent successfully:', result);
    return true;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}

/**
 * Send a push notification to a user by their user ID
 */
export async function sendNotificationToUser(
  userId: string,
  payload: NotificationPayload
): Promise<boolean> {
  try {
    const db = initializeFirestore();
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      console.warn('User not found:', userId);
      return false;
    }

    const userData = userDoc.data();
    const pushToken = userData?.PushToken;

    if (!pushToken) {
      console.warn('User has no push token registered:', userId);
      return false;
    }

    return await sendPushNotification(pushToken, payload);
  } catch (error) {
    console.error('Error sending notification to user:', error);
    return false;
  }
}

/**
 * Send KYC approval notification
 */
export async function sendKycApprovalNotification(userId: string): Promise<boolean> {
  return await sendNotificationToUser(userId, {
    title: '✅ KYC Verified!',
    body: 'Your identity has been verified. You can now use all features of RouteMate.',
    data: {
      type: 'kyc_approved',
      userId,
    },
  });
}

/**
 * Send KYC rejection notification
 */
export async function sendKycRejectionNotification(userId: string): Promise<boolean> {
  return await sendNotificationToUser(userId, {
    title: '❌ KYC Verification Failed',
    body: 'Your KYC verification was not successful. Please try again or contact support.',
    data: {
      type: 'kyc_rejected',
      userId,
    },
  });
}
# Push Notifications Setup

This app now supports push notifications for KYC status updates (and can be extended for other features).

## Features

- **KYC Approval Notifications**: Users receive a notification when their KYC verification is approved
- **KYC Rejection Notifications**: Users receive a notification when their KYC verification is rejected
- **Background Notifications**: Notifications work even when the app is closed or in the background
- **Foreground Notifications**: Notifications are shown when the app is open
- **Notification Tap Handling**: Users can tap notifications to navigate to relevant screens

## How It Works

### Client Side

1. **Permission Request**: When a user logs in, the app automatically requests notification permissions
2. **Token Registration**: The app generates an Expo push token and sends it to the backend
3. **Token Storage**: The push token is stored in the user's Firestore document (`PushToken` field)
4. **Notification Handling**: The app listens for incoming notifications and handles taps

### Server Side

1. **Webhook Processing**: When Didit sends a KYC webhook, the server processes the status
2. **Notification Trigger**: If status is 'approved' or 'rejected', a push notification is sent
3. **Expo Push Service**: The server sends the notification via Expo's push notification service
4. **Delivery**: Expo delivers the notification to the user's device

## Files Modified/Created

### New Files
- `lib/notifications.ts` - Push notification utilities
- `hooks/usePushNotifications.ts` - React hook for notification setup
- `app/api/user/push-token+api.ts` - API endpoint to update push tokens

### Modified Files
- `types/index.ts` - Added `PushToken` field to User interface
- `app/api/kyc/webhook+api.ts` - Added notification sending on KYC status change
- `contexts/AuthContext.tsx` - Integrated push notification registration
- `utils/api.ts` - Added `updatePushToken` API method
- `app.config.js` - Added expo-notifications plugin and permissions

## Testing

### Prerequisites
- Physical device (push notifications don't work on simulators/emulators)
- Expo Go app OR development build
- Active internet connection

### Testing KYC Approval Notification

1. **Login to the app** on a physical device
2. **Complete KYC verification** through the app
3. **Wait for Didit to process** (can take a few minutes to hours)
4. When Didit sends the webhook with 'approved' status, you'll receive a notification

### Manual Testing (Backend)

You can manually test notifications by creating a test endpoint or using the notification functions directly:

```javascript
import { sendKycApprovalNotification } from './lib/notifications';

// Send test notification
await sendKycApprovalNotification('user-id-here');
```

### Verify Token Registration

Check if the push token was successfully registered:

1. Login to the app
2. Check the console logs for: `Push token registered: ExponentPushToken[...]`
3. Verify in Firestore that the user document has a `PushToken` field

## Notification Types

### Current Notifications

- **KYC Approved**: Title: "✅ KYC Verified!", Body: "Your identity has been verified..."
- **KYC Rejected**: Title: "❌ KYC Verification Failed", Body: "Your KYC verification was not successful..."

### Data Payload

Each notification includes data for handling:
```json
{
  "type": "kyc_approved" | "kyc_rejected",
  "userId": "user-id"
}
```

## Extending Notifications

To add new notification types:

1. **Add notification function** in `lib/notifications.ts`:
```typescript
export async function sendRideRequestNotification(userId: string, riderName: string) {
  return await sendNotificationToUser(userId, {
    title: '🚗 New Ride Request',
    body: `${riderName} wants to ride with you`,
    data: {
      type: 'ride_request',
      userId,
    },
  });
}
```

2. **Handle notification tap** in `hooks/usePushNotifications.ts`:
```typescript
if (data.type === 'ride_request') {
  // Navigate to ride request screen
}
```

3. **Send notification** from your backend API:
```typescript
import { sendRideRequestNotification } from './lib/notifications';

await sendRideRequestNotification(driverId, passengerName);
```

## Troubleshooting

### Notifications Not Received

1. **Check token registration**: Look for "Push token registered" in console
2. **Verify permissions**: Ensure notification permissions are granted
3. **Check device**: Must be a physical device (not simulator)
4. **Verify Firestore**: Check if `PushToken` field exists in user document
5. **Check logs**: Server logs will show if notification was sent successfully

### Token Format Issues

- Expo push tokens must start with `ExponentPushToken[`
- The backend validates this format before storing

### iOS Specific

- Requires notification permissions prompt to be accepted
- In production, requires APNs (Apple Push Notification service) to be configured

### Android Specific

- Requires `POST_NOTIFICATIONS` permission (already added)
- Uses Firebase Cloud Messaging (FCM) in production
- Notification channels are configured automatically

## Production Considerations

1. **Error Handling**: Failed notifications are logged but don't block the webhook
2. **Token Expiration**: Expo tokens can expire; the hook re-registers on each app launch
3. **Multiple Devices**: Each device gets its own token (currently only stores one per user)
4. **Rate Limiting**: Expo has rate limits for push notifications
5. **Message Queue**: For high-volume apps, consider a message queue (Redis, SQS)

## Security

- Push tokens are stored securely in Firestore
- Only authenticated users can update their push token
- Webhook signatures are verified before processing
- Push tokens are validated before storage

## Future Enhancements

- [ ] Support multiple devices per user
- [ ] Add notification preferences (allow users to opt-out of certain types)
- [ ] Add ride request notifications
- [ ] Add ride status notifications (accepted, completed, etc.)
- [ ] Add message notifications
- [ ] Add scheduled notifications (e.g., ride reminders)
- [ ] Add rich notifications with images and actions
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { api } from '../utils/api';

// Check if running in production (only enable push notifications in production)
const IS_PRODUCTION = process.env.NODE_ENV === 'production' || !!process.env.EXPO_PUBLIC_USE_PRODUCTION;

// Dynamically import notifications only in production to avoid Expo Go errors
let Notifications: any = null;
let Device: any = null;

if (IS_PRODUCTION) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Notifications = require('expo-notifications');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Device = require('expo-device');
  
  // Configure how notifications should be handled when app is in foreground
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export function usePushNotifications(userId: string | null) {
  const notificationListener = useRef<any>(undefined);
  const responseListener = useRef<any>(undefined);

  useEffect(() => {
    if (!userId) return;

    // Skip push notification setup in development
    if (!IS_PRODUCTION) {
      return;
    }

    registerForPushNotificationsAsync().then(async (token) => {
      if (token) {
        try {
          // Send token to backend
          await api.updatePushToken(token);
          console.log('Push token registered:', token);
        } catch (error) {
          console.error('Failed to register push token:', error);
        }
      }
    });

    // Handle notifications received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener((notification: any) => {
      console.log('Notification received:', notification);
    });

    // Handle notification taps
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
      console.log('Notification tapped:', response);
      const data = response.notification.request.content.data;
      
      // Handle different notification types
      if (data.type === 'kyc_approved' || data.type === 'kyc_rejected') {
        // Navigate to account screen or show relevant info
        console.log('KYC notification handled:', data.type);
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [userId]);
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    // Skip if in development
    if (!IS_PRODUCTION || !Notifications || !Device) {
      return null;
    }

    // Check if device is physical (not simulator/emulator)
    if (!Device.isDevice) {
      console.log('Push notifications only work on physical devices');
      return null;
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Permission not granted for push notifications');
      return null;
    }

    // Get push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '0163e419-a387-43bb-b94f-eb338694141c', // From app.config.js
    });

    // Configure Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return tokenData.data;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
}
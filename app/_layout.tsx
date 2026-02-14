import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import React, { useEffect, useRef } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AppStateProvider } from '@/contexts/AppStateContext';
import { PENDING_COMMUNITY_INVITE_TOKEN_KEY } from '@/constants/community';
import { api } from '@/utils/api';

export const unstable_settings = {
  anchor: '(tabs)',
};

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('=== APP CRASH ERROR ===');
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Error Stack:', error.stack);
    console.error('======================');
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
            App Crashed
          </Text>
          <Text style={{ marginBottom: 20, textAlign: 'center' }}>
            {this.state.error?.message || 'Unknown error'}
          </Text>
          <Text style={{ fontSize: 12, marginBottom: 20, textAlign: 'center', color: '#666' }}>
            {this.state.error?.stack}
          </Text>
          <Button
            title="Restart App"
            onPress={() => this.setState({ hasError: false, error: null })}
          />
        </View>
      );
    }

    return this.props.children;
  }
}

function RootLayoutNav() {
  const { isAuthenticated, isLoading, shouldShowKycPrompt, refreshUser } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const hasProcessedPendingInviteRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      hasProcessedPendingInviteRef.current = false;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(tabs)';
    const inKycPage = segments[0] === 'kyc-verification';
    const inRideSharePage = segments[0] === 'ride-share';
    const inCommunityJoinPage = segments[0] === 'community';

    if (!isAuthenticated && inAuthGroup) {
      // Redirect to login if not authenticated and in protected route
      router.replace('/login');
    } else if (isAuthenticated && !inAuthGroup && !inKycPage && !inRideSharePage && !inCommunityJoinPage) {
      // Check if we should show KYC prompt after login/signup
      if (shouldShowKycPrompt) {
        router.replace('/kyc-verification');
      } else {
        // Redirect to tabs if authenticated and not in protected route
        router.replace('/(tabs)');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Note: segments is intentionally excluded from dependencies to prevent infinite loop
    // We only want to redirect when auth state changes, not on every navigation
  }, [isAuthenticated, isLoading, shouldShowKycPrompt, router]);

  useEffect(() => {
    if (!isAuthenticated || isLoading || hasProcessedPendingInviteRef.current) {
      return;
    }

    async function processPendingCommunityInvite() {
      const pendingToken = await AsyncStorage.getItem(PENDING_COMMUNITY_INVITE_TOKEN_KEY);
      if (!pendingToken) {
        hasProcessedPendingInviteRef.current = true;
        return;
      }

      try {
        await api.acceptCommunityInvite(pendingToken);
        await refreshUser();
        Alert.alert('Community Joined', 'Invite accepted successfully.');
        router.replace('/(tabs)/communities');
      } catch (error) {
        console.error('Failed to process pending community invite:', error);
      } finally {
        await AsyncStorage.removeItem(PENDING_COMMUNITY_INVITE_TOKEN_KEY);
        hasProcessedPendingInviteRef.current = true;
      }
    }

    processPendingCommunityInvite();
  }, [isAuthenticated, isLoading, refreshUser, router]);

  return (
    <Stack>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="kyc-verification" options={{ headerShown: false }} />
      <Stack.Screen name="community/join/[token]" options={{ headerShown: false }} />
      <Stack.Screen name="ride-share/[token]" options={{ title: 'Live Ride Tracking' }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  console.log('=== RootLayout Rendering ===');

  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppStateProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <RootLayoutNav />
            <StatusBar style="auto" />
          </ThemeProvider>
        </AppStateProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

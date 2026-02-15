import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import React, { useEffect, useRef } from 'react';
import { View, Text, Button, Alert, Platform, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AppStateProvider } from '@/contexts/AppStateContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { PENDING_COMMUNITY_INVITE_TOKEN_KEY } from '@/constants/community';
import { api } from '@/utils/api';

SplashScreen.preventAutoHideAsync();

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
          <Text style={{ fontSize: 18, fontFamily: 'Inter-Bold', marginBottom: 10 }}>
            App Crashed
          </Text>
          <Text style={{ marginBottom: 20, textAlign: 'center', fontFamily: 'Inter-Regular' }}>
            {this.state.error?.message || 'Unknown error'}
          </Text>
          <Text style={{ fontSize: 12, marginBottom: 20, textAlign: 'center', color: '#666', fontFamily: 'Inter-Regular' }}>
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

function isAllowedWebRoute(segments: string[]) {
  if (segments[0] === 'ride-share') return true;
  return segments[0] === 'community' && segments[1] === 'join';
}

function WebAppOnlyScreen() {
  function handleDownloadApp() {
    const downloadUrl = 'https://github.com/nalladev/RouteMate/releases';
    if (Platform.OS === 'web') {
      window.open(downloadUrl, '_blank');
    } else {
      Linking.openURL(downloadUrl);
    }
  }

  return (
    <View style={styles.webOnlyContainer}>
      <View style={styles.webOnlyContent}>
        <Text style={styles.webOnlyTitle}>RouteMate App Required</Text>
        <Text style={styles.webOnlyText}>
          This page is only available in the RouteMate mobile app.
        </Text>
        <Text style={styles.webOnlyText}>
          Web access is supported only for live ride sharing and community invite links.
        </Text>
        <TouchableOpacity 
          style={styles.downloadButton} 
          onPress={handleDownloadApp}
        >
          <Text style={styles.downloadButtonText}>Download RouteMate APK</Text>
        </TouchableOpacity>
        <Text style={styles.webOnlyTextSmall}>
          Install the app to access all features
        </Text>
      </View>
    </View>
  );
}

function RootLayoutNav() {
  const { isAuthenticated, isLoading, shouldShowKycPrompt, refreshUser } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const hasProcessedPendingInviteRef = useRef(false);
  const allowedWebRoute = isAllowedWebRoute(segments);

  useEffect(() => {
    if (!isAuthenticated) {
      hasProcessedPendingInviteRef.current = false;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isLoading) return;
    if (Platform.OS === 'web' && !allowedWebRoute) return;

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
  }, [segments, isAuthenticated, isLoading, shouldShowKycPrompt, router, allowedWebRoute]);

  useEffect(() => {
    if (Platform.OS === 'web' && !allowedWebRoute) {
      return;
    }
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
  }, [isAuthenticated, isLoading, refreshUser, router, allowedWebRoute]);

  if (Platform.OS === 'web' && !allowedWebRoute) {
    return <WebAppOnlyScreen />;
  }

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

function ThemedApp() {
  const { isDarkMode } = useTheme();

  return (
    <NavigationThemeProvider value={isDarkMode ? DarkTheme : DefaultTheme}>
      <RootLayoutNav />
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'Inter-Black': require('../assets/fonts/Inter-Black.ttf'),
    'Inter-BlackItalic': require('../assets/fonts/Inter-BlackItalic.ttf'),
    'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),
    'Inter-BoldItalic': require('../assets/fonts/Inter-BoldItalic.ttf'),
    'Inter-ExtraBold': require('../assets/fonts/Inter-ExtraBold.ttf'),
    'Inter-ExtraBoldItalic': require('../assets/fonts/Inter-ExtraBoldItalic.ttf'),
    'Inter-ExtraLightItalic': require('../assets/fonts/Inter-ExtraLightItalic.ttf'),
    'Inter-Italic': require('../assets/fonts/Inter-Italic.ttf'),
    'Inter-Light': require('../assets/fonts/Inter-Light.ttf'),
    'Inter-LightItalic': require('../assets/fonts/Inter-LightItalic.ttf'),
    'Inter-Medium': require('../assets/fonts/Inter-Medium.ttf'),
    'Inter-MediumItalic': require('../assets/fonts/Inter-MediumItalic.ttf'),
    'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
    'Inter-SemiBoldItalic': require('../assets/fonts/Inter-SemiBoldItalic.ttf'),
    'Inter-ThinItalic': require('../assets/fonts/Inter-ThinItalic.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <AppStateProvider>
            <ThemedApp />
          </AppStateProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  webOnlyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#f8fafc',
  },
  webOnlyContent: {
    maxWidth: 600,
    width: '100%',
    alignItems: 'center',
    gap: 14,
  },
  webOnlyTitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 10,
  },
  webOnlyText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 24,
  },
  webOnlyTextSmall: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  downloadButton: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
    minWidth: 200,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});

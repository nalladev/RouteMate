import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PENDING_COMMUNITY_INVITE_TOKEN_KEY } from '@/constants/community';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/utils/api';

export default function CommunityInviteJoinScreen() {
  const { isDarkMode } = useTheme();
  const colors = Colors[isDarkMode ? 'dark' : 'light'];
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === 'string' ? params.token : '';
  const { isAuthenticated, isLoading, refreshUser } = useAuth();
  const [isJoining, setIsJoining] = useState(false);
  const [appInstalled, setAppInstalled] = useState<boolean | null>(null);

  const checkAppInstalled = React.useCallback(async () => {
    if (!token) return;
    const deepLink = `routemate://community/join/${encodeURIComponent(token)}`;
    try {
      const supported = await Linking.canOpenURL(deepLink);
      if (supported) {
        setAppInstalled(true);
        // Auto-open if app is installed
        await Linking.openURL(deepLink);
      } else {
        setAppInstalled(false);
      }
    } catch {
      setAppInstalled(false);
    }
  }, [token]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      checkAppInstalled();
      return;
    }

    if (!token) {
      return;
    }

    async function handleJoin() {
      if (isLoading) {
        return;
      }

      if (!isAuthenticated) {
        await AsyncStorage.setItem(PENDING_COMMUNITY_INVITE_TOKEN_KEY, token);
        router.replace('/login');
        return;
      }

      try {
        setIsJoining(true);
        await api.acceptCommunityInvite(token);
        await AsyncStorage.removeItem(PENDING_COMMUNITY_INVITE_TOKEN_KEY);
        await refreshUser();
        Alert.alert('Joined', 'You are now part of this community.');
        router.replace('/(tabs)/communities');
      } catch (error: any) {
        Alert.alert('Invite Error', error?.message || 'Failed to join this community');
        router.replace('/(tabs)/communities');
      } finally {
        setIsJoining(false);
      }
    }

    handleJoin();
  }, [isAuthenticated, isLoading, token, refreshUser, router, checkAppInstalled]);

  async function handleOpenInApp() {
    if (!token) return;
    const deepLink = `routemate://community/join/${encodeURIComponent(token)}`;
    try {
      await Linking.openURL(deepLink);
    } catch {
      // If opening fails, show download link
      setAppInstalled(false);
    }
  }

  function handleDownloadApp() {
    const downloadUrl = 'https://github.com/nalladev/RouteMate/releases';
    if (Platform.OS === 'web') {
      window.open(downloadUrl, '_blank');
    } else {
      Linking.openURL(downloadUrl);
    }
  }

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
        <View style={styles.webContent}>
          <Text style={[styles.webTitle, { color: colors.text }]}>Community Invite</Text>
          <Text style={[styles.text, { color: colors.textSecondary }]}>
            To join this community, open this link in the RouteMate mobile app.
          </Text>
          
          {appInstalled === null && (
            <ActivityIndicator size="large" color={colors.tint} style={styles.loader} />
          )}
          
          {appInstalled === true && (
            <>
              <Text style={[styles.text, { color: colors.textSecondary }]}>
                Opening in RouteMate app...
              </Text>
              <TouchableOpacity 
                style={[styles.openAppButton, { backgroundColor: colors.tint }]} 
                onPress={handleOpenInApp}
              >
                <Text style={styles.openAppButtonText}>Open in RouteMate App</Text>
              </TouchableOpacity>
            </>
          )}
          
          {appInstalled === false && (
            <>
              <Text style={[styles.text, { color: colors.textSecondary, marginTop: 8 }]}>
                RouteMate app is not installed on your device.
              </Text>
              <TouchableOpacity 
                style={[styles.downloadButton, { backgroundColor: '#10b981' }]} 
                onPress={handleDownloadApp}
              >
                <Text style={styles.downloadButtonText}>Download RouteMate APK</Text>
              </TouchableOpacity>
              <Text style={[styles.smallText, { color: colors.textSecondary }]}>
                After installing, reopen this invite link.
              </Text>
            </>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <ActivityIndicator size="large" color={colors.tint} />
      <Text style={[styles.text, { color: colors.text }]}>
        {isJoining ? 'Joining community...' : 'Processing invite link...'}
      </Text>
      <TouchableOpacity onPress={() => router.replace('/(tabs)/communities')}>
        <Text style={{ color: colors.tint, fontWeight: '600' }}>Go to Communities</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 14,
  },
  webContent: {
    maxWidth: 600,
    width: '100%',
    alignItems: 'center',
    gap: 14,
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  smallText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  webTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  loader: {
    marginVertical: 12,
  },
  openAppButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  openAppButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  downloadButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PENDING_COMMUNITY_INVITE_TOKEN_KEY } from '@/constants/community';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/utils/api';

export default function CommunityInviteJoinScreen() {
  const colors = Colors.light;
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === 'string' ? params.token : '';
  const { isAuthenticated, isLoading, refreshUser } = useAuth();
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
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
  }, [isAuthenticated, isLoading, token, refreshUser, router]);

  async function handleOpenInApp() {
    if (!token) return;
    const deepLink = `routemate://community/join/${encodeURIComponent(token)}`;
    try {
      await Linking.openURL(deepLink);
    } catch {
      Alert.alert('Open App', 'Please install RouteMate app to accept this invite.');
    }
  }

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
        <Text style={[styles.webTitle, { color: colors.text }]}>Community Invite</Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          To join this community, open this link in the RouteMate mobile app.
        </Text>
        <TouchableOpacity style={[styles.openAppButton, { backgroundColor: colors.tint }]} onPress={handleOpenInApp}>
          <Text style={styles.openAppButtonText}>Open in RouteMate App</Text>
        </TouchableOpacity>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          If RouteMate is not installed, install it first and reopen this invite link.
        </Text>
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
  text: {
    fontSize: 16,
    textAlign: 'center',
  },
  webTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  openAppButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  openAppButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});

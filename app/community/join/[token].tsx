import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PENDING_COMMUNITY_INVITE_TOKEN_KEY } from '@/constants/community';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/utils/api';

export default function CommunityInviteJoinScreen() {
  const colors = Colors.light;
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const { isAuthenticated, isLoading, refreshUser } = useAuth();
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    const token = typeof params.token === 'string' ? params.token : '';
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
  }, [isAuthenticated, isLoading, params.token, refreshUser, router]);

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
});

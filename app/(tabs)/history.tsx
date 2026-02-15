import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/utils/api';
import { RideConnection } from '@/types';
import { Colors, Shadow, BorderRadius, Spacing } from '@/constants/theme';

export default function HistoryScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { isDarkMode } = useTheme();
  const colors = Colors[isDarkMode ? 'dark' : 'light'];
  const [rides, setRides] = useState<RideConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    } else {
      loadHistory();
    }
  }, [isAuthenticated, router]);

  async function loadHistory() {
    try {
      setIsLoading(true);
      const { rides: completedRides } = await api.getHistory();
      setRides(completedRides);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadHistory();
    setIsRefreshing(false);
  }

  function renderRideItem({ item }: { item: RideConnection }) {
    const isDriver = item.DriverId === user?.Id;
    const date = item.CreatedAt ? new Date(item.CreatedAt).toLocaleDateString() : 'N/A';
    const time = item.CreatedAt ? new Date(item.CreatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';

    return (
      <View style={[styles.rideCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.rideHeader}>
          <View style={[styles.roleBadge, { backgroundColor: isDriver ? '#e8671320' : '#3B82F620' }]}>
            <Text style={[styles.roleText, { color: isDriver ? colors.tint : colors.info }]}>
              {isDriver ? '🚗 Driver' : '👤 Passenger'}
            </Text>
          </View>
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>{date}</Text>
        </View>
        
        <View style={styles.rideDetails}>
          <View style={styles.locationRow}>
            <View style={[styles.locationDot, { backgroundColor: colors.success }]} />
            <View style={styles.locationInfo}>
              <Text style={[styles.locationLabel, { color: colors.textSecondary }]}>Pickup</Text>
              <Text style={[styles.locationValue, { color: colors.text }]}>
                {item.PickupLocation.lat.toFixed(4)}, {item.PickupLocation.lng.toFixed(4)}
              </Text>
            </View>
          </View>
          
          <View style={[styles.locationConnector, { backgroundColor: colors.border }]} />
          
          <View style={styles.locationRow}>
            <View style={[styles.locationDot, { backgroundColor: colors.error }]} />
            <View style={styles.locationInfo}>
              <Text style={[styles.locationLabel, { color: colors.textSecondary }]}>Destination</Text>
              <Text style={[styles.locationValue, { color: colors.text }]}>
                {item.Destination.lat.toFixed(4)}, {item.Destination.lng.toFixed(4)}
              </Text>
            </View>
          </View>
          
          <View style={[styles.infoRow, { borderTopColor: colors.border }]}>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Distance</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {item.Distance.toFixed(2)} km
              </Text>
            </View>
            
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Time</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{time}</Text>
            </View>
            
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Fare</Text>
              <Text style={[styles.fareValue, { color: colors.success }]}>₹{item.Fare.toFixed(2)}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.backgroundSecondary }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading history...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Ride History</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {rides.length} {rides.length === 1 ? 'ride' : 'rides'} completed
        </Text>
      </View>

      {rides.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🚗</Text>
          <Text style={[styles.emptyText, { color: colors.text }]}>No rides yet</Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            Your ride history will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={rides}
          renderItem={renderRideItem}
          keyExtractor={(item) => item.Id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl 
              refreshing={isRefreshing} 
              onRefresh={handleRefresh}
              tintColor={colors.tint}
              colors={[colors.tint]}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  header: {
    padding: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  listContent: {
    padding: Spacing.md,
  },
  rideCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    ...Shadow.medium,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  roleBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  roleText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
  dateText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  rideDetails: {
    gap: Spacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: BorderRadius.full,
    marginTop: 4,
    marginRight: Spacing.sm,
  },
  locationConnector: {
    width: 2,
    height: 20,
    marginLeft: 5,
    opacity: 0.3,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locationValue: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  infoItem: {
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  fareValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  divider: {
    width: 1,
    height: 30,
    opacity: 0.3,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    fontFamily: 'Inter-Regular',
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
});
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/utils/api';
import { RideConnection } from '@/types';

export default function HistoryScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [rides, setRides] = useState<RideConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    } else {
      loadHistory();
    }
  }, [isAuthenticated]);

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
    const time = item.CreatedAt ? new Date(item.CreatedAt).toLocaleTimeString() : 'N/A';

    return (
      <View style={styles.rideCard}>
        <View style={styles.rideHeader}>
          <Text style={styles.roleText}>{isDriver ? 'Driver' : 'Passenger'}</Text>
          <Text style={styles.dateText}>{date}</Text>
        </View>
        
        <View style={styles.rideDetails}>
          <View style={styles.locationRow}>
            <Text style={styles.label}>Pickup:</Text>
            <Text style={styles.value}>
              {item.PickupLocation.lat.toFixed(4)}, {item.PickupLocation.lng.toFixed(4)}
            </Text>
          </View>
          
          <View style={styles.locationRow}>
            <Text style={styles.label}>Destination:</Text>
            <Text style={styles.value}>
              {item.Destination.lat.toFixed(4)}, {item.Destination.lng.toFixed(4)}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.label}>Distance</Text>
              <Text style={styles.infoValue}>{item.Distance.toFixed(2)} km</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.label}>Fare</Text>
              <Text style={styles.fareValue}>${item.Fare.toFixed(2)}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.label}>Time</Text>
              <Text style={styles.infoValue}>{time}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ride History</Text>
        <Text style={styles.subtitle}>{rides.length} completed rides</Text>
      </View>

      {rides.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No completed rides yet</Text>
          <Text style={styles.emptySubtext}>Your ride history will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={rides}
          renderItem={renderRideItem}
          keyExtractor={(item) => item.Id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  listContent: {
    padding: 15,
  },
  rideCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  roleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  dateText: {
    fontSize: 14,
    color: '#666',
  },
  rideDetails: {
    gap: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginRight: 8,
    minWidth: 80,
  },
  value: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 4,
  },
  fareValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34C759',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
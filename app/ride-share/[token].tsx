import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { RideShareDetails } from '@/types';

const REFRESH_INTERVAL_MS = 10000;

function formatCoordinate(value: number | undefined): string {
  if (typeof value !== 'number') return 'N/A';
  return value.toFixed(6);
}

export default function RideShareScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const token = useMemo(() => (Array.isArray(params.token) ? params.token[0] : params.token), [params.token]);
  const [details, setDetails] = useState<RideShareDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadDetails(showRefreshing = false) {
    if (!token) {
      setError('Missing share token');
      setLoading(false);
      return;
    }

    if (showRefreshing) {
      setRefreshing(true);
    }

    try {
      const response = await fetch(`/api/rides/share/details?token=${encodeURIComponent(token)}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load ride details');
      }

      setDetails(data as RideShareDetails);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load ride details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDetails();
    const timer = setInterval(() => {
      loadDetails();
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e86713" />
        <Text style={styles.loadingText}>Loading ride details...</Text>
      </View>
    );
  }

  if (error || !details) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Link unavailable</Text>
        <Text style={styles.errorText}>{error || 'No ride details found'}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadDetails(true)} />}
    >
      <Text style={styles.title}>RouteMate Live Ride</Text>
      <Text style={styles.status}>Status: {details.connection.State}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Driver</Text>
        <Text style={styles.line}>Name: {details.driver.name}</Text>
        <Text style={styles.line}>Vehicle: {details.driver.vehicleType || 'N/A'}</Text>
        <Text style={styles.line}>
          Rating: {details.driver.ratingAverage ? `${details.driver.ratingAverage.toFixed(1)} / 5` : 'No ratings'}
        </Text>
        <Text style={styles.line}>
          Driver Live: {formatCoordinate(details.driver.lastLocation?.lat)}, {formatCoordinate(details.driver.lastLocation?.lng)}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Passenger</Text>
        <Text style={styles.line}>Name: {details.passenger.name}</Text>
        <Text style={styles.line}>
          Passenger Live: {formatCoordinate(details.passenger.lastLocation?.lat)}, {formatCoordinate(details.passenger.lastLocation?.lng)}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ride Route</Text>
        <Text style={styles.line}>
          Pickup: {formatCoordinate(details.connection.PickupLocation?.lat)}, {formatCoordinate(details.connection.PickupLocation?.lng)}
        </Text>
        <Text style={styles.line}>
          Destination: {formatCoordinate(details.connection.Destination?.lat)}, {formatCoordinate(details.connection.Destination?.lng)}
        </Text>
        <Text style={styles.line}>Distance: {details.connection.Distance.toFixed(2)} km</Text>
        <Text style={styles.line}>Fare: ₹{details.connection.Fare.toFixed(2)}</Text>
      </View>

      <Text style={styles.meta}>Last update: {new Date(details.updatedAt).toLocaleString()}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f8',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f7f7f8',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
  },
  status: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e86713',
    marginBottom: 14,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  line: {
    fontSize: 15,
    color: '#374151',
    marginBottom: 6,
  },
  loadingText: {
    marginTop: 12,
    color: '#4b5563',
    fontSize: 15,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 15,
    color: '#4b5563',
    textAlign: 'center',
  },
  meta: {
    marginTop: 6,
    fontSize: 13,
    color: '#6b7280',
  },
});

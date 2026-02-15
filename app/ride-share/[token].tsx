import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View, Dimensions, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { RideShareDetails } from '@/types';

const REFRESH_INTERVAL_MS = 10000;

function formatCoordinate(value: number | undefined): string {
  if (typeof value !== 'number') return 'N/A';
  return value.toFixed(6);
}

function useResponsive() {
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  const isDesktop = dimensions.width >= 768;
  const isMobile = dimensions.width < 768;

  return { isDesktop, isMobile, width: dimensions.width };
}

export default function RideShareScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const token = useMemo(() => (Array.isArray(params.token) ? params.token[0] : params.token), [params.token]);
  const [details, setDetails] = useState<RideShareDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isDesktop } = useResponsive();

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
        <View style={[styles.errorContainer, isDesktop && styles.errorContainerDesktop]}>
          <Text style={styles.errorTitle}>Link unavailable</Text>
          <Text style={styles.errorText}>{error || 'No ride details found'}</Text>
        </View>
      </View>
    );
  }

  const containerStyle = isDesktop ? styles.desktopContainer : styles.mobileContainer;
  const cardStyle = isDesktop ? styles.cardDesktop : styles.card;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, containerStyle]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadDetails(true)} />}
    >
      <View style={[styles.contentWrapper, isDesktop && styles.contentWrapperDesktop]}>
        <View style={styles.header}>
          <Text style={[styles.title, isDesktop && styles.titleDesktop]}>RouteMate Live Ride</Text>
          <View style={[styles.statusBadge, details.connection.State === 'picked_up' ? styles.statusActive : styles.statusInactive]}>
            <Text style={styles.statusText}>{details.connection.State}</Text>
          </View>
        </View>

        <View style={[styles.cardsContainer, isDesktop && styles.cardsContainerDesktop]}>
          <View style={[cardStyle, isDesktop && styles.cardHalf]}>
            <Text style={styles.cardTitle}>👤 Driver</Text>
            <View style={styles.cardContent}>
              <Text style={styles.line}>
                <Text style={styles.label}>Name:</Text> {details.driver.name}
              </Text>
              <Text style={styles.line}>
                <Text style={styles.label}>Vehicle:</Text> {details.driver.vehicleType || 'N/A'}
              </Text>
              <Text style={styles.line}>
                <Text style={styles.label}>Rating:</Text> {details.driver.ratingAverage ? `${details.driver.ratingAverage.toFixed(1)} ⭐` : 'No ratings'}
              </Text>
              <Text style={styles.line}>
                <Text style={styles.label}>Live Location:</Text>
              </Text>
              <Text style={styles.coordinates}>
                {formatCoordinate(details.driver.lastLocation?.lat)}, {formatCoordinate(details.driver.lastLocation?.lng)}
              </Text>
            </View>
          </View>

          <View style={[cardStyle, isDesktop && styles.cardHalf]}>
            <Text style={styles.cardTitle}>🧑 Passenger</Text>
            <View style={styles.cardContent}>
              <Text style={styles.line}>
                <Text style={styles.label}>Name:</Text> {details.passenger.name}
              </Text>
              <Text style={styles.line}>
                <Text style={styles.label}>Live Location:</Text>
              </Text>
              <Text style={styles.coordinates}>
                {formatCoordinate(details.passenger.lastLocation?.lat)}, {formatCoordinate(details.passenger.lastLocation?.lng)}
              </Text>
            </View>
          </View>
        </View>

        <View style={cardStyle}>
          <Text style={styles.cardTitle}>🗺️ Ride Route</Text>
          <View style={styles.cardContent}>
            <View style={styles.routeSection}>
              <Text style={[styles.line, styles.routeLabel]}>
                <Text style={styles.label}>📍 Pickup:</Text>
              </Text>
              <Text style={styles.coordinates}>
                {formatCoordinate(details.connection.PickupLocation?.lat)}, {formatCoordinate(details.connection.PickupLocation?.lng)}
              </Text>
            </View>
            <View style={styles.routeSection}>
              <Text style={[styles.line, styles.routeLabel]}>
                <Text style={styles.label}>🎯 Destination:</Text>
              </Text>
              <Text style={styles.coordinates}>
                {formatCoordinate(details.connection.Destination?.lat)}, {formatCoordinate(details.connection.Destination?.lng)}
              </Text>
            </View>
            <View style={styles.routeStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{details.connection.Distance.toFixed(2)} km</Text>
                <Text style={styles.statLabel}>Distance</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>₹{details.connection.Fare.toFixed(2)}</Text>
                <Text style={styles.statLabel}>Fare</Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.meta}>
          🕐 Last updated: {new Date(details.updatedAt).toLocaleString()}
        </Text>
        <Text style={styles.metaSmall}>
          Auto-refreshes every {REFRESH_INTERVAL_MS / 1000} seconds
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f8',
  },
  content: {
    paddingBottom: 40,
  },
  mobileContainer: {
    padding: 16,
  },
  desktopContainer: {
    padding: 24,
    alignItems: 'center',
  },
  contentWrapper: {
    width: '100%',
  },
  contentWrapperDesktop: {
    maxWidth: 1200,
    width: '100%',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f7f7f8',
  },
  errorContainer: {
    maxWidth: 400,
    alignItems: 'center',
  },
  errorContainerDesktop: {
    maxWidth: 600,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  titleDesktop: {
    fontSize: 36,
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  statusActive: {
    backgroundColor: '#10b981',
  },
  statusInactive: {
    backgroundColor: '#6b7280',
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardsContainer: {
    marginBottom: 12,
  },
  cardsContainerDesktop: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardDesktop: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHalf: {
    flex: 1,
    minWidth: 300,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
  },
  cardContent: {
    gap: 10,
  },
  line: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  label: {
    fontWeight: '600',
    color: '#111827',
  },
  coordinates: {
    fontSize: 13,
    color: '#6b7280',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    paddingLeft: 8,
  },
  routeSection: {
    marginBottom: 8,
  },
  routeLabel: {
    marginBottom: 4,
  },
  routeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e5e7eb',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#e86713',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
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
    textAlign: 'center',
  },
  errorText: {
    fontSize: 15,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 22,
  },
  meta: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  metaSmall: {
    marginTop: 4,
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
});
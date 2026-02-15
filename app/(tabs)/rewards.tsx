import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useAppState } from '@/contexts/AppStateContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Colors, Shadow, BorderRadius, Spacing } from '@/constants/theme';
import type { RewardRedemption, RewardRole, RewardVoucher } from '@/types';
import { api } from '@/utils/api';

interface RewardsPayload {
  points: {
    passenger: number;
    driver: number;
  };
  vouchers: {
    passenger: RewardVoucher[];
    driver: RewardVoucher[];
  };
  redemptions: RewardRedemption[];
}

export default function RewardsScreen() {
  const router = useRouter();
  const { isAuthenticated, refreshUser } = useAuth();
  const { role } = useAppState();
  const { isDarkMode } = useTheme();
  const colors = Colors[isDarkMode ? 'dark' : 'light'];

  const [selectedRole, setSelectedRole] = useState<RewardRole>(role);
  const [rewards, setRewards] = useState<RewardsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedeemingVoucherId, setIsRedeemingVoucherId] = useState<string | null>(null);

  const activePoints = useMemo(() => {
    if (!rewards) return 0;
    return selectedRole === 'driver' ? rewards.points.driver : rewards.points.passenger;
  }, [rewards, selectedRole]);

  const activeVouchers = useMemo(() => {
    if (!rewards) return [];
    return selectedRole === 'driver' ? rewards.vouchers.driver : rewards.vouchers.passenger;
  }, [rewards, selectedRole]);

  const loadRewards = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.getRewards();
      setRewards(data);
    } catch (error) {
      console.error('Failed to load rewards:', error);
      Alert.alert('Error', 'Failed to load rewards');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setSelectedRole(role);
  }, [role]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    loadRewards();
  }, [isAuthenticated, router, loadRewards]);

  async function handleRedeem(voucher: RewardVoucher) {
    if (!rewards) return;

    const points = voucher.role === 'driver' ? rewards.points.driver : rewards.points.passenger;
    if (points < voucher.pointsCost) {
      Alert.alert('Not Enough Points', `You need ${voucher.pointsCost - points} more points.`);
      return;
    }

    try {
      setIsRedeemingVoucherId(voucher.id);
      const result = await api.redeemReward(voucher.role, voucher.id);
      Alert.alert(
        'Voucher Redeemed',
        `${result.voucher.title} redeemed successfully. Remaining ${result.role} points: ${result.remainingPoints}`
      );
      await Promise.all([loadRewards(), refreshUser()]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to redeem voucher');
    } finally {
      setIsRedeemingVoucherId(null);
    }
  }

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.backgroundSecondary }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading rewards...</Text>
      </View>
    );
  }

  if (!rewards) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <ScrollView>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Rewards</Text>
        </View>

        <View style={styles.content}>
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeaderRow}>
              <MaterialIcons name="stars" size={24} color={colors.text} style={{ marginRight: 8 }} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Points Balance</Text>
            </View>

            <View style={styles.roleToggleRow}>
              {(['passenger', 'driver'] as RewardRole[]).map((roleOption) => (
                <TouchableOpacity
                  key={roleOption}
                  style={[
                    styles.roleToggleButton,
                    {
                      borderColor: selectedRole === roleOption ? colors.tint : colors.border,
                      backgroundColor: selectedRole === roleOption ? colors.tint + '1f' : colors.backgroundSecondary,
                    },
                  ]}
                  onPress={() => setSelectedRole(roleOption)}
                >
                  <Text
                    style={[
                      styles.roleToggleButtonText,
                      { color: selectedRole === roleOption ? colors.tint : colors.textSecondary },
                    ]}
                  >
                    {roleOption === 'passenger' ? 'Passenger' : 'Driver'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.pointsCard, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.pointsLabel, { color: colors.textSecondary }]}>
                {selectedRole === 'driver' ? 'Driver Points' : 'Passenger Points'}
              </Text>
              <Text style={[styles.pointsValue, { color: colors.tint }]}>{activePoints}</Text>
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeaderRow}>
              <MaterialIcons name="redeem" size={24} color={colors.text} style={{ marginRight: 8 }} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Available Vouchers</Text>
            </View>

            {activeVouchers.map((voucher) => {
              const canRedeem = activePoints >= voucher.pointsCost;
              const isRedeeming = isRedeemingVoucherId === voucher.id;

              return (
                <View key={voucher.id} style={[styles.voucherCard, { borderColor: colors.border }]}>
                  <Text style={[styles.voucherTitle, { color: colors.text }]}>{voucher.title}</Text>
                  <Text style={[styles.voucherDescription, { color: colors.textSecondary }]}>
                    {voucher.description}
                  </Text>
                  <View style={styles.voucherFooter}>
                    <Text style={[styles.pointsCost, { color: colors.text }]}>
                      {voucher.pointsCost} points
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.redeemButton,
                        { backgroundColor: canRedeem ? colors.tint : colors.border },
                      ]}
                      disabled={!canRedeem || isRedeeming}
                      onPress={() => handleRedeem(voucher)}
                    >
                      {isRedeeming ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.redeemButtonText}>{canRedeem ? 'Redeem' : 'Not enough points'}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeaderRow}>
              <MaterialIcons name="history" size={24} color={colors.text} style={{ marginRight: 8 }} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Redemptions</Text>
            </View>

            {rewards.redemptions.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No redemptions yet
              </Text>
            ) : (
              rewards.redemptions.slice(0, 8).map((item) => (
                <View key={item.Id} style={[styles.redemptionRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.redemptionTitle, { color: colors.text }]}>{item.VoucherTitle}</Text>
                  <Text style={[styles.redemptionMeta, { color: colors.textSecondary }]}>
                    {item.Role} • {item.PointsCost} points
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
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
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    paddingTop: 64,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  section: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadow.small,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  roleToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  roleToggleButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  roleToggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pointsCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  pointsLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  pointsValue: {
    fontSize: 30,
    fontWeight: '800',
  },
  voucherCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  voucherTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  voucherDescription: {
    fontSize: 13,
    marginBottom: 10,
  },
  voucherFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  pointsCost: {
    fontSize: 14,
    fontWeight: '600',
  },
  redeemButton: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 130,
    alignItems: 'center',
  },
  redeemButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
  },
  redemptionRow: {
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  redemptionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  redemptionMeta: {
    fontSize: 12,
    marginTop: 2,
    textTransform: 'capitalize',
  },
});

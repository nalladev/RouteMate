import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/utils/api';
import { Transaction, User } from '@/types';
import { Colors, Shadow, BorderRadius, Spacing } from '@/constants/theme';
import { VEHICLE_TYPES } from '@/constants/vehicles';
import type { VehicleType } from '@/constants/vehicles';

export default function AccountScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout, refreshUser } = useAuth();
  const { colorScheme, isDarkMode, setColorScheme } = useTheme();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const colors = Colors[isDarkMode ? 'dark' : 'light'];

  // Top-up state
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');

  // Payout state
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [upiId, setUpiId] = useState('');
  const [showUpiInput, setShowUpiInput] = useState(false);
  const [selectedVehicleType, setSelectedVehicleType] = useState<VehicleType | ''>('');
  const [originalVehicleType, setOriginalVehicleType] = useState<VehicleType | ''>('');
  const [vehicleName, setVehicleName] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleRegistration, setVehicleRegistration] = useState('');
  const [originalVehicleName, setOriginalVehicleName] = useState('');
  const [originalVehicleModel, setOriginalVehicleModel] = useState('');
  const [originalVehicleRegistration, setOriginalVehicleRegistration] = useState('');

  // Transactions
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showTransactions, setShowTransactions] = useState(false);

  const loadAccountInfo = useCallback(async () => {
    try {
      setIsLoading(true);
      const [balanceData, transactionsData, meData] = await Promise.all([
        api.getWalletBalance(),
        api.getTransactions(10, 0),
        api.getMe(),
      ]);
      setBalance(balanceData.balance);
      setTransactions(transactionsData.transactions);
      setProfileUser(meData.user);

      // Set UPI ID if user has one
      if (meData.user?.UpiId) {
        setUpiId(meData.user.UpiId);
      }
      const vehicleType = meData.user?.VehicleType || '';
      setSelectedVehicleType(vehicleType);
      setOriginalVehicleType(vehicleType);
      
      const vName = meData.user?.VehicleName || '';
      const vModel = meData.user?.VehicleModel || '';
      const vReg = meData.user?.VehicleRegistration || '';
      setVehicleName(vName);
      setVehicleModel(vModel);
      setVehicleRegistration(vReg);
      setOriginalVehicleName(vName);
      setOriginalVehicleModel(vModel);
      setOriginalVehicleRegistration(vReg);
    } catch (error) {
      console.error('Failed to load account info:', error);
      Alert.alert('Error', 'Failed to load account information');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    } else {
      loadAccountInfo();
    }
  }, [isAuthenticated, router, loadAccountInfo]);

  async function handleTopup() {
    const amount = parseFloat(topupAmount);

    if (isNaN(amount) || amount < 100 || amount > 10000) {
      Alert.alert('Invalid Amount', 'Amount must be between ₹100 and ₹10,000');
      return;
    }

    try {
      setIsProcessing(true);
      const orderData = await api.createTopupOrder(amount);

      // In production, you would integrate Razorpay Checkout here
      // For now, we'll simulate a successful payment
      Alert.alert(
        'Razorpay Payment',
        `Order created for ₹${amount}\n\nIn production, Razorpay checkout would open here.\n\nOrder ID: ${orderData.orderId}`,
        [
          {
            text: 'Simulate Success',
            onPress: async () => {
              // In production, this would come from Razorpay callback
              try {
                await api.verifyTopup(
                  orderData.orderId,
                  'simulated_payment_id',
                  'simulated_signature'
                );
                Alert.alert('Success', 'Balance updated successfully!');
                setShowTopupModal(false);
                setTopupAmount('');
                loadAccountInfo();
              } catch (error: any) {
                Alert.alert('Error', error.message || 'Payment verification failed');
              }
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create order');
    } finally {
      setIsProcessing(false);
    }
  }

  async function handlePayout() {
    // Check KYC verification first
    if (!currentUser?.IsKycVerified) {
      Alert.alert(
        'KYC Verification Required',
        'You must complete KYC verification before withdrawing funds. This is required for financial transactions.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Verify Now', onPress: () => router.push('/kyc-verification' as any) }
        ]
      );
      return;
    }

    const amount = parseFloat(payoutAmount);

    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    if (amount > balance) {
      Alert.alert('Insufficient Balance', 'You do not have enough balance for this payout');
      return;
    }

    if (!upiId) {
      setShowUpiInput(true);
      return;
    }

    // Confirm UPI ID
    Alert.alert(
      'Confirm Payout',
      `Withdraw ₹${amount.toFixed(2)} to UPI ID:\n${upiId}\n\nPlease verify your UPI ID is correct. Incorrect UPI ID may result in loss of funds.`,
      [
        { text: 'Change UPI ID', onPress: () => setShowUpiInput(true) },
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsProcessing(true);
              const result = await api.requestPayout(amount, upiId);
              Alert.alert(
                'Payout Initiated',
                `Your payout of ₹${amount.toFixed(2)} has been initiated.\n\nStatus: ${result.status}\nPayout ID: ${result.payoutId}\n\nFunds will be transferred to your UPI ID within 1-2 business days.`
              );
              setShowPayoutModal(false);
              setPayoutAmount('');
              loadAccountInfo();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to process payout');
            } finally {
              setIsProcessing(false);
            }
          }
        }
      ]
    );
  }

  async function handleUpdateUpiId() {
    if (!upiId || !upiId.includes('@')) {
      Alert.alert('Invalid UPI ID', 'Please enter a valid UPI ID (e.g., username@paytm)');
      return;
    }

    try {
      setIsProcessing(true);
      await api.updateUpiId(upiId);
      Alert.alert('Success', 'UPI ID updated successfully');
      setShowUpiInput(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update UPI ID');
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleSaveVehicleType() {
    if (!selectedVehicleType) {
      Alert.alert('Vehicle Required', 'Please select a vehicle type');
      return;
    }

    // Validate registration format if provided
    if (vehicleRegistration.trim()) {
      const regPattern = /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}$/i;
      if (!regPattern.test(vehicleRegistration.trim())) {
        Alert.alert('Invalid Registration', 'Registration format should be like KL34C3423');
        return;
      }
    }

    try {
      setIsProcessing(true);
      await api.updateVehicleDetails({
        vehicleType: selectedVehicleType,
        vehicleName: vehicleName.trim() || undefined,
        vehicleModel: vehicleModel.trim() || undefined,
        vehicleRegistration: vehicleRegistration.trim() || undefined,
      });
      
      // Refresh user data and profile without triggering full page loading
      await refreshUser();
      const meData = await api.getMe();
      setProfileUser(meData.user);
      const vehicleType = meData.user?.VehicleType || '';
      const vName = meData.user?.VehicleName || '';
      const vModel = meData.user?.VehicleModel || '';
      const vReg = meData.user?.VehicleRegistration || '';
      
      setSelectedVehicleType(vehicleType);
      setOriginalVehicleType(vehicleType);
      setVehicleName(vName);
      setVehicleModel(vModel);
      setVehicleRegistration(vReg);
      setOriginalVehicleName(vName);
      setOriginalVehicleModel(vModel);
      setOriginalVehicleRegistration(vReg);
      
      Alert.alert('Success', 'Vehicle information updated');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update vehicle information');
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleLogout() {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  }

  function getTransactionIcon(type: string): string {
    switch (type) {
      case 'topup': return '💰';
      case 'payout': return '💸';
      case 'ride_payment': return '🚗';
      case 'ride_earning': return '✅';
      default: return '💳';
    }
  }

  function getTransactionColor(type: string): string {
    switch (type) {
      case 'topup': return colors.success;
      case 'ride_earning': return colors.success;
      case 'payout': return colors.error;
      case 'ride_payment': return colors.warning;
      default: return colors.textSecondary;
    }
  }

  function getKycDisplayStatus(targetUser: User): { label: string; color: string; bgColor: string } {
    const status = targetUser.KycStatus || targetUser.KycData?.status;

    if (targetUser.IsKycVerified || status === 'approved') {
      return { label: '✓ Verified', color: colors.success, bgColor: colors.success + '20' };
    }

    if (status === 'under_review' || status === 'submitted' || status === 'session_created') {
      return { label: 'Under Review', color: colors.warning, bgColor: colors.warning + '20' };
    }

    if (status === 'rejected' || status === 'failed') {
      return { label: 'Rejected', color: colors.error, bgColor: colors.error + '20' };
    }

    return { label: 'Not Verified', color: colors.warning, bgColor: colors.warning + '20' };
  }

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.backgroundSecondary }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading account...</Text>
      </View>
    );
  }

  const currentUser = profileUser || user;

  if (!currentUser) {
    return null;
  }

  const kycDisplay = getKycDisplayStatus(currentUser);
  const canShowVerifyButton = !currentUser.IsKycVerified && kycDisplay.label !== 'Under Review';

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <ScrollView>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Account</Text>
        </View>

        <View style={styles.content}>
          {/* Profile Section */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeaderRow}>
              <MaterialIcons name="person" size={24} color={colors.text} style={{ marginRight: 8 }} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Profile</Text>
            </View>

            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
              <Text style={[styles.value, { color: colors.text }]}>{currentUser.Name || 'Not set'}</Text>
            </View>

            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Mobile</Text>
              <Text style={[styles.value, { color: colors.text }]}>{currentUser.Mobile}</Text>
            </View>

            <View style={[styles.infoRow, { borderBottomColor: colors.border, alignItems: 'flex-start' }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Vehicle Info</Text>
              <View style={styles.vehicleTypeContainer}>
                <Text style={[styles.vehicleNote, { color: colors.textSecondary }]}>
                  All fields required for driving mode
                </Text>
                <View style={styles.vehicleTypeOptions}>
                  {VEHICLE_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.vehicleTypeOption,
                        {
                          borderColor: selectedVehicleType === type ? colors.tint : colors.border,
                          backgroundColor: selectedVehicleType === type ? colors.tint + '22' : 'transparent',
                        },
                      ]}
                      onPress={() => setSelectedVehicleType(type)}
                      disabled={isProcessing}
                    >
                      <Text
                        style={[
                          styles.vehicleTypeOptionText,
                          { color: selectedVehicleType === type ? colors.tint : colors.textSecondary },
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <TextInput
                  style={[styles.vehicleInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="Vehicle Name (e.g., Honda, Toyota)"
                  placeholderTextColor={colors.textSecondary}
                  value={vehicleName}
                  onChangeText={setVehicleName}
                  editable={!isProcessing}
                />
                
                <TextInput
                  style={[styles.vehicleInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="Model (e.g., City, Innova)"
                  placeholderTextColor={colors.textSecondary}
                  value={vehicleModel}
                  onChangeText={setVehicleModel}
                  editable={!isProcessing}
                />
                
                <TextInput
                  style={[styles.vehicleInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="Registration (e.g., KL34C3423)"
                  placeholderTextColor={colors.textSecondary}
                  value={vehicleRegistration}
                  onChangeText={(text) => setVehicleRegistration(text.toUpperCase())}
                  autoCapitalize="characters"
                  editable={!isProcessing}
                  maxLength={13}
                />
                
                <TouchableOpacity
                  style={[
                    styles.saveVehicleButton, 
                    { 
                      backgroundColor: colors.tint,
                      opacity: (isProcessing || !selectedVehicleType || 
                        (selectedVehicleType === originalVehicleType && 
                         vehicleName === originalVehicleName &&
                         vehicleModel === originalVehicleModel &&
                         vehicleRegistration === originalVehicleRegistration)) ? 0.5 : 1,
                    }
                  ]}
                  onPress={handleSaveVehicleType}
                  disabled={isProcessing || !selectedVehicleType || 
                    (selectedVehicleType === originalVehicleType && 
                     vehicleName === originalVehicleName &&
                     vehicleModel === originalVehicleModel &&
                     vehicleRegistration === originalVehicleRegistration)}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveVehicleButtonText}>Save Vehicle</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>KYC Status</Text>
              <View style={styles.badgeContainer}>
                {currentUser.IsKycVerified ? (
                  <View style={[styles.verifiedBadge, { backgroundColor: colors.success + '20' }]}>
                    <Text style={[styles.verifiedText, { color: colors.success }]}>✓ Verified</Text>
                  </View>
                ) : (
                  <View style={[styles.unverifiedBadge, { backgroundColor: kycDisplay.bgColor }]}>
                    <Text style={[styles.unverifiedText, { color: kycDisplay.color }]}>{kycDisplay.label}</Text>
                  </View>
                )}
              </View>
            </View>

            {canShowVerifyButton && (
              <TouchableOpacity
                style={[styles.verifyKycButton, { backgroundColor: colors.tint }]}
                onPress={() => router.push('/kyc-verification' as any)}
              >
                <Text style={styles.verifyKycButtonText}>🔒 Verify Identity Now</Text>
              </TouchableOpacity>
            )}

            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Driver Rating</Text>
              <Text style={[styles.value, { color: colors.text }]}>
                {(currentUser.DriverRatingCount || 0) > 0
                  ? `${(currentUser.DriverRatingAverage || 0).toFixed(1)} / 5 (${currentUser.DriverRatingCount} ratings)`
                  : 'No ratings yet'}
              </Text>
            </View>

            {currentUser.UpiId && (
              <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>UPI ID</Text>
                <Text style={[styles.value, { color: colors.text }]}>{currentUser.UpiId}</Text>
              </View>
            )}
          </View>

          {/* Wallet Section */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeaderRow}>
              <MaterialIcons name="account-balance-wallet" size={24} color={colors.text} style={{ marginRight: 8 }} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Wallet</Text>
            </View>

            <View style={[styles.balanceContainer, { borderBottomColor: colors.border }]}>
              <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Available Balance</Text>
              <Text style={[styles.balanceValue, { color: colors.tint }]}>₹{balance.toFixed(2)}</Text>
            </View>

            <View style={styles.walletActions}>
              <TouchableOpacity
                style={[styles.walletButton, { backgroundColor: colors.success }, styles.disabledButton]}
                onPress={() => Alert.alert(
                  'Feature Temporarily Disabled',
                  'Deposit feature is temporarily disabled.\n\nRazorpay regulations require a valid Play Store link for payment gateway integration. This feature will be enabled once the app is published on Play Store.'
                )}
              >
                <Text style={styles.walletButtonText}>💰 Top Up (Disabled)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.walletButton, { backgroundColor: colors.error }, styles.disabledButton]}
                onPress={() => {
                  if (!currentUser.IsKycVerified) {
                    Alert.alert(
                      'KYC Verification Required',
                      'You must complete KYC verification before withdrawing funds.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Verify Now', onPress: () => router.push('/kyc-verification' as any) }
                      ]
                    );
                    return;
                  }
                  Alert.alert(
                    'Feature Temporarily Disabled',
                    'Withdrawal feature is temporarily disabled.\n\nRazorpay regulations require a valid Play Store link for payment gateway integration. This feature will be enabled once the app is published on Play Store.'
                  );
                }}
              >
                <Text style={styles.walletButtonText}>💸 Withdraw (Disabled)</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.disabledNotice, { color: colors.textSecondary, backgroundColor: colors.backgroundSecondary }]}>
              💡 Deposit and withdrawal features are temporarily disabled until Play Store publication. You can still use existing balance for rides.
            </Text>
          </View>

          {/* Recent Transactions */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderRow}>
                <MaterialIcons name="assessment" size={24} color={colors.text} style={{ marginRight: 8 }} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Transactions</Text>
              </View>
              {transactions.length > 0 && (
                <TouchableOpacity onPress={() => setShowTransactions(true)}>
                  <Text style={[styles.viewAllText, { color: colors.tint }]}>View All</Text>
                </TouchableOpacity>
              )}
            </View>

            {transactions.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No transactions yet</Text>
            ) : (
              transactions.slice(0, 5).map((tx) => (
                <View key={tx.Id} style={[styles.transactionItem, { borderBottomColor: colors.border }]}>
                  <View style={[styles.transactionIcon, { backgroundColor: getTransactionColor(tx.Type) + '20' }]}>
                    <Text style={styles.transactionIconText}>
                      {getTransactionIcon(tx.Type)}
                    </Text>
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={[styles.transactionDescription, { color: colors.text }]}>{tx.Description}</Text>
                    <Text style={[styles.transactionDate, { color: colors.textSecondary }]}>
                      {new Date(tx.CreatedAt?.toDate?.() || tx.CreatedAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={[
                    styles.transactionAmount,
                    { color: getTransactionColor(tx.Type) }
                  ]}>
                    {tx.Type === 'topup' || tx.Type === 'ride_earning' ? '+' : '-'}
                    ₹{tx.Amount.toFixed(2)}
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* Settings Section */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeaderRow}>
              <MaterialIcons name="settings" size={24} color={colors.text} style={{ marginRight: 8 }} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Settings</Text>
            </View>

            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Theme</Text>
              <View style={styles.themeOptions}>
                <TouchableOpacity
                  style={[
                    styles.themeOption,
                    {
                      borderColor: colorScheme === 'light' ? colors.tint : colors.border,
                      backgroundColor: colorScheme === 'light' ? colors.tint + '22' : 'transparent',
                    },
                  ]}
                  onPress={() => setColorScheme('light')}
                >
                  <MaterialIcons 
                    name="light-mode" 
                    size={20} 
                    color={colorScheme === 'light' ? colors.tint : colors.textSecondary} 
                  />
                  <Text
                    style={[
                      styles.themeOptionText,
                      { color: colorScheme === 'light' ? colors.tint : colors.textSecondary },
                    ]}
                  >
                    Light
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.themeOption,
                    {
                      borderColor: colorScheme === 'dark' ? colors.tint : colors.border,
                      backgroundColor: colorScheme === 'dark' ? colors.tint + '22' : 'transparent',
                    },
                  ]}
                  onPress={() => setColorScheme('dark')}
                >
                  <MaterialIcons 
                    name="dark-mode" 
                    size={20} 
                    color={colorScheme === 'dark' ? colors.tint : colors.textSecondary} 
                  />
                  <Text
                    style={[
                      styles.themeOptionText,
                      { color: colorScheme === 'dark' ? colors.tint : colors.textSecondary },
                    ]}
                  >
                    Dark
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.themeOption,
                    {
                      borderColor: colorScheme === 'system' ? colors.tint : colors.border,
                      backgroundColor: colorScheme === 'system' ? colors.tint + '22' : 'transparent',
                    },
                  ]}
                  onPress={() => setColorScheme('system')}
                >
                  <MaterialIcons 
                    name="brightness-auto" 
                    size={20} 
                    color={colorScheme === 'system' ? colors.tint : colors.textSecondary} 
                  />
                  <Text
                    style={[
                      styles.themeOptionText,
                      { color: colorScheme === 'system' ? colors.tint : colors.textSecondary },
                    ]}
                  >
                    System
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionsSection}>
            <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.error }]} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Top-up Modal */}
      <Modal visible={showTopupModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Top Up Balance</Text>

            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Amount (₹)</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
              placeholder="Enter amount (₹100 - ₹10,000)"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              value={topupAmount}
              onChangeText={setTopupAmount}
              editable={!isProcessing}
            />

            <Text style={[styles.modalHint, { color: colors.textSecondary }]}>
              Minimum: ₹100 • Maximum: ₹10,000
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton, { backgroundColor: colors.border }]}
                onPress={() => {
                  setShowTopupModal(false);
                  setTopupAmount('');
                }}
              >
                <Text style={[styles.modalCancelButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton, { backgroundColor: colors.tint }]}
                onPress={handleTopup}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>Proceed to Pay</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payout Modal */}
      <Modal visible={showPayoutModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Withdraw Balance</Text>

            {!showUpiInput ? (
              <>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Amount (₹)</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
                  placeholder="Enter amount"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  value={payoutAmount}
                  onChangeText={setPayoutAmount}
                  editable={!isProcessing}
                />

                <Text style={[styles.modalHint, { color: colors.textSecondary }]}>
                  Available balance: ₹{balance.toFixed(2)}
                </Text>

                {upiId ? (
                  <View style={[styles.upiIdDisplay, { backgroundColor: colors.backgroundSecondary }]}>
                    <Text style={[styles.upiIdLabel, { color: colors.textSecondary }]}>Withdraw to:</Text>
                    <Text style={[styles.upiIdValue, { color: colors.text }]}>{upiId}</Text>
                    <TouchableOpacity onPress={() => setShowUpiInput(true)}>
                      <Text style={[styles.changeUpiText, { color: colors.tint }]}>Change UPI ID</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: colors.border }]}
                    onPress={() => {
                      setShowPayoutModal(false);
                      setPayoutAmount('');
                    }}
                    disabled={isProcessing}
                  >
                    <Text style={[styles.modalCancelButtonText, { color: colors.text }]}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: colors.success }]}
                    onPress={handlePayout}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.modalConfirmButtonText}>Withdraw</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>UPI ID</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
                  placeholder="username@paytm"
                  placeholderTextColor={colors.textSecondary}
                  value={upiId}
                  onChangeText={setUpiId}
                  editable={!isProcessing}
                />

                <Text style={[styles.modalHint, { color: colors.textSecondary }]}>
                  Enter your UPI ID (e.g., username@paytm, phone@ybl)
                </Text>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: colors.border }]}
                    onPress={() => setShowUpiInput(false)}
                    disabled={isProcessing}
                  >
                    <Text style={[styles.modalCancelButtonText, { color: colors.text }]}>Back</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: colors.tint }]}
                    onPress={handleUpdateUpiId}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.modalConfirmButtonText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Transactions Modal */}
      {/* Full Screen Transactions Modal */}
      <Modal visible={showTransactions} animationType="slide">
        <View style={[styles.fullScreenModal, { backgroundColor: colors.backgroundSecondary }]}>
        <View style={[styles.fullScreenHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Text style={[styles.fullScreenTitle, { color: colors.text }]}>All Transactions</Text>
          <TouchableOpacity onPress={() => setShowTransactions(false)}>
            <Text style={[styles.closeButton, { color: colors.text }]}>✕</Text>
          </TouchableOpacity>
        </View>

          <ScrollView style={styles.fullScreenContent}>
            {transactions.map((tx) => (
              <View key={tx.Id} style={[styles.transactionItem, { borderBottomColor: colors.border }]}>
                <View style={[styles.transactionIcon, { backgroundColor: getTransactionColor(tx.Type) + '20' }]}>
                  <Text style={styles.transactionIconText}>
                    {getTransactionIcon(tx.Type)}
                  </Text>
                </View>
                <View style={styles.transactionDetails}>
                  <Text style={[styles.transactionDescription, { color: colors.text }]}>{tx.Description}</Text>
                  <Text style={[styles.transactionDate, { color: colors.textSecondary }]}>
                    {new Date(tx.CreatedAt?.toDate?.() || tx.CreatedAt).toLocaleString()}
                  </Text>
                  <Text style={[styles.transactionStatus, { color: colors.textSecondary }]}>Status: {tx.Status}</Text>
                </View>
                <Text style={[
                  styles.transactionAmount,
                  { color: getTransactionColor(tx.Type) }
                ]}>
                  {tx.Type === 'topup' || tx.Type === 'ride_earning' ? '+' : '-'}
                  ₹{tx.Amount.toFixed(2)}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
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
  },
  header: {
    padding: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  content: {
    padding: Spacing.md,
  },
  section: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.medium,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionIcon: {
    fontSize: 24,
    marginRight: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
  },
  vehicleTypeContainer: {
    alignItems: 'flex-end',
    maxWidth: '70%',
  },
  vehicleTypeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: Spacing.xs,
  },
  vehicleTypeOption: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  vehicleTypeOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  themeOptions: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  themeOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  saveVehicleButton: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  saveVehicleButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  vehicleInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    marginTop: Spacing.sm,
  },
  vehicleNote: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: Spacing.xs,
  },
  badgeContainer: {
    flexDirection: 'row',
  },
  verifiedBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  verifiedText: {
    fontSize: 13,
    fontWeight: '700',
  },
  unverifiedBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  unverifiedText: {
    fontSize: 13,
    fontWeight: '700',
  },
  verifyKycButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    alignItems: 'center',
    ...Shadow.small,
  },
  verifyKycButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  balanceContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    marginBottom: Spacing.lg,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceValue: {
    fontSize: 42,
    fontWeight: 'bold',
    fontFamily: "inter",
  },
  walletActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  walletButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    ...Shadow.small,
  },

  disabledButton: {
    opacity: 0.5,
  },
  disabledNotice: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: Spacing.md,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  walletButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  transactionIconText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 13,
  },
  transactionStatus: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    paddingVertical: Spacing.lg,
  },
  actionsSection: {
    marginTop: Spacing.md,
  },
  logoutButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    ...Shadow.small,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
    ...Shadow.large,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 14,
    marginBottom: Spacing.sm,
    fontWeight: '600',
  },
  modalInput: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: 16,
    marginBottom: Spacing.md,
  },
  modalHint: {
    fontSize: 12,
    marginBottom: Spacing.lg,
  },
  upiIdDisplay: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  upiIdLabel: {
    fontSize: 12,
    marginBottom: Spacing.xs,
    fontWeight: '600',
  },
  upiIdValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  changeUpiText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  modalButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    ...Shadow.small,
  },
  modalCancelButton: {
    // Color set inline
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalConfirmButton: {
    // Color set inline
  },
  modalConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  fullScreenModal: {
    flex: 1,
  },
  fullScreenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    borderBottomWidth: 1,
  },
  fullScreenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 28,
    fontWeight: '300',
  },
  fullScreenContent: {
    flex: 1,
    padding: Spacing.md,
  },
});

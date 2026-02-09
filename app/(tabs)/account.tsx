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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/utils/api';
import { Transaction } from '@/types';

export default function AccountScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Top-up state
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  
  // Payout state
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [upiId, setUpiId] = useState('');
  const [showUpiInput, setShowUpiInput] = useState(false);
  
  // Transactions
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showTransactions, setShowTransactions] = useState(false);

  const loadAccountInfo = useCallback(async () => {
    try {
      setIsLoading(true);
      const [balanceData, transactionsData] = await Promise.all([
        api.getWalletBalance(),
        api.getTransactions(10, 0)
      ]);
      setBalance(balanceData.balance);
      setTransactions(transactionsData.transactions);
      
      // Set UPI ID if user has one
      if (user?.UpiId) {
        setUpiId(user.UpiId);
      }
    } catch (error) {
      console.error('Failed to load account info:', error);
      Alert.alert('Error', 'Failed to load account information');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

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

  async function handleLogout() {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
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
      case 'topup': return '#34C759';
      case 'ride_earning': return '#34C759';
      case 'payout': return '#FF3B30';
      case 'ride_payment': return '#FF9500';
      default: return '#666';
    }
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading account...</Text>
      </View>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>Account</Text>
        </View>

        <View style={styles.content}>
          {/* Profile Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.label}>Name</Text>
              <Text style={styles.value}>{user.Name || 'Not set'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.label}>Mobile</Text>
              <Text style={styles.value}>{user.Mobile}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.label}>KYC Status</Text>
              <View style={styles.badgeContainer}>
                {user.IsKycVerified ? (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>✓ Verified</Text>
                  </View>
                ) : (
                  <View style={styles.unverifiedBadge}>
                    <Text style={styles.unverifiedText}>Not Verified</Text>
                  </View>
                )}
              </View>
            </View>

            {user.UpiId && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>UPI ID</Text>
                <Text style={styles.value}>{user.UpiId}</Text>
              </View>
            )}
          </View>

          {/* Wallet Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Wallet</Text>
            
            <View style={styles.balanceContainer}>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <Text style={styles.balanceValue}>₹{balance.toFixed(2)}</Text>
            </View>
            
            <View style={styles.walletActions}>
              <TouchableOpacity 
                style={[styles.walletButton, styles.topupButton, styles.disabledButton]} 
                onPress={() => Alert.alert(
                  'Feature Temporarily Disabled',
                  'Deposit feature is temporarily disabled.\n\nRazorpay regulations require a valid Play Store link for payment gateway integration. This feature will be enabled once the app is published on Play Store.'
                )}
              >
                <Text style={styles.walletButtonText}>💰 Top Up (Disabled)</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.walletButton, styles.payoutButton, styles.disabledButton]} 
                onPress={() => Alert.alert(
                  'Feature Temporarily Disabled',
                  'Withdrawal feature is temporarily disabled.\n\nRazorpay regulations require a valid Play Store link for payment gateway integration. This feature will be enabled once the app is published on Play Store.'
                )}
              >
                <Text style={styles.walletButtonText}>💸 Withdraw (Disabled)</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.disabledNotice}>
              💡 Deposit and withdrawal features are temporarily disabled until Play Store publication. You can still use existing balance for rides.
            </Text>
          </View>

          {/* Recent Transactions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
              {transactions.length > 0 && (
                <TouchableOpacity onPress={() => setShowTransactions(true)}>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              )}
            </View>

            {transactions.length === 0 ? (
              <Text style={styles.emptyText}>No transactions yet</Text>
            ) : (
              transactions.slice(0, 5).map((tx) => (
                <View key={tx.Id} style={styles.transactionItem}>
                  <View style={styles.transactionIcon}>
                    <Text style={styles.transactionIconText}>
                      {getTransactionIcon(tx.Type)}
                    </Text>
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionDescription}>{tx.Description}</Text>
                    <Text style={styles.transactionDate}>
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

          {/* Actions */}
          <View style={styles.actionsSection}>
            <TouchableOpacity style={styles.refreshButton} onPress={loadAccountInfo}>
              <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Top-up Modal */}
      <Modal visible={showTopupModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Top Up Balance</Text>
            
            <Text style={styles.modalLabel}>Amount (₹)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter amount (₹100 - ₹10,000)"
              keyboardType="numeric"
              value={topupAmount}
              onChangeText={setTopupAmount}
              editable={!isProcessing}
            />

            <Text style={styles.modalHint}>
              Minimum: ₹100 | Maximum: ₹10,000
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowTopupModal(false);
                  setTopupAmount('');
                }}
                disabled={isProcessing}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
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
      <Modal visible={showPayoutModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Withdraw Funds</Text>
            
            {!showUpiInput ? (
              <>
                <Text style={styles.modalLabel}>Amount (₹)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter amount"
                  keyboardType="numeric"
                  value={payoutAmount}
                  onChangeText={setPayoutAmount}
                  editable={!isProcessing}
                />

                <Text style={styles.modalHint}>
                  Available: ₹{balance.toFixed(2)}
                </Text>

                {upiId && (
                  <View style={styles.upiIdDisplay}>
                    <Text style={styles.upiIdLabel}>Withdraw to:</Text>
                    <Text style={styles.upiIdValue}>{upiId}</Text>
                    <TouchableOpacity onPress={() => setShowUpiInput(true)}>
                      <Text style={styles.changeUpiText}>Change UPI ID</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalCancelButton]}
                    onPress={() => {
                      setShowPayoutModal(false);
                      setPayoutAmount('');
                    }}
                    disabled={isProcessing}
                  >
                    <Text style={styles.modalCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalConfirmButton]}
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
                <Text style={styles.modalLabel}>UPI ID</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="username@paytm"
                  value={upiId}
                  onChangeText={setUpiId}
                  autoCapitalize="none"
                  editable={!isProcessing}
                />

                <Text style={styles.modalHint}>
                  Enter your UPI ID (e.g., 9876543210@paytm)
                </Text>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalCancelButton]}
                    onPress={() => setShowUpiInput(false)}
                    disabled={isProcessing}
                  >
                    <Text style={styles.modalCancelButtonText}>Back</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalConfirmButton]}
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
      <Modal visible={showTransactions} animationType="slide">
        <View style={styles.fullScreenModal}>
          <View style={styles.fullScreenHeader}>
            <Text style={styles.fullScreenTitle}>All Transactions</Text>
            <TouchableOpacity onPress={() => setShowTransactions(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.fullScreenContent}>
            {transactions.map((tx) => (
              <View key={tx.Id} style={styles.transactionItem}>
                <View style={styles.transactionIcon}>
                  <Text style={styles.transactionIconText}>
                    {getTransactionIcon(tx.Type)}
                  </Text>
                </View>
                <View style={styles.transactionDetails}>
                  <Text style={styles.transactionDescription}>{tx.Description}</Text>
                  <Text style={styles.transactionDate}>
                    {new Date(tx.CreatedAt?.toDate?.() || tx.CreatedAt).toLocaleString()}
                  </Text>
                  <Text style={styles.transactionStatus}>Status: {tx.Status}</Text>
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
  },
  content: {
    padding: 15,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  viewAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 16,
    color: '#666',
  },
  value: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  badgeContainer: {
    flexDirection: 'row',
  },
  verifiedBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  verifiedText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  unverifiedBadge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  unverifiedText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  balanceContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#333',
  },
  walletActions: {
    flexDirection: 'row',
    gap: 10,
  },
  walletButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  topupButton: {
    backgroundColor: '#34C759',
  },
  payoutButton: {
    backgroundColor: '#DC3545',
  },
  disabledButton: {
    backgroundColor: '#999',
    opacity: 0.6,
  },
  disabledNotice: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    padding: 10,
  },
  walletButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionIconText: {
    fontSize: 20,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
  },
  transactionStatus: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    paddingVertical: 20,
  },
  actionsSection: {
    marginTop: 10,
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  modalInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 8,
  },
  modalHint: {
    fontSize: 12,
    color: '#999',
    marginBottom: 20,
  },
  upiIdDisplay: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  upiIdLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  upiIdValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginBottom: 8,
  },
  changeUpiText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#f0f0f0',
  },
  modalCancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  modalConfirmButton: {
    backgroundColor: '#007AFF',
  },
  modalConfirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fullScreenModal: {
    flex: 1,
    backgroundColor: '#fff',
  },
  fullScreenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  fullScreenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 28,
    color: '#666',
    fontWeight: '300',
  },
  fullScreenContent: {
    flex: 1,
    padding: 15,
  },
});
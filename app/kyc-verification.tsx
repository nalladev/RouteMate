import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { WebView } from 'react-native-webview';
import { api } from '@/utils/api';

export default function KYCVerificationScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showDiditWebView, setShowDiditWebView] = useState(false);

  // Didit KYC WebView URL
  const getDiditKYCUrl = () => {
    const diditClientId = process.env.EXPO_PUBLIC_DIDIT_CLIENT_ID || '';
    // Didit KYC verification flow URL
    return `https://kyc.didit.me/verify?client_id=${diditClientId}&user_id=${user?.Id}`;
  };

  async function handleKYCData(kycData: any) {
    setIsLoading(true);
    try {
      await api.verifyKyc(kycData);

      // Refresh user data to get updated KYC status
      await refreshUser();

      Alert.alert(
        'Success',
        'Your KYC verification is complete!',
        [
          {
            text: 'Continue',
            onPress: () => router.replace('/(tabs)'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to verify KYC');
      setShowDiditWebView(false);
    } finally {
      setIsLoading(false);
    }
  }

  function handleWebViewMessage(event: any) {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      
      // Didit sends KYC data when verification is complete
      if (message.type === 'kyc_complete' && message.data) {
        handleKYCData(message.data);
      } else if (message.type === 'kyc_error') {
        Alert.alert('Error', 'KYC verification failed. Please try again.');
        setShowDiditWebView(false);
      }
    } catch (error) {
      console.error('Failed to parse WebView message:', error);
    }
  }

  function handleSkip() {
    Alert.alert(
      'Skip KYC Verification?',
      'You can complete KYC verification later from your account settings. Some features may be limited without verification.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Skip for Now',
          onPress: () => router.replace('/(tabs)'),
        },
      ]
    );
  }

  if (showDiditWebView) {
    return (
      <View style={styles.container}>
        <View style={styles.webViewHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setShowDiditWebView(false)}
            disabled={isLoading}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.webViewTitle}>KYC Verification</Text>
        </View>
        <WebView
          source={{ uri: getDiditKYCUrl() }}
          style={styles.webView}
          onMessage={handleWebViewMessage}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading verification...</Text>
            </View>
          )}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🔒</Text>
        </View>

        <Text style={styles.title}>Complete KYC Verification</Text>
        <Text style={styles.description}>
          To ensure the safety and security of all users, we require identity verification.
        </Text>

        <View style={styles.benefitsContainer}>
          <Text style={styles.benefitsTitle}>What you&apos;ll need:</Text>
          <View style={styles.benefitItem}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.benefitText}>Valid government-issued ID (Aadhaar, Passport, or Driver&apos;s License)</Text>
          </View>
          <View style={styles.benefitItem}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.benefitText}>Clear selfie photo</Text>
          </View>
          <View style={styles.benefitItem}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.benefitText}>5-10 minutes of your time</Text>
          </View>
        </View>

        <View style={styles.securityNote}>
          <Text style={styles.securityIcon}>🔐</Text>
          <Text style={styles.securityText}>
            Your data is encrypted and securely processed by Didit, our trusted verification partner.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={() => setShowDiditWebView(true)}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Start Verification</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleSkip}
          disabled={isLoading}
        >
          <Text style={styles.secondaryButtonText}>Skip for Now</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          You can complete this verification later from your account settings.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#333',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
    lineHeight: 24,
  },
  benefitsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  checkmark: {
    fontSize: 18,
    color: '#4CAF50',
    marginRight: 12,
    marginTop: 2,
  },
  benefitText: {
    flex: 1,
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 16,
    marginBottom: 32,
  },
  securityIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  securityText: {
    flex: 1,
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 17,
    fontWeight: '600',
  },
  footer: {
    textAlign: 'center',
    fontSize: 13,
    color: '#999',
    marginTop: 16,
    lineHeight: 20,
  },
  webView: {
    flex: 1,
  },
  webViewHeader: {
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  backButton: {
    paddingVertical: 5,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  webViewTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
    marginTop: 5,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
});
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
import { useTheme } from '@/contexts/ThemeContext';
import { WebView } from 'react-native-webview';
import { api } from '@/utils/api';
import { Colors } from '@/constants/theme';

export default function KYCVerificationScreen() {
  const router = useRouter();
  const { user, markKycPromptShown } = useAuth();
  const { isDarkMode } = useTheme();
  const colors = Colors[isDarkMode ? 'dark' : 'light'];
  const [isLoading, setIsLoading] = useState(false);
  const [showDiditWebView, setShowDiditWebView] = useState(false);
  const [verificationUrl, setVerificationUrl] = useState<string>('');
  const currentKycStatus = user?.KycStatus || user?.KycData?.status || 'not_started';

  // Create Didit verification session via backend
  async function createVerificationSession() {
    // Only prevent if already approved
    if (user?.IsKycVerified) {
      Alert.alert(
        'Already Verified',
        'Your identity has already been verified.'
      );
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.createKycSession();
      
      if (!response.verificationUrl) {
        throw new Error('No verification URL received');
      }
      
      setVerificationUrl(response.verificationUrl);
      setShowDiditWebView(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start verification');
    } finally {
      setIsLoading(false);
    }
  }

  function handleNavigationStateChange(navState: any) {
    const { url } = navState;
    
    // Check if this is the callback URL
    if (url && url.includes('kyc-callback')) {
      // Redirect immediately without alert
      markKycPromptShown();
      router.replace('/(tabs)');
      
      // Show alert after navigation
      setTimeout(() => {
        Alert.alert(
          'KYC Submitted',
          'Your verification has been submitted successfully. Once verified, you can use all app features. Check your account for verification status.',
          [{ text: 'OK' }]
        );
      }, 500);
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
          onPress: () => {
            markKycPromptShown();
            router.replace('/(tabs)');
          },
        },
      ]
    );
  }

  if (showDiditWebView) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.webViewHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setShowDiditWebView(false)}
            disabled={isLoading}
          >
            <Text style={[styles.backButtonText, { color: colors.tint }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.webViewTitle, { color: colors.text }]}>KYC Verification</Text>
        </View>
        <WebView
          source={{ uri: verificationUrl }}
          style={styles.webView}
          userAgent="Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback={true}
          domStorageEnabled={true}
          androidHardwareAccelerationDisabled={false}
          androidLayerType="hardware"
          javaScriptEnabled={true}
          onNavigationStateChange={handleNavigationStateChange}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={[styles.loadingContainer, { backgroundColor: colors.backgroundSecondary }]}>
              <ActivityIndicator size="large" color={colors.tint} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading verification...</Text>
            </View>
          )}
        />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.backgroundSecondary }]} contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🔒</Text>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Complete KYC Verification</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          To ensure the safety and security of all users, we require identity verification.
        </Text>

        <View style={[styles.benefitsContainer, { backgroundColor: colors.card }]}>
          <Text style={[styles.benefitsTitle, { color: colors.text }]}>What you&apos;ll need:</Text>
          <View style={styles.benefitItem}>
            <Text style={[styles.checkmark, { color: colors.success }]}>✓</Text>
            <Text style={[styles.benefitText, { color: colors.textSecondary }]}>Valid government-issued ID (Aadhaar, Passport, or Driver&apos;s License)</Text>
          </View>
          <View style={styles.benefitItem}>
            <Text style={[styles.checkmark, { color: colors.success }]}>✓</Text>
            <Text style={[styles.benefitText, { color: colors.textSecondary }]}>Clear selfie photo</Text>
          </View>
          <View style={styles.benefitItem}>
            <Text style={[styles.checkmark, { color: colors.success }]}>✓</Text>
            <Text style={[styles.benefitText, { color: colors.textSecondary }]}>5-10 minutes of your time</Text>
          </View>
        </View>

        <View style={[styles.securityNote, { backgroundColor: colors.info + '22' }]}>
          <Text style={styles.securityIcon}>🔐</Text>
          <Text style={[styles.securityText, { color: colors.info }]}>
            Your data is encrypted and securely processed by Didit, our trusted verification partner.
          </Text>
        </View>

        {!user?.IsKycVerified && currentKycStatus !== 'not_started' && currentKycStatus !== 'approved' && (
          <View style={[styles.pendingNote, { backgroundColor: colors.info + '22', borderColor: colors.info }]}>
            <Text style={[styles.pendingTitle, { color: colors.info }]}>Current Status: {currentKycStatus.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</Text>
            <Text style={[styles.pendingText, { color: colors.info }]}>
              You can start a new verification anytime. Your latest submission will be used.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, styles.primaryButton, { backgroundColor: colors.tint }]}
          onPress={createVerificationSession}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Start Verification</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={handleSkip}
          disabled={isLoading}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>Skip for Now</Text>
        </TouchableOpacity>

        <Text style={[styles.footer, { color: colors.textSecondary }]}>
          You can complete this verification later from your account settings.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  benefitsContainer: {
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
    fontFamily: 'Inter-SemiBold',
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  checkmark: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    marginRight: 12,
    marginTop: 2,
  },
  benefitText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 16,
    marginBottom: 32,
  },
  securityIcon: {
    fontSize: 24,
    fontFamily: 'Inter-Regular',
    marginRight: 12,
  },
  securityText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  pendingNote: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  pendingTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 6,
  },
  pendingText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    shadowColor: '#e86713',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  secondaryButton: {
    borderWidth: 1,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
  },
  secondaryButtonText: {
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
  },
  footer: {
    textAlign: 'center',
    fontSize: 13,
    fontFamily: 'Inter-Regular',
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
    borderBottomWidth: 1,
  },
  backButton: {
    paddingVertical: 5,
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  webViewTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
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
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
});

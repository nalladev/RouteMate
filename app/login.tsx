import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Colors } from '@/constants/theme';

type AuthMode = 'login' | 'phone-email-login' | 'phone-email-signup' | 'signup-password';

// Common country codes for India-focused app
const COUNTRY_CODES = [
  { code: '+91', country: 'India' },
  { code: '+1', country: 'USA/Canada' },
  { code: '+44', country: 'UK' },
  { code: '+971', country: 'UAE' },
  { code: '+65', country: 'Singapore' },
];

// Helper to get the correct API base URL
function getApiBaseUrl(): string {
  // Check if we should use production URL
  const isProduction = process.env.NODE_ENV === 'production' || !!process.env.EXPO_PUBLIC_USE_PRODUCTION;
  const productionUrl = Constants.expoConfig?.extra?.productionAppUrl || 'https://www.routemate.tech';
  
  if (isProduction) {
    return productionUrl;
  }

  // For local development - use relative URLs (empty string) to hit the local dev server
  return '';
}

export default function LoginScreen() {
  const router = useRouter();
  const { login, otpLogin, signup, isAuthenticated, user, isLoading: authLoading } = useAuth();
  const { isDarkMode } = useTheme();
  const colors = Colors[isDarkMode ? 'dark' : 'light'];

  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [countryCode, setCountryCode] = useState('+91');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [phoneEmailToken, setPhoneEmailToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const webViewRef = useRef<WebView>(null);

  // Get CLIENT_ID from environment variable
  const CLIENT_ID = Constants.expoConfig?.extra?.phoneEmailClientId || '';
  const API_BASE_URL = getApiBaseUrl();

  React.useEffect(() => {
    if (isAuthenticated && user) {
      // Check KYC status and redirect accordingly
      if (!user.IsKycVerified) {
        router.replace('/kyc-verification' as any);
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [isAuthenticated, user, router]);

  // Show loading screen while checking authentication or while authenticated (during redirect)
  if (authLoading || isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
        <View style={styles.authLoadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.authLoadingText, { color: colors.textSecondary }]}>Loading...</Text>
        </View>
      </View>
    );
  }

  async function handleLogin() {
    if (!mobile || !password) {
      Alert.alert('Error', 'Please enter mobile and password');
      return;
    }

    setIsLoading(true);
    try {
      // Combine country code with mobile number
      const fullMobile = countryCode + mobile;
      await login(fullMobile, password);

      // Check KYC status after login
      const { user: loggedInUser } = await fetch(`${API_BASE_URL}/api/user/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await AsyncStorage.getItem('authToken')}`,
        },
      }).then(res => res.json());

      if (!loggedInUser.IsKycVerified) {
        router.replace('/kyc-verification' as any);
      } else {
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePhoneEmailLogin(jwt: string) {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/otp-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          otpToken: jwt,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Check if user exists
      if (data.userExists === false) {
        // User doesn't exist - transition to signup password entry
        setPhoneEmailToken(jwt);
        setAuthMode('signup-password');
        setIsLoading(false);
        return;
      }

      // User exists - complete login using otpLogin from AuthContext
      await otpLogin(jwt);

      // Check KYC status after login
      if (!data.user.IsKycVerified) {
        router.replace('/kyc-verification' as any);
      } else {
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Authentication failed');
      setAuthMode('login');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignupWithPassword() {
    if (!password) {
      Alert.alert('Error', 'Please create a password');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      // Use signup method from AuthContext which handles the API call and state
      await signup(phoneEmailToken, password);

      // New users always need to complete KYC (IsKycVerified is false on signup)
      router.replace('/kyc-verification' as any);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Signup failed');
      setAuthMode('login');
      setPhoneEmailToken('');
    } finally {
      setIsLoading(false);
    }
  }

  function handleWebViewMessage(event: any) {
    const jwt = event.nativeEvent.data;

    if (jwt && jwt.length > 0) {
      // Both login and signup use the same unified flow
      // Backend will determine if user exists and frontend will handle accordingly
      handlePhoneEmailLogin(jwt);
    }
  }

  function switchToPhoneEmailLogin() {
    setAuthMode('phone-email-login');
    setPassword('');
  }

  function switchToPhoneEmailSignup() {
    setAuthMode('phone-email-signup');
    setPassword('');
    setPhoneEmailToken('');
  }

  function switchToPasswordLogin() {
    setAuthMode('login');
    setPassword('');
    setPhoneEmailToken('');
  }

  // Phone.email WebView URL
  const getPhoneEmailUrl = () => {
    const deviceId = Constants.sessionId || Constants.deviceId || 'unknown-device';
    return `https://auth.phone.email/log-in?client_id=${CLIENT_ID}&auth_type=4&device=${deviceId}`;
  };

  // Render WebView for phone.email authentication
  if (authMode === 'phone-email-login' || authMode === 'phone-email-signup') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.webViewHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={switchToPasswordLogin}
          >
            <Text style={[styles.backButtonText, { color: colors.tint }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.webViewTitle, { color: colors.text }]}>
            {authMode === 'phone-email-login' ? 'Login with Phone' : 'Sign Up with Phone'}
          </Text>
        </View>
        <WebView
          ref={webViewRef}
          source={{ uri: getPhoneEmailUrl() }}
          style={styles.webView}
          onMessage={handleWebViewMessage}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={[styles.loadingContainer, { backgroundColor: colors.backgroundSecondary }]}>
              <ActivityIndicator size="large" color={colors.tint} />
            </View>
          )}
        />
      </View>
    );
  }

  // Render password entry screen after phone verification for new users
  if (authMode === 'signup-password') {
    return (
      <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>Welcome!</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Create a password to complete your account setup</Text>

          <View style={styles.form}>
            <PasswordInput
              value={password}
              onChangeText={setPassword}
              placeholder="Create Password (min 6 characters)"
              editable={!isLoading}
              autoFocus
            />

            <TouchableOpacity
              style={[styles.button, styles.primaryButton, { backgroundColor: colors.tint }]}
              onPress={handleSignupWithPassword}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Complete Signup</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={switchToPasswordLogin}
              disabled={isLoading}
            >
              <Text style={[styles.linkText, { color: colors.tint }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Default login screen
  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>RouteMate</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Your ride-sharing companion</Text>

          <View style={styles.form}>
            {/* Mobile Number with Country Code */}
            <View style={styles.phoneInputContainer}>
              <TouchableOpacity
                style={[styles.countryCodeButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setShowCountryPicker(!showCountryPicker)}
                disabled={isLoading}
              >
                <Text style={[styles.countryCodeText, { color: colors.text }]}>{countryCode}</Text>
                <Text style={[styles.dropdownArrow, { color: colors.textSecondary }]}>▼</Text>
              </TouchableOpacity>

              <TextInput
                style={[styles.phoneInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                placeholder="Mobile Number"
                placeholderTextColor={colors.textSecondary}
                value={mobile}
                onChangeText={setMobile}
                keyboardType="phone-pad"
                autoCapitalize="none"
                editable={!isLoading}
                returnKeyType="next"
              />
            </View>

            {/* Country Code Picker */}
            {showCountryPicker && (
              <View style={[styles.countryPicker, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {COUNTRY_CODES.map((item) => (
                  <TouchableOpacity
                    key={item.code}
                    style={[
                      styles.countryOption,
                      { borderBottomColor: colors.border },
                      countryCode === item.code && { backgroundColor: colors.tint + '22' },
                    ]}
                    onPress={() => {
                      setCountryCode(item.code);
                      setShowCountryPicker(false);
                    }}
                  >
                    <Text style={[styles.countryCodeText, { color: colors.text }]}>{item.code}</Text>
                    <Text style={[styles.countryNameText, { color: colors.textSecondary }]}>{item.country}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <PasswordInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              editable={!isLoading}
              onSubmitEditing={handleLogin}
            />

            <TouchableOpacity
              style={[styles.button, styles.primaryButton, { backgroundColor: colors.tint }]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Login</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton, { backgroundColor: colors.card, borderColor: colors.tint }]}
              onPress={switchToPhoneEmailLogin}
              disabled={isLoading}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.tint }]}>Login with OTP</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={switchToPhoneEmailSignup}
              disabled={isLoading}
            >
              <Text style={[styles.linkText, { color: colors.tint }]}>Don&apos;t have an account? Sign Up with OTP</Text>
            </TouchableOpacity>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 36,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 40,
  },
  form: {
    width: '100%',
  },
  input: {
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    borderWidth: 1,
  },
  button: {
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButton: {
  },
  secondaryButton: {
    borderWidth: 1,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  linkButton: {
    marginTop: 10,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
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
  phoneInputContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 0,
  },
  countryCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 15,
    borderWidth: 1,
    minWidth: 60,
  },
  countryCodeText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  dropdownArrow: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    marginLeft: 5,
  },
  phoneInput: {
    flex: 1,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    padding: 15,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    borderWidth: 1,
  },
  countryPicker: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 15,
    overflow: 'hidden',
  },
  countryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
  },
  countryOptionSelected: {
  },
  countryNameText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  authLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authLoadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
});

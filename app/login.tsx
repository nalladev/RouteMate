import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';

type AuthMode = 'login' | 'phone-email-login' | 'phone-email-signup' | 'signup-password';

// Helper to get the correct API base URL
function getApiBaseUrl(): string {
  // If EXPO_PUBLIC_API_URL is set, use it
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  // For development with tunnel or local network
  // Expo Router API routes are served from the same origin
  // Use relative URLs (empty string) to hit the same server
  return '';
}

export default function LoginScreen() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [phoneEmailToken, setPhoneEmailToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const webViewRef = useRef<WebView>(null);

  // Get CLIENT_ID from environment variable
  const CLIENT_ID = process.env.EXPO_PUBLIC_PHONE_EMAIL_CLIENT_ID || '';
  const API_BASE_URL = getApiBaseUrl();

  React.useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, router]);

  async function handleLogin() {
    if (!mobile || !password) {
      Alert.alert('Error', 'Please enter mobile and password');
      return;
    }

    setIsLoading(true);
    try {
      await login(mobile, password);
      router.replace('/(tabs)');
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

      // User exists - complete login
      await login(data.user.Mobile, data.token);
      router.replace('/(tabs)');
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
      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          otpToken: phoneEmailToken,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      // Store token and navigate
      await login(data.user.Mobile, data.token);
      router.replace('/(tabs)');
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
      <View style={styles.container}>
        <View style={styles.webViewHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={switchToPasswordLogin}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.webViewTitle}>
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
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          )}
        />
      </View>
    );
  }

  // Render password entry screen after phone verification for new users
  if (authMode === 'signup-password') {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Welcome!</Text>
          <Text style={styles.subtitle}>Create a password to complete your account setup</Text>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Create Password (min 6 characters)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!isLoading}
              autoFocus
            />

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
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
              <Text style={styles.linkText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Default login screen
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>RouteMate</Text>
        <Text style={styles.subtitle}>Your ride-sharing companion</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Mobile Number"
            value={mobile}
            onChangeText={setMobile}
            keyboardType="phone-pad"
            autoCapitalize="none"
            editable={!isLoading}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isLoading}
          />

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
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
            style={[styles.button, styles.secondaryButton]}
            onPress={switchToPhoneEmailLogin}
            disabled={isLoading}
          >
            <Text style={styles.secondaryButtonText}>Login with OTP</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={switchToPhoneEmailSignup}
            disabled={isLoading}
          >
            <Text style={styles.linkText}>Don&apos;t have an account? Sign Up with OTP</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 10,
    alignItems: 'center',
  },
  linkText: {
    color: '#007AFF',
    fontSize: 14,
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
});
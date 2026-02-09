import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

type AuthMode = 'login' | 'otp-login' | 'otp-signup';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  async function handleSendOtp() {
    if (!mobile) {
      Alert.alert('Error', 'Please enter your mobile number');
      return;
    }

    setIsLoading(true);
    try {
      // Send OTP via phone.email API
      const response = await fetch('https://api.phone.email/v1/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: mobile,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send OTP');
      }

      const data = await response.json();
      setOtpToken(data.token || '');
      setOtpSent(true);
      Alert.alert('Success', 'OTP sent to your mobile number');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerifyOtpLogin() {
    if (!otp) {
      Alert.alert('Error', 'Please enter the OTP');
      return;
    }

    setIsLoading(true);
    try {
      // Verify OTP and login
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || ''}/api/auth/otp-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          otpToken: `${otpToken}:${otp}`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid OTP');
      }

      // Store token and navigate
      await login(mobile, data.token);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'OTP verification failed');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerifyOtpSignup() {
    if (!otp || !password) {
      Alert.alert('Error', 'Please enter OTP and create a password');
      return;
    }

    setIsLoading(true);
    try {
      // Verify OTP and signup
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || ''}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          otpToken: `${otpToken}:${otp}`,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      // Store token and navigate
      await login(mobile, data.token);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  }

  function resetOtpFlow() {
    setOtpSent(false);
    setOtp('');
    setOtpToken('');
    setPassword('');
  }

  function switchToOtpLogin() {
    setAuthMode('otp-login');
    resetOtpFlow();
  }

  function switchToOtpSignup() {
    setAuthMode('otp-signup');
    resetOtpFlow();
  }

  function switchToPasswordLogin() {
    setAuthMode('login');
    resetOtpFlow();
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>RouteMate</Text>
        <Text style={styles.subtitle}>Your ride-sharing companion</Text>

        <View style={styles.form}>
          {authMode === 'login' && (
            <>
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
                onPress={switchToOtpLogin}
                disabled={isLoading}
              >
                <Text style={styles.secondaryButtonText}>Login with OTP</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={switchToOtpSignup}
                disabled={isLoading}
              >
                <Text style={styles.linkText}>Don&apos;t have an account? Sign Up</Text>
              </TouchableOpacity>
            </>
          )}

          {authMode === 'otp-login' && (
            <>
              <Text style={styles.modeTitle}>Login with OTP</Text>
              
              {!otpSent ? (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Mobile Number"
                    value={mobile}
                    onChangeText={setMobile}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    editable={!isLoading}
                  />

                  <TouchableOpacity
                    style={[styles.button, styles.primaryButton]}
                    onPress={handleSendOtp}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>Send OTP</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.infoText}>OTP sent to {mobile}</Text>
                  
                  <TextInput
                    style={styles.input}
                    placeholder="Enter OTP"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!isLoading}
                  />

                  <TouchableOpacity
                    style={[styles.button, styles.primaryButton]}
                    onPress={handleVerifyOtpLogin}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>Verify & Login</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.linkButton}
                    onPress={resetOtpFlow}
                    disabled={isLoading}
                  >
                    <Text style={styles.linkText}>Resend OTP</Text>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity
                style={styles.linkButton}
                onPress={switchToPasswordLogin}
                disabled={isLoading}
              >
                <Text style={styles.linkText}>Back to Password Login</Text>
              </TouchableOpacity>
            </>
          )}

          {authMode === 'otp-signup' && (
            <>
              <Text style={styles.modeTitle}>Sign Up with OTP</Text>
              
              {!otpSent ? (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Mobile Number"
                    value={mobile}
                    onChangeText={setMobile}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    editable={!isLoading}
                  />

                  <TouchableOpacity
                    style={[styles.button, styles.primaryButton]}
                    onPress={handleSendOtp}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>Send OTP</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.infoText}>OTP sent to {mobile}</Text>
                  
                  <TextInput
                    style={styles.input}
                    placeholder="Enter OTP"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!isLoading}
                  />

                  <TextInput
                    style={styles.input}
                    placeholder="Create Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    editable={!isLoading}
                  />

                  <TouchableOpacity
                    style={[styles.button, styles.primaryButton]}
                    onPress={handleVerifyOtpSignup}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>Verify & Sign Up</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.linkButton}
                    onPress={resetOtpFlow}
                    disabled={isLoading}
                  >
                    <Text style={styles.linkText}>Resend OTP</Text>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity
                style={styles.linkButton}
                onPress={switchToPasswordLogin}
                disabled={isLoading}
              >
                <Text style={styles.linkText}>Already have an account? Login</Text>
              </TouchableOpacity>
            </>
          )}
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
  modeTitle: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
    color: '#666',
  },
});
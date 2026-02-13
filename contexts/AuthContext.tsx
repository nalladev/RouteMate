import React, { createContext, useState, useContext, useEffect, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { api, setAuthToken, clearAuthToken } from '../utils/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  shouldShowKycPrompt: boolean;
  markKycPromptShown: () => void;
  login: (mobile: string, password: string) => Promise<void>;
  otpLogin: (otpToken: string) => Promise<void>;
  signup: (otpToken: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [shouldShowKycPrompt, setShouldShowKycPrompt] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        const { user } = await api.getMe();
        setUser(user);
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      await clearAuthToken();
    } finally {
      setIsLoading(false);
    }
  }

  async function login(mobile: string, password: string) {
    console.log('[AuthContext] Login called for:', mobile);
    const { token, user } = await api.login(mobile, password);
    console.log('[AuthContext] Login API response received, user:', user);
    await setAuthToken(token);
    console.log('[AuthContext] Auth token saved, setting user state');
    setUser(user);
    setShouldShowKycPrompt(!user.IsKycVerified);
    console.log('[AuthContext] User state updated, IsKycVerified:', user.IsKycVerified);
  }

  async function otpLogin(otpToken: string) {
    console.log('[AuthContext] OTP Login called');
    const { token, user } = await api.otpLogin(otpToken);
    console.log('[AuthContext] OTP Login API response received, user:', user);
    await setAuthToken(token);
    setUser(user);
    setShouldShowKycPrompt(!user.IsKycVerified);
    console.log('[AuthContext] User state updated after OTP login, IsKycVerified:', user.IsKycVerified);
  }

  async function signup(otpToken: string, password: string) {
    console.log('[AuthContext] Signup called');
    const { token, user } = await api.signup(otpToken, password);
    console.log('[AuthContext] Signup API response received, user:', user);
    await setAuthToken(token);
    setUser(user);
    setShouldShowKycPrompt(!user.IsKycVerified);
    console.log('[AuthContext] User state updated after signup, IsKycVerified:', user.IsKycVerified);
  }

  async function logout() {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await clearAuthToken();
      setUser(null);
      setShouldShowKycPrompt(false);
    }
  }

  async function refreshUser() {
    try {
      const { user } = await api.getMe();
      setUser(user);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }

  function markKycPromptShown() {
    setShouldShowKycPrompt(false);
  }

  const contextValue = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      shouldShowKycPrompt,
      markKycPromptShown,
      login,
      otpLogin,
      signup,
      logout,
      refreshUser,
    }),
    [user, isLoading, shouldShowKycPrompt]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
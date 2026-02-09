import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { api, setAuthToken, clearAuthToken } from '../utils/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
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
    const { token, user } = await api.login(mobile, password);
    await setAuthToken(token);
    setUser(user);
  }

  async function otpLogin(otpToken: string) {
    const { token, user } = await api.otpLogin(otpToken);
    await setAuthToken(token);
    setUser(user);
  }

  async function signup(otpToken: string, password: string) {
    const { token, user } = await api.signup(otpToken, password);
    await setAuthToken(token);
    setUser(user);
  }

  async function logout() {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await clearAuthToken();
      setUser(null);
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

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        otpLogin,
        signup,
        logout,
        refreshUser,
      }}
    >
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
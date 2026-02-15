import React, { createContext, useState, useContext, useEffect, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme as useSystemColorScheme } from 'react-native';

type ColorScheme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  colorScheme: ColorScheme;
  isDarkMode: boolean;
  setColorScheme: (scheme: ColorScheme) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'app_color_scheme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useSystemColorScheme();
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>('system');

  useEffect(() => {
    loadColorScheme();
  }, []);

  async function loadColorScheme() {
    try {
      const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (saved && (saved === 'light' || saved === 'dark' || saved === 'system')) {
        setColorSchemeState(saved as ColorScheme);
      }
    } catch (error) {
      console.error('Failed to load color scheme:', error);
    }
  }

  async function setColorScheme(scheme: ColorScheme) {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, scheme);
      setColorSchemeState(scheme);
    } catch (error) {
      console.error('Failed to save color scheme:', error);
    }
  }

  const isDarkMode = useMemo(() => {
    if (colorScheme === 'system') {
      return systemColorScheme === 'dark';
    }
    return colorScheme === 'dark';
  }, [colorScheme, systemColorScheme]);

  const contextValue = useMemo(
    () => ({
      colorScheme,
      isDarkMode,
      setColorScheme,
    }),
    [colorScheme, isDarkMode]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
import { useTheme } from '@/contexts/ThemeContext';

export function useColorScheme() {
  const { isDarkMode } = useTheme();
  return isDarkMode ? 'dark' : 'light';
}
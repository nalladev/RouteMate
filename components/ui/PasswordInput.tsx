import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { Colors } from '@/constants/theme';

interface PasswordInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  editable?: boolean;
  autoFocus?: boolean;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  onSubmitEditing?: () => void;
}

export function PasswordInput({
  value,
  onChangeText,
  placeholder = 'Password',
  editable = true,
  autoFocus = false,
  containerStyle,
  inputStyle,
  onSubmitEditing,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const { isDarkMode } = useTheme();
  const colors = Colors[isDarkMode ? 'dark' : 'light'];

  return (
    <View style={[styles.passwordContainer, { backgroundColor: colors.card, borderColor: colors.border }, containerStyle]}>
      <TextInput
        style={[styles.passwordInput, { color: colors.text }, inputStyle]}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!showPassword}
        editable={editable}
        autoFocus={autoFocus}
        onSubmitEditing={onSubmitEditing}
        returnKeyType="go"
      />
      <TouchableOpacity
        style={styles.eyeButton}
        onPress={() => setShowPassword(!showPassword)}
        disabled={!editable}
      >
        <MaterialIcons
          name={showPassword ? 'visibility' : 'visibility-off'}
          size={24}
          color={colors.textSecondary}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
  },
  eyeButton: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
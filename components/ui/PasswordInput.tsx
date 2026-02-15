import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

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

  return (
    <View style={[styles.passwordContainer, containerStyle]}>
      <TextInput
        style={[styles.passwordInput, inputStyle]}
        placeholder={placeholder}
        placeholderTextColor="#999"
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
          color="#666"
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#333',
  },
  eyeButton: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
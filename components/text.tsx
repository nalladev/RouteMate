import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';

/**
 * Custom Text component that uses Inter font by default
 * This wraps React Native's Text component and applies Inter font family
 */
export function Text(props: TextProps) {
  const { style, ...rest } = props;
  
  // Merge the default Inter font with any custom styles
  return <RNText style={[styles.defaultText, style]} {...rest} />;
}

const styles = StyleSheet.create({
  defaultText: {
    fontFamily: 'Inter-Regular',
  },
});
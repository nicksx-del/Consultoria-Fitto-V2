import React, { useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  helperText?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

export function TextField({
  label,
  error,
  helperText,
  containerStyle,
  inputStyle,
  accessibilityLabel,
  onFocus,
  onBlur,
  ...restProps
}: TextFieldProps) {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const getBorderColor = (): string => {
    if (error) {
      return theme.colors.danger;
    }
    if (isFocused) {
      return theme.colors.accent;
    }
    return theme.colors.border;
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text
          variant="caption"
          style={{
            marginBottom: theme.spacing.xs,
            fontFamily: theme.fontFamily.semiBold,
            color: error ? theme.colors.danger : theme.colors.textMuted,
          }}
        >
          {label}
        </Text>
      ) : null}

      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: theme.colors.surface,
            borderColor: getBorderColor(),
            borderRadius: theme.radius.md,
            paddingHorizontal: theme.spacing.md,
          },
        ]}
      >
        <TextInput
          accessibilityLabel={accessibilityLabel || label}
          placeholderTextColor={theme.colors.textMuted}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            {
              color: theme.colors.text,
              fontSize: theme.fontSize.md,
              fontFamily: theme.fontFamily.regular,
            },
            inputStyle,
          ]}
          {...restProps}
        />
      </View>

      {error ? (
        <Text variant="caption" color={theme.colors.danger} style={{ marginTop: theme.spacing.xs }}>
          {error}
        </Text>
      ) : helperText ? (
        <Text
          variant="caption"
          color={theme.colors.textMuted}
          style={{ marginTop: theme.spacing.xs }}
        >
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputWrapper: {
    height: 52,
    borderWidth: 1,
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    paddingVertical: 0,
  },
});

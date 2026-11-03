import React, { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
  Pressable,
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
  const [passwordVisible, setPasswordVisible] = useState(false);

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
          restProps.multiline && { height: 110 },
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
          secureTextEntry={!!restProps.secureTextEntry && !passwordVisible}
        />
        {restProps.secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${passwordVisible ? 'Ocultar' : 'Mostrar'} senha${label ? `: ${label}` : ''}`}
            accessibilityState={{ disabled: restProps.editable === false }}
            disabled={restProps.editable === false}
            onPress={() => setPasswordVisible((current) => !current)}
            style={{ width: 44, height: 48, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons
              name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={theme.colors.textMuted}
            />
          </Pressable>
        ) : null}
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
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1,
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    paddingVertical: 0,
  },
});

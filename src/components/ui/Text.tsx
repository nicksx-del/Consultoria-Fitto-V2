import React from 'react';
import { Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';

import { useTheme } from '@/theme';

export type TextVariant =
  'heading' | 'title' | 'body' | 'bodyMuted' | 'caption' | 'button' | 'link';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: string;
  align?: TextStyle['textAlign'];
}

export function Text({ variant = 'body', color, align, style, children, ...restProps }: TextProps) {
  const { theme } = useTheme();

  const variantStyles: Record<TextVariant, TextStyle> = {
    heading: {
      fontSize: theme.fontSize.xxl,
      fontFamily: theme.fontFamily.extraBold,
      color: theme.colors.text,
      lineHeight: theme.fontSize.xxl * 1.25,
    },
    title: {
      fontSize: theme.fontSize.lg,
      fontFamily: theme.fontFamily.semiBold,
      color: theme.colors.text,
      lineHeight: theme.fontSize.lg * 1.3,
    },
    body: {
      fontSize: theme.fontSize.md,
      fontFamily: theme.fontFamily.regular,
      color: theme.colors.text,
      lineHeight: theme.fontSize.md * 1.4,
    },
    bodyMuted: {
      fontSize: theme.fontSize.md,
      fontFamily: theme.fontFamily.regular,
      color: theme.colors.textMuted,
      lineHeight: theme.fontSize.md * 1.4,
    },
    caption: {
      fontSize: theme.fontSize.sm,
      fontFamily: theme.fontFamily.regular,
      color: theme.colors.textMuted,
      lineHeight: theme.fontSize.sm * 1.4,
    },
    button: {
      fontSize: theme.fontSize.md,
      fontFamily: theme.fontFamily.semiBold,
      color: theme.colors.onAccent,
    },
    link: {
      fontSize: theme.fontSize.sm,
      fontFamily: theme.fontFamily.semiBold,
      color: theme.colors.accent,
    },
  };

  return (
    <RNText
      style={[
        variantStyles[variant],
        color ? { color } : undefined,
        align ? { textAlign: align } : undefined,
        style,
      ]}
      {...restProps}
    >
      {children}
    </RNText>
  );
}

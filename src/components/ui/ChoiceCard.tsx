import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

export interface ChoiceCardProps {
  title: string;
  description: string;
  selected?: boolean;
  onPress: () => void;
  icon?: React.ReactNode;
  badge?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function ChoiceCard({
  title,
  description,
  selected = false,
  onPress,
  icon,
  badge,
  accessibilityLabel,
  style,
}: ChoiceCardProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || `${title}, ${description}`}
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: selected ? theme.colors.accent : theme.colors.border,
          borderRadius: theme.radius.md,
          padding: theme.spacing.lg,
        },
        pressed && styles.pressed,
        style,
      ]}
    >
      <View style={styles.headerRow}>
        {icon ? (
          <View style={[styles.iconContainer, { marginRight: theme.spacing.md }]}>{icon}</View>
        ) : null}

        <View style={styles.textContainer}>
          <Text
            variant="title"
            style={{
              marginBottom: theme.spacing.xs,
              color: selected ? theme.colors.accent : theme.colors.text,
            }}
          >
            {title}
          </Text>
          <Text variant="bodyMuted">{description}</Text>
        </View>

        {badge ? (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.sm,
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: theme.spacing.xs,
              },
            ]}
          >
            <Text variant="caption">{badge}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  badge: {
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  pressed: {
    opacity: 0.9,
  },
});

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Screen, Text } from '@/components/ui';

export function FormScreen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <Screen scrollable contentContainerStyle={styles.screen}>
      <View style={styles.form}>
        <Text variant="link" style={{ letterSpacing: 4 }}>
          FITTO
        </Text>
        <View style={{ gap: 8, marginTop: 20, marginBottom: 24 }}>
          <Text variant="heading">{title}</Text>
          <Text variant="bodyMuted">{subtitle}</Text>
        </View>
        <View style={{ gap: 16 }}>{children}</View>
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  screen: { paddingTop: 28, paddingBottom: 32, justifyContent: 'center' },
  form: { width: '100%', maxWidth: 480, alignSelf: 'center' },
});

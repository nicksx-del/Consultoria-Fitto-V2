import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Screen, Text, TextField } from '@/components/ui';
import { useTheme } from '@/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleBack = () => {
    router.back();
  };

  const handleForgotPassword = () => {
    // TODO: Implementar recuperação de senha nas próximas branches
  };

  const handleLogin = () => {
    // TODO: Implementar autenticação via Supabase nas próximas branches
  };

  const handleNavigateToRegister = () => {
    router.replace('/');
  };

  return (
    <Screen scrollable contentContainerStyle={styles.screenContent}>
      <View>
        <Pressable
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Voltar para tela inicial"
          style={[
            styles.backButton,
            {
              paddingVertical: theme.spacing.sm,
              marginBottom: theme.spacing.md,
            },
          ]}
        >
          <Text variant="caption">← Voltar</Text>
        </Pressable>

        <View style={{ marginBottom: theme.spacing.xl }}>
          <Text variant="heading" style={{ marginBottom: theme.spacing.xs }}>
            Entrar
          </Text>
          <Text variant="bodyMuted">Acesse sua conta para continuar no Fitto.</Text>
        </View>

        <View style={{ rowGap: theme.spacing.md }}>
          <TextField
            label="E-mail"
            placeholder="seu@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Campo de e-mail"
          />

          <TextField
            label="Senha"
            placeholder="Digite sua senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            accessibilityLabel="Campo de senha"
          />

          <Pressable
            onPress={handleForgotPassword}
            accessibilityRole="button"
            accessibilityLabel="Esqueci minha senha"
            style={[styles.forgotPasswordButton, { marginTop: theme.spacing.xs }]}
          >
            <Text variant="link">Esqueci minha senha</Text>
          </Pressable>
        </View>

        <View style={{ marginTop: theme.spacing.xl }}>
          <Button title="Entrar" onPress={handleLogin} accessibilityLabel="Entrar no aplicativo" />
        </View>
      </View>

      <View
        style={[styles.footer, { marginTop: theme.spacing.xl, marginBottom: theme.spacing.md }]}
      >
        <Pressable
          onPress={handleNavigateToRegister}
          accessibilityRole="button"
          accessibilityLabel="Não tem uma conta? Criar conta"
          style={{
            paddingVertical: theme.spacing.sm,
            paddingHorizontal: theme.spacing.md,
          }}
        >
          <Text variant="bodyMuted">
            Não tem uma conta? · <Text variant="link">Criar conta</Text>
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    justifyContent: 'space-between',
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
  },
  footer: {
    width: '100%',
    alignItems: 'center',
  },
});

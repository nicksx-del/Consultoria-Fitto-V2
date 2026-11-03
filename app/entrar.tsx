import { Redirect, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Button, Text, TextField } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthContext';
import { FormScreen } from '@/features/auth/FormScreen';
import { authError, supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const { session, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!loading && session) return <Redirect href="/contas" />;
  async function login() {
    if (busy) return;
    if (!/^\S+@\S+\.\S+$/.test(email.trim()) || !password) {
      setError('Informe um e-mail válido e sua senha.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      router.replace('/contas');
    } catch (e) {
      setError(authError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <FormScreen title="Bem-vindo de volta" subtitle="Entre para acessar seus perfis no Fitto.">
      <TextField
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        maxLength={254}
      />
      <TextField
        label="Senha"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        onSubmitEditing={login}
      />
      {error ? (
        <Text accessibilityRole="alert" color="#FF6B5A">
          {error}
        </Text>
      ) : null}
      <Button title="Entrar" loading={busy || loading} onPress={login} />
      <Button
        title="Esqueci minha senha"
        variant="ghost"
        onPress={() => router.push('/recuperar')}
      />
      <Button title="Criar uma conta" variant="outline" onPress={() => router.push('/cadastro')} />
    </FormScreen>
  );
}

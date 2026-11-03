import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { Button, Text, TextField } from '@/components/ui';
import { FormScreen } from '@/features/auth/FormScreen';
import { useAuth } from '@/features/auth/AuthContext';
import { authError, supabase } from '@/lib/supabase';
export default function NewPasswordScreen() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save() {
    if (busy) return;
    if (password.length < 8 || password !== confirmation) {
      setError('Use pelo menos 8 caracteres e confirme a mesma senha.');
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      router.replace('/contas');
    } catch (e) {
      setError(authError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <FormScreen title="Nova senha" subtitle="Escolha uma senha para acessar sua conta.">
      {!loading && !session ? (
        <>
          <Text>O link expirou ou é inválido. Solicite outro para continuar.</Text>
          <Button title="Solicitar novo link" onPress={() => router.replace('/recuperar')} />
        </>
      ) : (
        <>
          <TextField
            label="Nova senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
          />
          <TextField
            label="Confirmar nova senha"
            value={confirmation}
            onChangeText={setConfirmation}
            secureTextEntry
            autoComplete="new-password"
          />
          {error ? (
            <Text accessibilityRole="alert" color="#FF6B5A">
              {error}
            </Text>
          ) : null}
          <Button title="Salvar nova senha" loading={busy || loading} onPress={save} />
        </>
      )}
    </FormScreen>
  );
}

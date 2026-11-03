import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import React, { useState } from 'react';
import { Button, Text, TextField } from '@/components/ui';
import { FormScreen } from '@/features/auth/FormScreen';
import { authError, supabase } from '@/lib/supabase';

export default function RecoveryScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function recover() {
    if (busy) return;
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setMessage('Informe um e-mail válido.');
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: Linking.createURL('/nova-senha'),
      });
      if (error) throw error;
      setMessage('Se houver uma conta com este e-mail, enviaremos as instruções de recuperação.');
    } catch (e) {
      setMessage(authError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <FormScreen
      title="Recuperar acesso"
      subtitle="Enviaremos um link para você definir uma nova senha."
    >
      <TextField
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      {message ? <Text accessibilityRole="alert">{message}</Text> : null}
      <Button title="Enviar link" loading={busy} onPress={recover} />
      <Button
        title="Voltar para entrar"
        variant="ghost"
        onPress={() => router.replace('/entrar')}
      />
    </FormScreen>
  );
}

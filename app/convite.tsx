import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Button, Text } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthContext';
import { FormScreen } from '@/features/auth/FormScreen';
import { pendingInvite } from '@/features/relationships/api';
import { supabase } from '@/lib/supabase';

export default function InviteEntry() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { session, loading } = useAuth();
  const router = useRouter();
  const [target, setTarget] = useState<string | null>(null);
  const [error, setError] = useState('');
  const valid = typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);
  useEffect(() => {
    if (!valid) return;
    pendingInvite.set(token!);
    if (!session) return;
    let live = true;
    supabase
      .from('profiles')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('role', 'student')
      .maybeSingle()
      .then(({ data, error }) => {
        if (!live) return;
        if (error) setError('Não foi possível carregar seu perfil. Tente novamente.');
        else setTarget(data?.id || 'create');
      });
    return () => {
      live = false;
    };
  }, [valid, token, session]);
  if (!valid)
    return (
      <FormScreen title="Convite inválido" subtitle="Solicite um novo QR Code ao profissional.">
        <Button title="Ir para Contas" onPress={() => router.replace('/contas')} />
      </FormScreen>
    );
  if (!loading && !session) return <Redirect href="/entrar" />;
  if (target && target !== 'create')
    return <Redirect href={{ pathname: '/painel', params: { profile: target } }} />;
  return (
    <FormScreen
      title="Convite recebido"
      subtitle="Você precisa de um perfil de aluno para solicitar acompanhamento."
    >
      {error ? (
        <Text accessibilityRole="alert">{error}</Text>
      ) : target === 'create' ? (
        <Button
          title="Criar perfil de aluno"
          onPress={() => router.replace({ pathname: '/perfil', params: { role: 'student' } })}
        />
      ) : (
        <Text>Carregando seu perfil...</Text>
      )}
      <Button title="Ir para Contas" variant="ghost" onPress={() => router.replace('/contas')} />
    </FormScreen>
  );
}

import { readLastProfile, rememberProfile } from '@/features/auth/lastProfile';
import { Redirect, useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { Image, View } from 'react-native';
import { Button, Text } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthContext';
import { FormScreen } from '@/features/auth/FormScreen';
import { authError, supabase } from '@/lib/supabase';
import { pendingInvite } from '@/features/relationships/api';

type Profile = {
  id: string;
  role: 'student' | 'professional';
  display_name: string;
  username: string;
  bio: string;
  avatar_url: string | null;
  specialties: string[];
};
export default function AccountsScreen() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const { trocar } = useLocalSearchParams<{ trocar?: string }>();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const requestId = useRef(0);
  const loadProfiles = useCallback(() => {
    const request = ++requestId.current;
    if (!session) return;
    setFetching(true);
    setError('');
    setProfiles([]);
    supabase
      .from('profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at')
      .then(({ data, error }) => {
        if (request !== requestId.current) return;
        if (error) setError(authError(error));
        else {
          setProfiles(data || []);
          const last = readLastProfile(session.user.id);
          const remembered = (data || []).find((p) => p.id === last);
          if (trocar !== '1' && !pendingInvite.get() && remembered) {
            router.replace({ pathname: '/painel', params: { profile: remembered.id } });
          }
          setActiveId((current) =>
            (data || []).some((p) => p.id === current)
              ? current
              : remembered?.id || data?.[0]?.id || null,
          );
        }
        setFetching(false);
      });
    return () => {
      requestId.current++;
    };
  }, [session, trocar, router]);
  useFocusEffect(loadProfiles);
  if (!loading && !session) return <Redirect href="/entrar" />;
  const active = profiles.find((p) => p.id === activeId);
  async function signOut() {
    setBusy(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setError(authError(error));
      setBusy(false);
    } else router.replace('/entrar');
  }
  return (
    <FormScreen
      title="Contas"
      subtitle="Escolha o perfil que deseja usar. Cada papel tem sua própria apresentação."
    >
      {loading || fetching ? (
        <Text>Carregando seus perfis…</Text>
      ) : error ? (
        <>
          <Text accessibilityRole="alert" color="#FF6B5A">
            {error}
          </Text>
          <Button
            title="Tentar novamente"
            onPress={() => {
              loadProfiles();
            }}
          />
        </>
      ) : (
        <>
          {profiles.map((profile) => (
            <Button
              key={profile.id}
              title={`${activeId === profile.id ? '✓ ' : ''}${profile.display_name} · ${profile.role === 'student' ? 'Aluno' : 'Profissional'}`}
              variant={activeId === profile.id ? 'primary' : 'outline'}
              onPress={() => setActiveId(profile.id)}
            />
          ))}
          {active ? (
            <View style={{ gap: 12, paddingVertical: 24 }}>
              <Text variant="caption">
                PERFIL ATIVO · {active.role === 'student' ? 'ALUNO' : 'PROFISSIONAL'}
              </Text>
              {active.avatar_url ? (
                <Image
                  source={{ uri: active.avatar_url }}
                  style={{ width: 88, height: 88, borderRadius: 44 }}
                  accessibilityLabel="Foto do perfil ativo"
                />
              ) : null}
              <Text variant="heading">{active.display_name}</Text>
              <Button
                title="Abrir painel"
                onPress={() => {
                  rememberProfile(session!.user.id, active.id);
                  router.replace({ pathname: '/painel', params: { profile: active.id } });
                }}
              />
              {pendingInvite.get() ? (
                <Text>
                  Você recebeu um convite. Abra o painel de aluno para consultar e confirmar o
                  profissional.
                </Text>
              ) : null}
              <Text variant="link">@{active.username}</Text>
              {active.bio ? <Text>{active.bio}</Text> : null}
              {active.specialties.length ? (
                <Text variant="bodyMuted">{active.specialties.join(' · ')}</Text>
              ) : null}
            </View>
          ) : (
            <Text>Você ainda não criou um perfil. Comece escolhendo como deseja usar o Fitto.</Text>
          )}
          {!profiles.some((p) => p.role === 'student') && (
            <Button
              title="Adicionar perfil de aluno"
              variant="outline"
              onPress={() => router.push({ pathname: '/perfil', params: { role: 'student' } })}
            />
          )}
          {!profiles.some((p) => p.role === 'professional') && (
            <Button
              title="Adicionar perfil profissional"
              variant="outline"
              onPress={() => router.push({ pathname: '/perfil', params: { role: 'professional' } })}
            />
          )}
        </>
      )}
      <Button title="Sair da conta" variant="ghost" loading={busy} onPress={signOut} />
    </FormScreen>
  );
}

import React, { useEffect, useState } from 'react';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Text } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthContext';
import { supabase } from '@/lib/supabase';
import { Profile, Dashboard, relationshipApi } from '@/features/relationships/api';
import { DashboardShell } from '@/features/relationships/DashboardShell';
import { NutritionPanel } from '@/features/nutrition/NutritionPanel';
export default function NutritionPage() {
  const { profile: profileId, link: linkId } = useLocalSearchParams<{
    profile?: string;
    link?: string;
  }>();
  return (
    <NutritionPageContent key={`${profileId}:${linkId}`} profileId={profileId} linkId={linkId} />
  );
}
function NutritionPageContent({ profileId, linkId }: { profileId?: string; linkId?: string }) {
  const { session, loading } = useAuth(),
    router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [fetching, setFetching] = useState(true),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!session || !profileId || !linkId) return;
    let live = true;
    void (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id,role,display_name,username,specialties,bio,avatar_url,location,website,focus')
          .eq('id', profileId)
          .eq('user_id', session.user.id)
          .maybeSingle();
        if (error || !data) throw new Error('Selecione um perfil da sua conta.');
        const dashboard = await relationshipApi<Dashboard>('dashboard', profileId);
        const link = dashboard.links.find((l) => l.id === linkId && l.status === 'active');
        if (
          !link ||
          (data.role === 'professional' && !data.specialties.includes('Nutricionista')) ||
          (data.role === 'student' && !link.specialties.includes('Nutricionista'))
        )
          throw new Error('Este acompanhamento de alimentação não está disponível.');
        if (live) {
          setProfile(data);
          setError('');
        }
      } catch (e) {
        if (live) setError((e as Error).message);
      } finally {
        if (live) setFetching(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [session, profileId, linkId, revision]);
  if (!loading && !session) return <Redirect href="/entrar" />;
  if (!profileId || !linkId) return <Redirect href="/contas" />;
  return (
    <DashboardShell
      profile={profile}
      tab="nutrition"
      hideIntro
      disabled={busy}
      pendingCount={0}
      onTab={(tab) => router.replace({ pathname: '/painel', params: { profile: profileId, tab } })}
    >
      <Button
        title="Voltar à alimentação"
        variant="ghost"
        disabled={busy}
        onPress={() =>
          router.replace({ pathname: '/painel', params: { profile: profileId, tab: 'nutrition' } })
        }
      />
      {loading || fetching ? (
        <Text>Preparando alimentação…</Text>
      ) : error ? (
        <>
          <Text accessibilityRole="alert" color="#FFB87A">
            {error}
          </Text>
          <Button
            title="Tentar novamente"
            onPress={() => {
              setFetching(true);
              setRevision((n) => n + 1);
            }}
          />
        </>
      ) : profile ? (
        <NutritionPanel
          profileId={profileId}
          linkId={linkId}
          professional={profile.role === 'professional'}
          onBusy={setBusy}
        />
      ) : null}
    </DashboardShell>
  );
}

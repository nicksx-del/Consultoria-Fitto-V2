import React, { useEffect, useState } from 'react';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Text } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthContext';
import { supabase } from '@/lib/supabase';
import { Dashboard, Profile, relationshipApi } from '@/features/relationships/api';
import { DashboardShell } from '@/features/relationships/DashboardShell';
import { Executions } from '@/features/relationships/Executions';
import type { PublishedWorkout } from '@/features/relationships/trainingExperience';
export default function TrainingPage() {
  const params = useLocalSearchParams<{
    profile?: string;
    link?: string;
    plan?: string;
    division?: string;
  }>();
  return (
    <TrainingPageContent
      key={`${params.profile}:${params.link}`}
      profileId={params.profile}
      linkId={params.link}
      initialStart={
        params.plan && params.division && /^\d+$/.test(params.division)
          ? { plan: params.plan, division: Number(params.division) }
          : undefined
      }
    />
  );
}
function TrainingPageContent({
  profileId,
  linkId,
  initialStart,
}: {
  profileId?: string;
  linkId?: string;
  initialStart?: { plan: string; division: number };
}) {
  const { session, loading } = useAuth(),
    router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null),
    [plans, setPlans] = useState<PublishedWorkout[]>([]),
    [error, setError] = useState(''),
    [fetching, setFetching] = useState(true),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0),
    [navigationKey, setNavigationKey] = useState(0);
  useEffect(() => {
    let alive = true;
    if (!session || !profileId || !linkId) return;
    void (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id,role,display_name,username,specialties,bio,avatar_url,location,website,focus')
          .eq('id', profileId)
          .eq('user_id', session.user.id)
          .eq('role', 'student')
          .maybeSingle();
        if (error || !data) throw new Error('Selecione seu perfil de aluno para treinar.');
        const dashboard = await relationshipApi<Dashboard>('dashboard', profileId);
        if (
          !dashboard.links.some(
            (l) => l.id === linkId && l.status === 'active' && l.specialties.includes('Treinador'),
          )
        )
          throw new Error('Este acompanhamento não está disponível.');
        const result = await supabase.rpc('workout_api', {
          action: 'list',
          profile_id: profileId,
          link_id: linkId,
          payload: {},
        });
        if (result.error) throw new Error('Não foi possível carregar suas fichas.');
        if (alive) {
          setProfile(data);
          setPlans(result.data as PublishedWorkout[]);
          setError('');
        }
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setFetching(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [session, profileId, linkId, revision]);
  if (!loading && !session) return <Redirect href="/entrar" />;
  if (!profileId || !linkId) return <Redirect href="/contas" />;
  return (
    <DashboardShell
      profile={profile}
      tab="home"
      navigationKey={navigationKey}
      pendingCount={0}
      disabled={busy}
      onTab={(tab) => router.replace({ pathname: '/painel', params: { profile: profileId, tab } })}
    >
      <Button
        title="Voltar ao início"
        variant="ghost"
        disabled={busy}
        onPress={() =>
          router.replace({ pathname: '/painel', params: { profile: profileId, tab: 'home' } })
        }
      />
      {loading || fetching ? (
        <Text>Preparando seu treino…</Text>
      ) : error ? (
        <>
          <Text accessibilityRole="alert" color="#FF6B5A">
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
      ) : (
        <Executions
          profileId={profileId}
          linkId={linkId}
          plans={plans}
          initialStart={initialStart}
          onEntryHandled={() => router.setParams({ plan: undefined, division: undefined })}
          onBusy={setBusy}
          onMinimize={() =>
            router.replace({ pathname: '/painel', params: { profile: profileId, tab: 'home' } })
          }
          onNavigate={() => setNavigationKey((n) => n + 1)}
        />
      )}
    </DashboardShell>
  );
}

import { rememberProfile } from '@/features/auth/lastProfile';
import React, { useEffect, useState } from 'react';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Text } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthContext';
import { supabase } from '@/lib/supabase';
import { Dashboard, Profile, Relationship, relationshipApi } from '@/features/relationships/api';
import { DashboardShell } from '@/features/relationships/DashboardShell';
import { StudentWorkspace } from '@/features/relationships/StudentWorkspace';
export default function StudentPage() {
  const params = useLocalSearchParams<{
    profile?: string;
    link?: string;
    section?: string;
    plan?: string;
  }>();
  return (
    <StudentPageContent
      key={`${params.profile}:${params.link}:${params.section}:${params.plan}`}
      initialSection={params.section}
      initialPlanId={params.plan}
      profileId={params.profile}
      linkId={params.link}
    />
  );
}
function StudentPageContent({
  profileId,
  linkId,
  initialSection,
  initialPlanId,
}: {
  profileId?: string;
  linkId?: string;
  initialSection?: string;
  initialPlanId?: string;
}) {
  const { session, loading } = useAuth(),
    router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null),
    [link, setLink] = useState<Relationship | null>(null),
    [error, setError] = useState(''),
    [fetching, setFetching] = useState(true),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState(false),
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
          .eq('role', 'professional')
          .maybeSingle();
        if (error || !data)
          throw new Error('Selecione seu perfil profissional para abrir este aluno.');
        const dashboard = await relationshipApi<Dashboard>('dashboard', profileId);
        const student = dashboard.links.find((l) => l.id === linkId && l.status === 'active');
        if (!student) throw new Error('Este aluno não está disponível no seu acompanhamento.');
        if (alive) {
          setProfile(data);
          rememberProfile(session.user.id, data.id);
          setLink(student);
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
  const back = () =>
    router.replace({ pathname: '/painel', params: { profile: profileId, tab: 'relationships' } });
  return (
    <DashboardShell
      profile={profile}
      tab="relationships"
      pendingCount={0}
      hideIntro
      editorMode={editing}
      disabled={busy || editing}
      navigationKey={navigationKey}
      onTab={(tab) => router.replace({ pathname: '/painel', params: { profile: profileId, tab } })}
    >
      {loading || fetching ? (
        <Text>Carregando painel do aluno…</Text>
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
          <Button title="Voltar para Alunos" variant="outline" onPress={back} />
        </>
      ) : profile && link ? (
        <StudentWorkspace
          initialSection={initialSection}
          initialPlanId={initialPlanId}
          profile={profile}
          link={link}
          onBack={back}
          onBusy={setBusy}
          onEditing={(v) => {
            setEditing(v);
            if (v) setNavigationKey((n) => n + 1);
          }}
          onNavigate={() => setNavigationKey((n) => n + 1)}
        />
      ) : null}
    </DashboardShell>
  );
}

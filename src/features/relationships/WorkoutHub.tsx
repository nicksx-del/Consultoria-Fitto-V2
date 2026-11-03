import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button, Text } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { Plan } from './workoutModel';
import { WorkoutPreview } from './WorkoutPreview';
import { WorkoutStudio } from './WorkoutStudio';
import { WorkoutHubMenu } from './WorkoutHubMenu';
export function WorkoutHub({
  profileId,
  linkId,
  onBusy,
  onEditing,
  onNavigate,
  initialPlanId,
}: {
  initialPlanId?: string;
  profileId: string;
  linkId: string;
  onBusy: (v: boolean) => void;
  onEditing: (v: boolean) => void;
  onNavigate?: () => void;
}) {
  const [plans, setPlans] = useState<Plan[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [intent, setIntent] = useState<{ id?: string; create?: boolean } | null>(
      initialPlanId ? { id: initialPlanId } : null,
    ),
    [view, setView] = useState<string | null>(null),
    [revision, setRevision] = useState(0),
    [editorOpen, setEditorOpen] = useState(false),
    [editorBusy, setEditorBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    void Promise.resolve(
      supabase.rpc('workout_api', {
        action: 'list',
        profile_id: profileId,
        link_id: linkId,
        payload: {},
      }),
    )
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) setError('Não foi possível carregar os treinos. Tente novamente.');
        else {
          setPlans(data as Plan[]);
          setError('');
        }
        setLoading(false);
      })
      .catch(() => {
        if (alive) {
          setError('Não foi possível carregar os treinos. Tente novamente.');
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [profileId, linkId, revision]);
  function refresh() {
    setLoading(true);
    setRevision((n) => n + 1);
  }
  function chooseIntent(next: { id?: string; create?: boolean } | null) {
    onNavigate?.();
    setIntent(next);
  }
  function chooseView(next: string | null) {
    onNavigate?.();
    setView(next);
  }
  if (intent)
    return (
      <View style={{ gap: 14 }}>
        {!editorOpen ? (
          <Button
            title="Voltar às opções de treino"
            variant="ghost"
            disabled={editorBusy}
            onPress={() => {
              chooseIntent(null);
              refresh();
            }}
          />
        ) : null}
        <WorkoutStudio
          profileId={profileId}
          linkId={linkId}
          initialPlanId={intent.id}
          createNew={intent.create}
          onBusy={(v) => {
            setEditorBusy(v);
            onBusy(v);
          }}
          onEditing={(v) => {
            setEditorOpen(v);
            onEditing(v);
          }}
          onLeave={() => {
            chooseIntent(null);
            refresh();
          }}
        />
      </View>
    );
  const viewed = plans.find((p) => p.id === view);
  if (viewed)
    return (
      <View style={{ gap: 16 }}>
        <Button
          title="Voltar às opções de treino"
          variant="ghost"
          onPress={() => chooseView(null)}
        />
        <Text variant="caption">
          {viewed.status === 'published'
            ? 'VERSÃO PUBLICADA PARA O ALUNO'
            : viewed.status === 'archived'
              ? 'FICHA ARQUIVADA'
              : 'PRÉVIA DO RASCUNHO'}
        </Text>
        <WorkoutPreview
          content={
            viewed.status === 'published' && viewed.published ? viewed.published : viewed.draft
          }
        />
        {viewed.status !== 'archived' ? (
          <Button
            title="Editar treino"
            onPress={() => {
              setView(null);
              chooseIntent({ id: viewed.id });
            }}
          />
        ) : null}
      </View>
    );
  return (
    <WorkoutHubMenu
      plans={plans}
      loading={loading}
      error={error}
      onView={chooseView}
      onEdit={(id) => chooseIntent({ id })}
      onCreate={() => chooseIntent({ create: true })}
      onManage={() => chooseIntent({})}
      onRefresh={refresh}
    />
  );
}

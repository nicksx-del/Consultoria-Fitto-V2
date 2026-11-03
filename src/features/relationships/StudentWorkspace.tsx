import { NutritionPanel } from '@/features/nutrition/NutritionPanel';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button, Text } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { Profile, Relationship } from './api';
import { TrainingIntake } from './TrainingIntake';
import { StudentTrainingSummary } from './StudentTrainingSummary';
import { WorkoutHub } from './WorkoutHub';
import { Executions, Execution } from './Executions';
import { FeedbackInbox } from './ExerciseFeedback';
import { trainingTools, TrainingFeedback } from './trainingToolsApi';
import { Plan } from './workoutModel';
import { StudentOverview, StudentOverviewData, StudentSection } from './StudentOverview';
export function StudentWorkspace({
  profile,
  link,
  onBack,
  onBusy,
  onEditing,
  onNavigate,
  initialSection,
  initialPlanId,
}: {
  initialSection?: string;
  initialPlanId?: string;
  profile: Profile;
  link: Relationship;
  onBack: () => void;
  onBusy: (v: boolean) => void;
  onEditing: (v: boolean) => void;
  onNavigate?: () => void;
}) {
  const [section, setSection] = useState<StudentSection>(
      ['workouts', 'feedback', 'intake', 'history'].includes(initialSection || '')
        ? (initialSection as StudentSection)
        : 'overview',
    ),
    [editing, setEditing] = useState(false),
    [busy, setBusy] = useState(false),
    [data, setData] = useState<StudentOverviewData | null>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0);
  const trainer = profile.specialties.includes('Treinador');
  const nutritionist = profile.specialties.includes('Nutricionista');
  useEffect(() => {
    let alive = true;
    if (!trainer) return;
    async function read<T>(name: string): Promise<T> {
      const { data, error } = await supabase.rpc(name, {
        action: 'list',
        profile_id: profile.id,
        link_id: link.id,
        payload: {},
      });
      if (error) throw new Error('Não foi possível atualizar o resumo do aluno.');
      return data as T;
    }
    void Promise.all([
      read<Plan[]>('workout_api'),
      read<Execution[]>('execution_api'),
      trainingTools<{ feedback: TrainingFeedback[] }>(profile.id, link.id, 'read'),
    ])
      .then(([plans, executions, tools]) => {
        if (!alive) return;
        const completed = executions
          .filter((e) => e.status === 'completed')
          .sort((a, b) => b.started_at.localeCompare(a.started_at));
        setData({
          plan: plans.find((p) => p.status === 'published')?.published?.title || null,
          drafts: plans.filter((p) => p.status === 'draft').length,
          completed: completed.length,
          lastWorkout: completed[0]?.started_at || null,
          pendingFeedback: tools.feedback.filter((f) => !f.reviewed).length,
        });
        setError('');
      })
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [profile.id, link.id, trainer, revision]);
  function navigate(next: StudentSection) {
    onNavigate?.();
    setSection(next);
    if (next === 'overview') {
      setLoading(true);
      setRevision((n) => n + 1);
    }
  }
  return (
    <View style={{ gap: 18 }}>
      {!editing ? (
        <Button
          title={section === 'overview' ? 'Voltar para Alunos' : 'Voltar ao painel do aluno'}
          variant="ghost"
          disabled={busy}
          onPress={() => (section === 'overview' ? onBack() : navigate('overview'))}
        />
      ) : null}
      {!editing ? (
        <View
          style={{
            padding: 16,
            borderRadius: 20,
            backgroundColor: '#20291A',
            borderWidth: 1,
            borderColor: '#3E4B31',
            gap: 8,
          }}
        >
          <Text variant="caption">PAINEL DO ALUNO</Text>
          <Text variant={editing ? 'title' : 'heading'}>{link.name}</Text>
          {!editing ? (
            <>
              <Text variant="bodyMuted">@{link.username}</Text>
              <Text color="#B7F34A">● Acompanhamento ativo</Text>
            </>
          ) : null}
        </View>
      ) : (
        <Text variant="caption">PRESCRIÇÃO · {link.name}</Text>
      )}
      {nutritionist && section === 'overview' ? (
        <Button
          title="Plano alimentar do aluno"
          variant="outline"
          disabled={busy}
          onPress={() => navigate('nutrition')}
        />
      ) : null}
      {section === 'nutrition' && nutritionist ? (
        <NutritionPanel
          profileId={profile.id}
          linkId={link.id}
          professional
          onBusy={(v) => {
            setBusy(v);
            onBusy(v);
          }}
        />
      ) : trainer ? (
        <>
          {section === 'overview' ? (
            <>
              {error ? (
                <View style={{ gap: 8 }}>
                  <Text accessibilityRole="alert" color="#FF6B5A">
                    {error}
                  </Text>
                  <Button
                    title="Atualizar resumo"
                    variant="outline"
                    onPress={() => navigate('overview')}
                  />
                </View>
              ) : null}
              <StudentOverview data={data} loading={loading} onSection={navigate} />
            </>
          ) : section === 'workouts' ? (
            <WorkoutHub
              profileId={profile.id}
              linkId={link.id}
              initialPlanId={initialPlanId}
              onNavigate={onNavigate}
              onBusy={(v) => {
                setBusy(v);
                onBusy(v);
              }}
              onEditing={(v) => {
                setEditing(v);
                onEditing(v);
              }}
            />
          ) : section === 'intake' ? (
            <>
              <Text variant="heading">Ficha do aluno</Text>
              <StudentTrainingSummary profileId={profile.id} linkId={link.id} />
              <TrainingIntake profileId={profile.id} linkId={link.id} />
            </>
          ) : section === 'feedback' ? (
            <>
              <Text variant="heading">Feedback</Text>
              <FeedbackInbox profileId={profile.id} linkId={link.id} />
            </>
          ) : (
            <Executions profileId={profile.id} linkId={link.id} trainer />
          )}
        </>
      ) : !nutritionist ? (
        <Text>
          A montagem de treinos está disponível para profissionais com a especialidade Treinador.
        </Text>
      ) : null}
    </View>
  );
}

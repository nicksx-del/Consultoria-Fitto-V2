import { nutritionApi } from '@/features/nutrition/nutritionApi';
import type { NutritionData } from '@/features/nutrition/nutritionModel';
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
  const trainer = profile.specialties.includes('Treinador');
  const nutritionist = profile.specialties.includes('Nutricionista');
  const [section, setSection] = useState<StudentSection>(
      initialSection === 'nutrition' && nutritionist
        ? 'nutrition'
        : trainer && ['workouts', 'feedback', 'intake', 'history'].includes(initialSection || '')
          ? (initialSection as StudentSection)
          : 'overview',
    ),
    [fromOverview, setFromOverview] = useState(false),
    [editing, setEditing] = useState(false),
    [busy, setBusy] = useState(false),
    [data, setData] = useState<StudentOverviewData | null>(null),
    [nutrition, setNutrition] = useState<NutritionData | null>(null),
    [nutritionError, setNutritionError] = useState(false),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let alive = true;
    if (!trainer || section !== 'overview') return;
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
          plans: plans.filter((p) => p.status !== 'archived'),
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
  }, [profile.id, link.id, trainer, revision, section]);
  useEffect(() => {
    if (!nutritionist || section !== 'overview') return;
    let alive = true;
    void nutritionApi<NutritionData>(profile.id, link.id, 'read')
      .then((result) => {
        if (alive) setNutrition(result);
      })
      .catch(() => {
        if (alive) setNutritionError(true);
      });
    return () => {
      alive = false;
    };
  }, [profile.id, link.id, nutritionist, revision, section]);
  function navigate(next: StudentSection) {
    onNavigate?.();
    setFromOverview(section === 'overview' && next !== 'overview');
    setSection(next);
    if (next === 'overview') {
      setLoading(trainer);
      setError('');
      setNutrition(null);
      setNutritionError(false);
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
          <Text variant="heading">{link.name}</Text>
          <Text variant="bodyMuted">@{link.username}</Text>
          <Text color="#B7F34A">● Acompanhamento ativo</Text>
        </View>
      ) : (
        <Text variant="caption">PRESCRIÇÃO · {link.name}</Text>
      )}
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
          <StudentOverview
            data={data}
            nutrition={nutrition}
            nutritionError={nutritionError}
            workoutError={Boolean(error)}
            loading={loading}
            trainer={trainer}
            nutritionist={nutritionist}
            onSection={navigate}
          />
        </>
      ) : section === 'nutrition' && nutritionist ? (
        <NutritionPanel
          profileId={profile.id}
          linkId={link.id}
          professional
          startEditing={fromOverview}
          onBusy={(v) => {
            setBusy(v);
            onBusy(v);
          }}
        />
      ) : trainer ? (
        <>
          {section === 'workouts' ? (
            <WorkoutHub
              profileId={profile.id}
              linkId={link.id}
              initialPlanId={
                fromOverview
                  ? data?.plans.length === 1
                    ? data.plans[0].id
                    : undefined
                  : initialPlanId
              }
              createNew={fromOverview && data?.plans.length === 0}
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

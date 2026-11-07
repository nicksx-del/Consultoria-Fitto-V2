import Ionicons from '@expo/vector-icons/Ionicons';
import { nutritionApi } from '@/features/nutrition/nutritionApi';
import type { NutritionData } from '@/features/nutrition/nutritionModel';
import { NutritionPanel } from '@/features/nutrition/NutritionPanel';
import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/ui';
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
  function navigate(next: StudentSection, openEditor = true) {
    onNavigate?.();
    setFromOverview(openEditor && section === 'overview' && next !== 'overview');
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
    <View style={{ gap: 14 }}>
      {!editing ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                section === 'overview' ? 'Voltar para Alunos' : 'Voltar ao resumo do aluno'
              }
              disabled={busy}
              onPress={() => (section === 'overview' ? onBack() : navigate('overview'))}
              style={{
                width: 44,
                height: 44,
                borderRadius: 13,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#202C19',
                opacity: busy ? 0.4 : 1,
              }}
            >
              <Ionicons name="arrow-back" size={21} color="#C0F568" />
            </Pressable>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#304423',
              }}
            >
              <Text color="#C0F568" style={{ fontSize: 14, fontWeight: '700' }}>
                {link.name
                  .trim()
                  .split(/\s+/)
                  .filter((part) => /^[\p{L}\p{N}]/u.test(part))
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join('')
                  .toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
              <Text numberOfLines={1} style={{ fontSize: 17, fontWeight: '700' }}>
                {link.name}
              </Text>
              <Text numberOfLines={1} style={{ fontSize: 11 }} color="#A8B59E">
                ● Ativo · @{link.username}
                {link.is_self ? ' · Teste' : ''}
              </Text>
            </View>
          </View>
          <View
            accessibilityRole="tablist"
            style={{
              flexDirection: 'row',
              gap: 3,
              padding: 3,
              borderRadius: 14,
              backgroundColor: '#1A2216',
            }}
          >
            {(
              [
                { section: 'overview', label: 'Resumo', icon: 'grid-outline', enabled: true },
                { section: 'workouts', label: 'Treino', icon: 'barbell-outline', enabled: trainer },
                {
                  section: 'nutrition',
                  label: 'Dieta',
                  icon: 'restaurant-outline',
                  enabled: nutritionist,
                },
              ] as const
            )
              .filter((item) => item.enabled)
              .map((item) => (
                <Pressable
                  key={item.section}
                  accessibilityRole="tab"
                  accessibilityLabel={item.label}
                  accessibilityState={{ selected: section === item.section, disabled: busy }}
                  disabled={busy}
                  onPress={() => navigate(item.section, false)}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    gap: 6,
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 44,
                    borderRadius: 11,
                    backgroundColor: section === item.section ? '#304325' : 'transparent',
                    opacity: busy ? 0.5 : 1,
                  }}
                >
                  <Ionicons
                    name={item.icon}
                    size={16}
                    color={section === item.section ? '#C0F568' : '#A8B59E'}
                  />
                  <Text
                    style={{ fontSize: 12, fontWeight: section === item.section ? '700' : '400' }}
                    color={section === item.section ? '#C0F568' : '#A8B59E'}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
          </View>
        </>
      ) : (
        <Text variant="caption">PRESCRIÇÃO · {link.name}</Text>
      )}
      {section === 'overview' ? (
        <>
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

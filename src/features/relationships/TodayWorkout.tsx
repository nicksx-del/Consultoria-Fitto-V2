import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Text } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import type { Execution } from './Executions';
import { PublishedWorkout, suggestedWorkout, estimatedMinutes } from './trainingExperience';
import { StudentPerformanceSearch } from './StudentPerformanceSearch';
export function TodayWorkoutCard({
  plans,
  rows,
  loading,
  error,
  onOpen,
  onRefresh,
}: {
  plans: PublishedWorkout[];
  rows: Execution[];
  loading: boolean;
  error: string;
  onOpen: (plan?: string, division?: number) => void;
  onRefresh: () => void;
}) {
  const next = suggestedWorkout(plans, rows);
  return (
    <View
      style={{
        gap: 14,
        padding: 20,
        borderRadius: 20,
        backgroundColor: '#20291A',
        borderWidth: 1,
        borderColor: '#456032',
      }}
    >
      <Text variant="caption" color="#B7F34A">
        TREINO DE HOJE
      </Text>
      {loading ? (
        <Text>Consultando seu treino…</Text>
      ) : error ? (
        <>
          <Text accessibilityRole="alert" color="#FF6B5A">
            {error}
          </Text>
          <Button title="Tentar novamente" onPress={onRefresh} />
        </>
      ) : next && 'active' in next && next.active ? (
        <>
          <Text variant="heading">Vamos continuar?</Text>
          <Text variant="title">{next.active.snapshot.session.name}</Text>
          <Text variant="caption">
            {next.active.progress.flat().filter((s) => s.done).length} séries concluídas · progresso
            salvo
          </Text>
          <Button title="Retomar treino" onPress={() => onOpen()} />
        </>
      ) : next && 'session' in next && next.session ? (
        <>
          <Text variant="heading">{next.session.name}</Text>
          <Text>{next.plan.content.title}</Text>
          <Text variant="caption">
            {next.session.exercises.length} exercícios · cerca de{' '}
            {estimatedMinutes(next.session.exercises)} min
          </Text>
          <Button
            title={`Começar ${next.session.name}`}
            onPress={() => onOpen(next.plan.id, next.division)}
          />
          <Button title="Escolher outro treino" variant="ghost" onPress={() => onOpen()} />
          <Text variant="caption">
            Sugestão pela sequência da ficha, sem calendário definido. Siga os dias orientados pelo
            treinador. O tempo é estimado.
          </Text>
        </>
      ) : (
        <>
          <Text variant="title">Seu treino está sendo preparado</Text>
          <Text variant="bodyMuted">Quando o treinador publicar uma ficha, ela aparece aqui.</Text>
        </>
      )}
    </View>
  );
}
export function TodayWorkout({
  profileId,
  linkId,
  trainerName,
}: {
  profileId: string;
  linkId: string;
  trainerName: string;
}) {
  const router = useRouter(),
    [plans, setPlans] = useState<PublishedWorkout[]>([]),
    [rows, setRows] = useState<Execution[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [revision, setRevision] = useState(0);
  const [performanceOpen, setPerformanceOpen] = useState(false);
  useEffect(() => {
    let alive = true;
    async function read<T>(name: string): Promise<T> {
      const { data, error } = await supabase.rpc(name, {
        action: 'list',
        profile_id: profileId,
        link_id: linkId,
        payload: {},
      });
      if (error) throw new Error('Não foi possível carregar seu treino agora.');
      return data as T;
    }
    void Promise.all([read<PublishedWorkout[]>('workout_api'), read<Execution[]>('execution_api')])
      .then(([p, r]) => {
        if (alive) {
          setPlans(p);
          setRows(r);
          setError('');
        }
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
  }, [profileId, linkId, revision]);
  return (
    <View style={{ gap: 8 }}>
      <Text variant="caption">Acompanhamento com {trainerName}</Text>
      <TodayWorkoutCard
        plans={plans}
        rows={rows}
        loading={loading}
        error={error}
        onRefresh={() => {
          setLoading(true);
          setRevision((n) => n + 1);
        }}
        onOpen={(plan, division) =>
          router.push({
            pathname: '/treinar',
            params: {
              profile: profileId,
              link: linkId,
              ...(plan && division !== undefined ? { plan, division: String(division) } : {}),
            },
          })
        }
      />
      <Button
        title="Buscar exercício · Meu desempenho"
        variant="outline"
        disabled={loading || !!error}
        onPress={() => setPerformanceOpen(true)}
      />
      {performanceOpen ? (
        <StudentPerformanceSearch
          profileId={profileId}
          linkId={linkId}
          plans={plans}
          rows={rows}
          onClose={() => setPerformanceOpen(false)}
        />
      ) : null}
    </View>
  );
}

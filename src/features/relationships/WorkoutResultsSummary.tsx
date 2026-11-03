import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui';
import type { Execution } from './Executions';
import { unit } from './workoutModel';
import { isWorking } from './trainingMethods';
export function WorkoutResultsSummary({ rows, now }: { rows: Execution[]; now: number }) {
  const completed = rows.filter((r) => r.status === 'completed');
  const recent = completed.filter((r) => new Date(r.started_at).getTime() >= now - 7 * 86400000);
  const days = new Set(recent.map((r) => new Date(r.started_at).toLocaleDateString('pt-BR'))).size;
  const comparisons = new Map<
    string,
    {
      name: string;
      metric: string;
      logs: {
        date: string;
        weight: number | null;
        total: number;
        completed: number;
        sets: number;
      }[];
    }
  >();
  for (const row of completed)
    row.snapshot.session.exercises.forEach((e, i) => {
      const id = `${e.name.trim().toLowerCase()}:${e.metric || 'reps'}`;
      const entry = comparisons.get(id) ?? { name: e.name, metric: unit(e), logs: [] };
      if (entry.logs.length >= 2 || entry.logs.some((l) => l.date === row.started_at)) return;
      const done =
        row.progress[i]?.filter((s, j) => s.done && isWorking(e.prescribed_sets?.[j]?.kind)) ?? [];
      const weights = done.flatMap((s) => (s.weight === null ? [] : [s.weight]));
      entry.logs.push({
        date: row.started_at,
        weight: weights.length ? Math.max(...weights) : null,
        total: done.reduce((n, s) => n + (s.reps ?? 0), 0),
        completed: done.length,
        sets: e.sets,
      });
      comparisons.set(id, entry);
    });
  return (
    <View style={{ gap: 10, padding: 14, backgroundColor: '#20291A', borderRadius: 14 }}>
      <Text variant="title">Acompanhamento do ciclo</Text>
      <Text>
        Últimos 7 dias: {recent.length} treinos finalizados em {days} dias.
      </Text>
      <Text variant="caption">
        Resumo das últimas 50 execuções. Comparações por nome e unidade informados; aquecimentos
        excluídos dos resultados abaixo. Cargas e totais dependem das séries e da prescrição de cada
        sessão.
      </Text>
      {[...comparisons.values()].map((e) => (
        <View key={`${e.name}:${e.metric}`} style={{ gap: 4 }}>
          <Text variant="title">{e.name}</Text>
          {e.logs.map((l, i) => (
            <Text key={i}>
              {i === 0 ? 'Último' : 'Anterior'} · {new Date(l.date).toLocaleDateString('pt-BR')}:
              maior carga {l.weight ?? '—'} kg · total {l.total} {e.metric} · {l.completed} séries
              de trabalho concluídas
            </Text>
          ))}
        </View>
      ))}
      {!completed.length ? <Text>Nenhum treino finalizado para comparar.</Text> : null}
    </View>
  );
}

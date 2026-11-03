import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui';
import type { Execution } from './Executions';
import { executionTotals, previousSession } from './trainingExperience';
import { TrainingAchievements } from './AchievementCards';
import { personalRecords, workoutMilestone } from './trainingAchievements';
import type { TrainingFeedback } from './trainingToolsApi';
export function WorkoutCompletion({
  row,
  history,
  feedback = [],
  achievementsReady = true,
}: {
  row: Execution;
  history: Execution[];
  feedback?: TrainingFeedback[];
  achievementsReady?: boolean;
}) {
  const totals = executionTotals(row),
    previous = previousSession(row, history),
    before = previous ? executionTotals(previous) : null;
  return (
    <View
      style={{
        gap: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#557A33',
        borderRadius: 20,
        backgroundColor: '#20291A',
      }}
    >
      <Text color="#B7F34A" variant="caption">
        TREINO FINALIZADO E SALVO
      </Text>
      <Text variant="heading">Bom trabalho!</Text>
      <Text variant="title">{row.snapshot.session.name}</Text>
      {achievementsReady ? (
        <TrainingAchievements
          records={personalRecords(row, history, feedback)}
          milestone={workoutMilestone(row, history)}
          complete={totals.total > 0 && totals.done === totals.total}
        />
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20 }}>
        <View>
          <Text variant="heading">
            {totals.done}/{totals.total}
          </Text>
          <Text variant="caption">Séries concluídas</Text>
        </View>
        <View>
          <Text variant="heading">{totals.minutes ?? '—'}</Text>
          <Text variant="caption">Minutos decorridos</Text>
        </View>
      </View>
      <Text>
        {totals.exercises}/{totals.exerciseTotal} exercícios com todas as séries concluídas.
      </Text>
      <Text variant="caption">
        {totals.work} séries de trabalho · {totals.preparation} preparatórias.
      </Text>
      {totals.done < totals.total ? (
        <Text variant="caption">{totals.total - totals.done} séries ficaram sem conclusão.</Text>
      ) : null}
      {before && previous ? (
        <View style={{ gap: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#456032' }}>
          <Text variant="title">Sua sessão anterior</Text>
          <Text>
            {new Date(previous.started_at).toLocaleDateString('pt-BR')} · {before.done}/
            {before.total} séries concluídas
            {before.minutes != null ? ` · ${before.minutes} min` : ''}
          </Text>
          <Text variant="caption">
            Considere mudanças na prescrição ao comparar. O tempo inclui pausas e períodos com o
            treino aberto.
          </Text>
        </View>
      ) : (
        <Text variant="caption">
          Este é o primeiro registro comparável desta divisão no histórico recente.
        </Text>
      )}
      <Text variant="caption">Os resultados ficam disponíveis para seu treinador.</Text>
    </View>
  );
}

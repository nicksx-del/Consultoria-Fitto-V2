import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Screen, Text, TextField } from '@/components/ui';
import { ExercisePerformance } from './ExercisePerformancePanel';
import { exercisePerformance } from './exercisePerformance';
import { normalize } from './exerciseCatalog';
import type { Execution } from './Executions';
import type { Exercise } from './workoutModel';
import { effectiveExercises, sameExercise, type PublishedWorkout } from './trainingExperience';
import { trainingTools, type TrainingFeedback } from './trainingToolsApi';
import { groupInfo } from './trainingMethods';

export function StudentPerformanceSearch({
  profileId,
  linkId,
  plans,
  rows,
  onClose,
}: {
  profileId: string;
  linkId: string;
  plans: PublishedWorkout[];
  rows: Execution[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [feedback, setFeedback] = useState<TrainingFeedback[] | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let alive = true;
    void trainingTools<{ feedback: TrainingFeedback[] }>(profileId, linkId, 'read')
      .then((result) => {
        if (alive) setFeedback(result.feedback);
      })
      .catch(() => {
        if (alive) setError('Não foi possível carregar o histórico.');
      });
    return () => {
      alive = false;
    };
  }, [profileId, linkId, revision]);

  const exercises = useMemo(() => {
    const candidates = [
      ...rows
        .filter((row) => row.status === 'completed')
        .flatMap((row) => effectiveExercises(row, feedback ?? [])),
      ...plans.flatMap((plan) => plan.content.sessions.flatMap((session) => session.exercises)),
    ];
    const unique: Exercise[] = [];
    for (const exercise of candidates) {
      if (
        !unique.some(
          (item) =>
            sameExercise(item, exercise) && item.group_rule?.type === exercise.group_rule?.type,
        )
      ) {
        unique.push(exercise);
      }
    }
    return unique.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [rows, plans, feedback]);
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const results = exercises.filter((exercise) => {
    const searchable = normalize([exercise.name, exercise.muscle].filter(Boolean).join(' '));
    return terms.every((term) => searchable.includes(term));
  });

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <Screen withPadding={false}>
        <View
          style={{
            flex: 1,
            width: '100%',
            maxWidth: 560,
            alignSelf: 'center',
            padding: 16,
            gap: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Voltar ao painel do aluno"
              onPress={onClose}
              style={{
                width: 44,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
                backgroundColor: '#253421',
              }}
            >
              <Ionicons name="arrow-back" size={21} color="#C9F78C" />
            </Pressable>
            <Text variant="title">Meu desempenho</Text>
          </View>
          <TextField
            label="Buscar exercício"
            placeholder="Nome ou grupo muscular"
            value={query}
            onChangeText={setQuery}
          />
          {error ? (
            <>
              <Text accessibilityRole="alert">{error}</Text>
              <Button
                title="Tentar novamente"
                onPress={() => {
                  setError('');
                  setRevision((n) => n + 1);
                }}
              />
            </>
          ) : !feedback ? (
            <Text>Carregando exercícios…</Text>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 6 }}>
              {results.map((exercise, index) => (
                <Pressable
                  key={index}
                  accessibilityRole="button"
                  onPress={() => setSelected(exercise)}
                  style={{
                    minHeight: 52,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    padding: 10,
                    borderRadius: 12,
                    backgroundColor: '#192219',
                  }}
                >
                  <Ionicons name="stats-chart-outline" size={18} color="#C9F78C" />
                  <View style={{ flex: 1 }}>
                    <Text>{exercise.name}</Text>
                    {exercise.muscle || exercise.group_rule ? (
                      <Text variant="caption">
                        {[
                          exercise.muscle,
                          exercise.group_rule && groupInfo[exercise.group_rule.type].label,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={17} color="#B2C0AA" />
                </Pressable>
              ))}
              {!results.length ? (
                <Text variant="caption">
                  {terms.length
                    ? 'Nenhum exercício encontrado.'
                    : 'Seus exercícios aparecem aqui quando você recebe uma ficha ou registra um treino.'}
                </Text>
              ) : null}
            </ScrollView>
          )}
        </View>
        {selected && feedback ? (
          <ExercisePerformance
            browsing
            exercise={selected}
            records={[]}
            data={exercisePerformance(selected, undefined, rows, feedback)}
            onClose={() => setSelected(null)}
          />
        ) : null}
      </Screen>
    </Modal>
  );
}

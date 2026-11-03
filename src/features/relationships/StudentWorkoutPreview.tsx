import React, { useState } from 'react';
import { View } from 'react-native';
import { Button, Text } from '@/components/ui';
import type { WorkoutContent } from './workoutModel';
import { ExecutionExercises } from './ExecutionExercises';
import { emptyStep, type SetLog } from './trainingRuntime';
import { seriesFor } from './trainingMethods';

function SessionSimulation({ session }: { session: WorkoutContent['sessions'][number] }) {
  const [progress, setProgress] = useState<SetLog[][]>(() =>
    session.exercises.map((ex) =>
      Array.from({ length: ex.sets }, (_, i) => ({
        ...emptyStep(),
        ...(seriesFor(ex, i).technique
          ? { steps: seriesFor(ex, i).technique!.steps.map(() => emptyStep()) }
          : {}),
      })),
    ),
  );
  return (
    <View style={{ gap: 12 }}>
      <Text variant="title">{session.name}</Text>
      <Text variant="caption">
        Você pode experimentar os campos. Os registros desta simulação não são salvos.
      </Text>
      <ExecutionExercises
        exercises={session.exercises}
        progress={progress}
        onChange={(ei, si, patch) =>
          setProgress((current) =>
            current.map((sets, i) =>
              i === ei ? sets.map((set, j) => (j === si ? { ...set, ...patch } : set)) : sets,
            ),
          )
        }
      />
    </View>
  );
}
export function StudentWorkoutPreview({ content }: { content: WorkoutContent }) {
  const [selected, setSelected] = useState(0);
  const session = content.sessions[selected];
  return (
    <View style={{ gap: 14 }}>
      <Text variant="title">{content.title}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {content.sessions.map((item, i) => (
          <Button
            key={i}
            title={item.name}
            variant={selected === i ? 'primary' : 'outline'}
            onPress={() => setSelected(i)}
          />
        ))}
      </View>
      {session ? (
        <SessionSimulation key={selected} session={session} />
      ) : (
        <Text>Adicione uma divisão para visualizar.</Text>
      )}
    </View>
  );
}

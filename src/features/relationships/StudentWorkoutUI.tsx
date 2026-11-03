import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Text } from '@/components/ui';
import type { Exercise, WorkoutContent } from './workoutModel';
import type { Execution } from './Executions';
import { estimatedMinutes } from './trainingExperience';
import { SelectedExercisePreview } from './SelectedExercisePreview';

export const trainingColors = {
  card: '#192216',
  border: '#34442C',
  accent: '#C0F568',
  muted: '#AAB9A1',
};
export function TrainingProgress({ current, status }: { current: Execution; status: string }) {
  const sets = current.progress.flat(),
    done = sets.filter((s) => s.done).length;
  const percent = sets.length ? Math.round((done / sets.length) * 100) : 0;
  return (
    <View
      style={{
        padding: 12,
        gap: 8,
        borderRadius: 16,
        backgroundColor: '#26371C',
        borderWidth: 1,
        borderColor: '#4A6437',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ flex: 1, fontSize: 17, lineHeight: 23, fontWeight: '600' }}>
          {current.snapshot.session.name}
        </Text>
        <Text color={trainingColors.accent}>
          {done}/{sets.length}
        </Text>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Progresso do treino"
        accessibilityValue={{ min: 0, max: sets.length, now: done }}
        style={{ height: 4, borderRadius: 4, backgroundColor: '#405333', overflow: 'hidden' }}
      >
        <View
          style={{
            height: 4,
            width: (percent + '%') as `${number}%`,
            backgroundColor: trainingColors.accent,
          }}
        />
      </View>
      <Text variant="caption" accessibilityLiveRegion="polite">
        {sets.length - done} séries restantes ·{' '}
        {status === 'Salvo' ? 'Salvo automaticamente' : status}
      </Text>
    </View>
  );
}

export function StudentSessionCard({
  session,
  index,
  disabled,
  onStart,
}: {
  session: WorkoutContent['sessions'][number];
  index: number;
  disabled: boolean;
  onStart: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View
      style={{
        borderRadius: 20,
        padding: 18,
        gap: 14,
        backgroundColor: trainingColors.card,
        borderWidth: 1,
        borderColor: trainingColors.border,
      }}
    >
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: '#304322',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text color={trainingColors.accent} style={{ fontWeight: '700' }}>
            {String(index + 1).padStart(2, '0')}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="title">{session.name}</Text>
          <Text variant="caption">
            {session.exercises.length} exercícios · ~{estimatedMinutes(session.exercises)} min
            {session.days ? ` · ${session.days}` : ''}
          </Text>
        </View>
      </View>
      <Text variant="caption">
        {[...new Set(session.exercises.map((e) => e.muscle).filter(Boolean))].join(' · ') ||
          'Treino prescrito para você'}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={{
          minHeight: 44,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text color={trainingColors.accent}>
          {open ? 'Recolher exercícios' : 'Conferir exercícios'}
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          color={trainingColors.accent}
          size={18}
        />
      </Pressable>
      {open
        ? session.exercises.map((e, i) => (
            <View
              key={i}
              style={{
                gap: 8,
                paddingVertical: 12,
                borderTopWidth: 1,
                borderColor: trainingColors.border,
              }}
            >
              <Text>
                {i + 1}. {e.name}
              </Text>
              <Text variant="caption">
                {e.sets} séries · {e.reps}{' '}
                {e.metric === 'seconds'
                  ? 'segundos'
                  : e.metric === 'meters'
                    ? 'metros'
                    : 'repetições'}{' '}
                · {e.rest_seconds}s de pausa
              </Text>
              <SelectedExercisePreview name={e.name} catalog={e.catalog} />
            </View>
          ))
        : null}
      <Button title={`Começar ${session.name}`} disabled={disabled} onPress={onStart} />
    </View>
  );
}
export function ExerciseHeading({
  exercise,
  index,
  done,
  total,
  open,
  onPress,
}: {
  exercise: Exercise;
  index: number;
  done: number;
  total: number;
  open: boolean;
  onPress: () => void;
}) {
  const complete = total > 0 && done === total;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${exercise.name}, ${done} de ${total} séries concluídas`}
      accessibilityState={{ expanded: open }}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          backgroundColor: complete ? '#C0F568' : '#304322',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {complete ? (
          <Ionicons name="checkmark" size={22} color="#172111" />
        ) : (
          <Text color={trainingColors.accent}>{index + 1}</Text>
        )}
      </View>
      <View style={{ flex: 1, gap: 5 }}>
        <Text style={{ fontSize: 17, fontWeight: '600' }}>{exercise.name}</Text>
        <Text variant="caption">
          {exercise.muscle ? `${exercise.muscle} · ` : ''}
          {done}/{total} séries
          {complete ? ' · concluído' : done ? ' · em andamento' : ' · pendente'}
        </Text>
      </View>
      <Ionicons
        name={open ? 'chevron-up' : 'chevron-down'}
        size={18}
        color={trainingColors.muted}
      />
    </Pressable>
  );
}

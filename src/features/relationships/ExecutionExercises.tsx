import { PlatePicker } from './PlatePicker';
import { SetTableHeader, SetTableRow } from './SetTableRow';
import type { PersonalRecord } from './trainingAchievements';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Text } from '@/components/ui';
import { Exercise, effortLabel, setEffort, unit } from './workoutModel';
import { SetLog } from './trainingRuntime';
import { seriesFor, kindInfo, techniqueInfo } from './trainingMethods';
import { GuidedGroup } from './GuidedGroup';
import { TrainingSet } from './TrainingSet';
import { SelectedExercisePreview } from './SelectedExercisePreview';
import { DetailsPanel } from './DetailsPanel';
import { ExerciseHeading, trainingColors } from './StudentWorkoutUI';
import type { PreviousSet } from './trainingExperience';
export function ExecutionExercises({
  exercises,
  progress,
  onChange,
  previous,
  achievements = [],
  renderFeedback,
}: {
  renderFeedback?: (index: number) => React.ReactNode;
  achievements?: PersonalRecord[];
  exercises: Exercise[];
  progress: SetLog[][];
  onChange: (ei: number, si: number, patch: Partial<SetLog>, rest?: number) => void;
  previous?: (PreviousSet | undefined)[][];
}) {
  const [plates, setPlates] = useState<{ ei: number; si: number } | null>(null);
  const [folded, setFolded] = useState<Record<number, boolean>>({});
  return (
    <View style={{ gap: 8 }}>
      {plates ? (
        <PlatePicker
          title={`${exercises[plates.ei].name} · Série ${plates.si + 1}`}
          onClose={() => setPlates(null)}
          onApply={(weight) => {
            onChange(plates.ei, plates.si, { weight });
            setPlates(null);
          }}
        />
      ) : null}
      <Text variant="caption">Cinza = sugestão · ✓ confirma os valores da linha</Text>
      {exercises.map((e, i) => {
        const open = folded[i] === undefined ? !progress[i].every((s) => s.done) : !folded[i];
        if (e.group_rule) {
          const indices = exercises.flatMap((x, n) =>
            x.group_rule?.id === e.group_rule!.id ? [n] : [],
          );
          if (indices[0] !== i) return null;
          return (
            <GuidedGroup
              key={i}
              exercises={exercises}
              indices={indices}
              progress={progress}
              onChange={onChange}
              previous={previous}
              renderFeedback={renderFeedback}
            />
          );
        }
        return (
          <View
            key={i}
            style={{
              gap: 8,
              padding: 10,
              borderRadius: 20,
              backgroundColor: trainingColors.card,
              borderWidth: 1,
              borderColor: open ? '#607A43' : trainingColors.border,
            }}
          >
            <ExerciseHeading
              exercise={e}
              index={i}
              done={progress[i].filter((s) => s.done).length}
              total={progress[i].length}
              open={open}
              onPress={() => setFolded((value) => ({ ...value, [i]: open }))}
            />
            {open ? (
              <View style={{ gap: 12 }}>
                <DetailsPanel
                  title="Ver prescrição"
                  leading={<SelectedExercisePreview catalog={e.catalog} name={e.name} compact />}
                  trailing={
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Calcular anilhas para ${e.name}`}
                      onPress={() =>
                        setPlates({
                          ei: i,
                          si: Math.max(
                            0,
                            progress[i].findIndex((s) => !s.done),
                          ),
                        })
                      }
                      style={{
                        alignSelf: 'flex-start',
                        width: 44,
                        height: 44,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 10,
                        backgroundColor: '#2A3B21',
                      }}
                    >
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          borderWidth: 3,
                          borderColor: '#C9F78C',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <View
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: '#C9F78C',
                          }}
                        />
                      </View>
                    </Pressable>
                  }
                >
                  {e.notes ? <Text>{e.notes}</Text> : null}
                  {progress[i].map((_, si) => {
                    const p = seriesFor(e, si);
                    return (
                      <View
                        key={si}
                        style={{
                          padding: 8,
                          gap: 3,
                          borderRadius: 8,
                          backgroundColor: '#202B1A',
                        }}
                      >
                        <Text>
                          Série {si + 1} · {kindInfo[p.kind].label}
                        </Text>
                        <Text variant="caption">
                          {p.target} {unit(e)} · {p.rest}s de descanso
                          {setEffort(e, si) ? ' · ' + effortLabel(setEffort(e, si)) : ''}
                          {p.load ? ' · ' + p.load : ''}
                        </Text>
                        {p.technique ? (
                          <Text variant="caption">{techniqueInfo[p.technique.type].label}</Text>
                        ) : null}
                        {p.notes ? <Text variant="caption">{p.notes}</Text> : null}
                      </View>
                    );
                  })}
                </DetailsPanel>

                <SetTableHeader exercise={e} />
                {progress[i].map((s, si) =>
                  seriesFor(e, si).technique ? (
                    <TrainingSet
                      key={si}
                      defaultOpen={si === progress[i].findIndex((item) => !item.done)}
                      exercise={e}
                      index={si}
                      log={s}
                      achievement={
                        s.done &&
                        achievements.some(
                          (record) =>
                            record.exercise === e.name &&
                            record.kind === seriesFor(e, si).kind &&
                            !seriesFor(e, si).technique &&
                            (record.type === 'load'
                              ? record.value === s.weight
                              : record.value === s.reps && record.weight === s.weight),
                        )
                          ? '🏆 Nova marca no histórico recente!'
                          : undefined
                      }
                      previous={previous?.[i]?.[si]}
                      preceding={
                        si > 0 &&
                        progress[i][si - 1].done &&
                        seriesFor(e, si - 1).kind === seriesFor(e, si).kind &&
                        !seriesFor(e, si - 1).technique
                          ? progress[i][si - 1]
                          : undefined
                      }
                      onChange={(patch, rest) => onChange(i, si, patch, rest)}
                    />
                  ) : (
                    <SetTableRow
                      key={si}
                      exercise={e}
                      index={si}
                      log={s}
                      previous={
                        si > 0 &&
                        progress[i][si - 1].done &&
                        seriesFor(e, si - 1).kind === seriesFor(e, si).kind &&
                        !seriesFor(e, si - 1).technique
                          ? progress[i][si - 1]
                          : previous?.[i]?.[si]?.log
                      }
                      onChange={(patch, rest) => onChange(i, si, patch, rest)}
                    />
                  ),
                )}
                {renderFeedback?.(i)}
                {progress[i].every((s) => s.done) && i < exercises.length - 1 ? (
                  <Button
                    title="Próximo exercício"
                    onPress={() => setFolded((value) => ({ ...value, [i]: true, [i + 1]: false }))}
                  />
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
export function TrainingLogSummary({ exercise: e, logs }: { exercise: Exercise; logs: SetLog[] }) {
  return (
    <View style={{ gap: 8 }}>
      {logs.map((s, i) => {
        const p = seriesFor(e, i);
        return (
          <View key={i} style={{ gap: 4 }}>
            <Text>
              Série {i + 1} · {kindInfo[p.kind].label} · {s.done ? 'concluída' : 'não concluída'}
            </Text>
            <Text variant="caption">
              Meta: {effortLabel(setEffort(e, i))} · realizado:{' '}
              {s.actual_effort ? effortLabel(s.actual_effort) : 'esforço não informado'}
            </Text>
            <Text>
              {s.weight ?? '—'} kg ·{' '}
              {s.seconds != null && p.technique?.type === 'isometric'
                ? `${s.seconds}s de sustentação`
                : `${s.reps ?? '—'} ${unit(e)}`}
            </Text>
            {s.rep_quality ? (
              <Text variant="caption">
                Qualidade:{' '}
                {s.rep_quality === 'good' ? 'Boa' : s.rep_quality === 'fair' ? 'Regular' : 'Ruim'}
              </Text>
            ) : null}
            {p.notes ? <Text variant="caption">Orientação: {p.notes}</Text> : null}
            {p.technique ? (
              <Text variant="caption">{techniqueInfo[p.technique.type].label}</Text>
            ) : null}
            {s.steps?.map((step, j) => (
              <Text key={j} variant="caption">
                Etapa {j + 1}: {step.weight ?? '—'} kg ·{' '}
                {p.technique?.type === 'isometric'
                  ? `${step.seconds ?? '—'}s`
                  : `${step.reps ?? '—'} ${unit(e)}`}{' '}
                · {step.done ? 'concluída' : 'pendente'}
              </Text>
            ))}
          </View>
        );
      })}
    </View>
  );
}

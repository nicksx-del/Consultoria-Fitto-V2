import React, { useState } from 'react';
import { View } from 'react-native';
import { Button, Text } from '@/components/ui';
import { Exercise } from './workoutModel';
import { seriesFor, groupInfo } from './trainingMethods';
import { TrainingSet } from './TrainingSet';
import { SetLog, nextGroupSet } from './trainingRuntime';
import { TrainingHelp } from './TrainingHelp';
import type { PreviousSet } from './trainingExperience';
export function GuidedGroup({
  exercises,
  indices,
  progress,
  onChange,
  previous,
}: {
  exercises: Exercise[];
  indices: number[];
  progress: SetLog[][];
  onChange: (ei: number, si: number, patch: Partial<SetLog>, rest?: number) => void;
  previous?: (PreviousSet | undefined)[][];
}) {
  const [review, setReview] = useState(false);
  const group = exercises[indices[0]].group_rule!;
  const next = nextGroupSet(exercises, indices, progress, group.rounds);
  return (
    <View
      style={{ gap: 12, padding: 14, borderWidth: 1, borderColor: '#638448', borderRadius: 16 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text variant="title" style={{ flex: 1 }}>
          {groupInfo[group.type].label} · {group.rounds} voltas
        </Text>
        <TrainingHelp info={groupInfo[group.type]} />
      </View>
      <Text>{indices.map((i) => exercises[i].name).join(' → ')}</Text>
      <Text variant="caption">
        {group.rest_seconds}s entre voltas. A próxima série aparece automaticamente ao concluir a
        atual.
      </Text>
      {next ? (
        <>
          <Text color="#B7F34A">
            Volta {next.round + 1}/{group.rounds} · movimento {next.member + 1}/{indices.length}
          </Text>
          <Text variant="title">{exercises[next.exerciseIndex].name}</Text>
          {exercises[next.exerciseIndex].notes ? (
            <Text>{exercises[next.exerciseIndex].notes}</Text>
          ) : null}
          <TrainingSet
            key={`${next.exerciseIndex}:${next.round}`}
            exercise={exercises[next.exerciseIndex]}
            index={next.round}
            log={progress[next.exerciseIndex][next.round]}
            previous={previous?.[next.exerciseIndex]?.[next.round]}
            preceding={
              next.round > 0 &&
              progress[next.exerciseIndex][next.round - 1].done &&
              seriesFor(exercises[next.exerciseIndex], next.round - 1).kind ===
                seriesFor(exercises[next.exerciseIndex], next.round).kind &&
              !seriesFor(exercises[next.exerciseIndex], next.round - 1).technique
                ? progress[next.exerciseIndex][next.round - 1]
                : undefined
            }
            finalRest={next.member === indices.length - 1 ? group.rest_seconds : 0}
            onChange={(patch, rest) => onChange(next.exerciseIndex, next.round, patch, rest)}
          />
        </>
      ) : (
        <Text color="#B7F34A">Grupo concluído.</Text>
      )}
      <Button
        title={review ? 'Recolher séries do grupo' : 'Revisar séries e registrar feedback'}
        variant="outline"
        onPress={() => setReview(!review)}
      />
      {review
        ? indices.map((ei) => (
            <View key={ei} style={{ gap: 10 }}>
              <Text variant="title">{exercises[ei].name}</Text>
              {progress[ei].map((s, si) => (
                <TrainingSet
                  key={si}
                  exercise={exercises[ei]}
                  index={si}
                  log={s}
                  previous={previous?.[ei]?.[si]}
                  finalRest={ei === indices[indices.length - 1] ? group.rest_seconds : 0}
                  onChange={(patch, rest) => onChange(ei, si, patch, rest)}
                />
              ))}
            </View>
          ))
        : null}
    </View>
  );
}

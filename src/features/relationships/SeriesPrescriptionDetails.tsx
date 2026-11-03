import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui';
import { Exercise, effortLabel, setEffort, unit } from './workoutModel';
import { kindInfo, seriesFor, techniqueInfo } from './trainingMethods';
import { TrainingHelp } from './TrainingHelp';
export function SeriesPrescriptionDetails({
  exercise: e,
  index,
}: {
  exercise: Exercise;
  index: number;
}) {
  const p = seriesFor(e, index);
  return (
    <View style={{ gap: 5 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ flex: 1 }}>
          Série {index + 1} · {kindInfo[p.kind].label} · {effortLabel(setEffort(e, index))}
        </Text>
        <TrainingHelp info={kindInfo[p.kind]} />
      </View>
      <Text variant="caption">
        {p.target} {unit(e)} · {p.load || 'carga livre'} · {p.rest}s descanso
      </Text>
      {p.notes ? <Text>Orientação: {p.notes}</Text> : null}
      {p.technique ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ flex: 1 }} color="#B7F34A">
              {techniqueInfo[p.technique.type].label}
            </Text>
            <TrainingHelp info={techniqueInfo[p.technique.type]} />
          </View>
          {p.technique.steps.map((s, i) => (
            <Text key={i} variant="caption">
              Etapa {i + 1}:{' '}
              {p.technique?.type === 'isometric'
                ? `${s.seconds}s de sustentação`
                : `${s.target} ${unit(e)}`}{' '}
              · {s.load || 'carga livre'}
              {s.reduction ? ` · redução de ${s.reduction}%` : ''}
              {i < p.technique!.steps.length - 1 ? ` · ${s.rest}s até a próxima etapa` : ''}
            </Text>
          ))}
        </>
      ) : null}
    </View>
  );
}

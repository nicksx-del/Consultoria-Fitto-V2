import React from 'react';
import { Linking, View } from 'react-native';
import { Button, Text } from '@/components/ui';
import { WorkoutContent, prescription, unit } from './workoutModel';
import { SelectedExercisePreview } from './SelectedExercisePreview';
import { DetailsPanel } from './DetailsPanel';
import { SeriesPrescriptionDetails } from './SeriesPrescriptionDetails';
import { groupInfo } from './trainingMethods';
import { phaseAt } from './trainingPlanning';
export function WorkoutPreview({
  content,
  showSeries = false,
}: {
  content: WorkoutContent;
  showSeries?: boolean;
}) {
  return (
    <View style={{ gap: 14 }}>
      <Text variant="title">{content.title}</Text>
      {phaseAt(content) ? (
        <Text color="#B7F34A">
          Semana {phaseAt(content)!.week} · {phaseAt(content)!.label}
        </Text>
      ) : null}
      {content.phases?.map((p, i) => (
        <Text key={i} variant="caption">
          {p.name} · {p.weeks} semana(s) · {p.kind === 'deload' ? 'Deload' : 'Desenvolvimento'}
          {p.notes ? ` · ${p.notes}` : ''}
        </Text>
      ))}
      {content.goal ? <Text>Objetivo: {content.goal}</Text> : null}
      {content.starts || content.review ? (
        <Text>
          Início: {content.starts || 'não definido'} · Revisão: {content.review || 'não definida'}
        </Text>
      ) : null}
      {content.notes ? <Text>{content.notes}</Text> : null}
      {content.sessions.map((s, i) => (
        <View key={i} style={{ gap: 10 }}>
          <Text variant="title">
            {s.name}
            {s.days ? ` · ${s.days}` : ''}
          </Text>
          {s.exercises.map((e, j) => (
            <View
              key={j}
              style={{ gap: 6, padding: 12, backgroundColor: '#252D1E', borderRadius: 12 }}
            >
              <Text variant="title">
                {j + 1}. {e.name}
              </Text>
              <Text>
                {e.sets} séries × {e.reps} {unit(e)} · descanso {e.rest_seconds}s
              </Text>
              {e.group_rule ? (
                <Text color="#B7F34A">
                  {groupInfo[e.group_rule.type].label} · {e.group_rule.rounds} voltas ·{' '}
                  {e.group_rule.rest_seconds}s entre voltas
                </Text>
              ) : null}
              {prescription(e) ? <Text>{prescription(e)}</Text> : null}
              {e.prescribed_sets?.length ? (
                showSeries ? (
                  <View style={{ gap: 8 }}>
                    {e.prescribed_sets.map((_, n) => (
                      <SeriesPrescriptionDetails key={n} exercise={e} index={n} />
                    ))}
                  </View>
                ) : (
                  <DetailsPanel title="Conferir prescrição por série">
                    {e.prescribed_sets?.map((_, n) => (
                      <SeriesPrescriptionDetails key={n} exercise={e} index={n} />
                    ))}
                  </DetailsPanel>
                )
              ) : null}
              {e.notes ? <Text>{e.notes}</Text> : null}
              {e.approved_alternatives?.length ? (
                <Text>
                  Alternativas aprovadas: {e.approved_alternatives.map((a) => a.name).join(', ')}
                </Text>
              ) : null}
              <SelectedExercisePreview catalog={e.catalog} name={e.name} />
              {e.video && /^https:\/\/\S+$/.test(e.video) ? (
                <Button
                  title="Abrir demonstração"
                  variant="ghost"
                  onPress={() => void Linking.openURL(e.video!)}
                />
              ) : null}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

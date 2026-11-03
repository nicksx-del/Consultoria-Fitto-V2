import React from 'react';
import { View } from 'react-native';
import { Button, Text, TextField } from '@/components/ui';
import { DetailsPanel } from './DetailsPanel';
import type { Draft } from './workoutModel';
import { phaseAt, weeklyVolume } from './trainingPlanning';
export function TrainingPlanningPanel({
  draft,
  onChange,
  disabled,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  disabled: boolean;
}) {
  const phases = draft.phases || [];
  const current = phaseAt(draft);
  return (
    <View style={{ gap: 12 }}>
      <DetailsPanel title="Volume semanal por músculo">
        <Text variant="caption">
          Contagem direta pelo músculo principal. Técnicas contam como uma série; aquecimento e
          aproximação ficam separados. Sem estimativa de estímulo indireto.
        </Text>
        {draft.sessions.map((s, i) => (
          <TextField
            key={s.key}
            label={`${s.name}: sessões por semana`}
            keyboardType="number-pad"
            value={String(s.times_per_week ?? 1)}
            editable={!disabled}
            maxLength={1}
            onChangeText={(v) =>
              onChange({
                ...draft,
                sessions: draft.sessions.map((x, n) =>
                  n === i ? { ...x, times_per_week: Number(v) } : x,
                ),
              })
            }
          />
        ))}
        {weeklyVolume(draft).map(([muscle, v]) => (
          <View key={muscle} style={{ gap: 5 }}>
            <Text>
              {muscle}: {v.work} séries de trabalho · {v.preparation} preparatórias
            </Text>
            <View style={{ height: 5, borderRadius: 4, backgroundColor: '#35432C' }}>
              <View
                style={{
                  height: 5,
                  borderRadius: 4,
                  backgroundColor: '#B7F34A',
                  width: `${Math.min(100, v.work * 3)}%`,
                }}
              />
            </View>
          </View>
        ))}
      </DetailsPanel>
      <DetailsPanel title="Periodização e deload">
        <Text variant="caption">
          Defina a data de início em Objetivo e datas. As fases organizam o calendário; carga e
          séries só mudam após edição e publicação pelo treinador.
        </Text>
        {current ? (
          <Text color="#B7F34A">
            Semana {current.week} · {current.label}
          </Text>
        ) : null}
        {phases.map((p, i) => (
          <View
            key={i}
            style={{
              gap: 8,
              padding: 12,
              borderWidth: 1,
              borderColor: '#35432C',
              borderRadius: 12,
            }}
          >
            <TextField
              label={`Nome da fase ${i + 1}`}
              value={p.name}
              maxLength={80}
              editable={!disabled}
              onChangeText={(name) =>
                onChange({ ...draft, phases: phases.map((x, n) => (n === i ? { ...x, name } : x)) })
              }
            />
            <TextField
              label="Duração em semanas (1–26)"
              value={String(p.weeks)}
              keyboardType="number-pad"
              maxLength={2}
              editable={!disabled}
              onChangeText={(v) =>
                onChange({
                  ...draft,
                  phases: phases.map((x, n) => (n === i ? { ...x, weeks: Number(v) } : x)),
                })
              }
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['build', 'deload'] as const).map((kind) => (
                <Button
                  key={kind}
                  title={kind === 'build' ? 'Desenvolvimento' : 'Deload'}
                  variant={p.kind === kind ? 'primary' : 'outline'}
                  disabled={disabled}
                  onPress={() =>
                    onChange({
                      ...draft,
                      phases: phases.map((x, n) => (n === i ? { ...x, kind } : x)),
                    })
                  }
                />
              ))}
            </View>
            <TextField
              label="Metas e ajustes desta fase"
              value={p.notes}
              multiline
              maxLength={500}
              editable={!disabled}
              onChangeText={(notes) =>
                onChange({
                  ...draft,
                  phases: phases.map((x, n) => (n === i ? { ...x, notes } : x)),
                })
              }
            />
            <Button
              title="Remover fase"
              variant="ghost"
              disabled={disabled}
              onPress={() => onChange({ ...draft, phases: phases.filter((_, n) => n !== i) })}
            />
          </View>
        ))}
        <Button
          title="+ Adicionar fase"
          variant="outline"
          disabled={disabled || phases.length >= 12}
          onPress={() =>
            onChange({
              ...draft,
              phases: [
                ...phases,
                { name: `Fase ${phases.length + 1}`, weeks: 4, kind: 'build', notes: '' },
              ],
            })
          }
        />
      </DetailsPanel>
    </View>
  );
}

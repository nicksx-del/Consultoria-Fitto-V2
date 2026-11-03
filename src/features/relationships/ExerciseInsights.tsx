import React, { useState } from 'react';
import { View } from 'react-native';
import { Button, Text, TextField } from '@/components/ui';
import { DetailsPanel } from './DetailsPanel';
import { DraftExercise, effortLabel } from './workoutModel';
import type { Execution } from './Executions';
import { latestPerformance, progressionSuggestion, applyProgression } from './trainingPlanning';
import { ExerciseLibrary } from './ExerciseLibrary';
import { catalogReference, exerciseName } from './exerciseCatalog';
export function ExerciseInsights({
  profileId,
  exercise: e,
  history,
  onChange,
  disabled,
}: {
  profileId: string;
  exercise: DraftExercise;
  history: Execution[];
  onChange: (p: Partial<DraftExercise>) => void;
  disabled: boolean;
}) {
  const [library, setLibrary] = useState(false);
  const [incrementInput, setIncrementInput] = useState<string | null>(null);
  const last = latestPerformance(e, history),
    suggestion = progressionSuggestion(e, history);
  const alternatives = e.approved_alternatives || [];
  return (
    <View style={{ gap: 8 }}>
      <DetailsPanel title="Histórico, progressão e alternativas">
        {last ? (
          <View style={{ padding: 10, borderRadius: 10, backgroundColor: '#252D1E', gap: 4 }}>
            <Text variant="caption">
              Última execução de {e.name} · {new Date(last.date).toLocaleDateString('pt-BR')}
            </Text>
            {last.logs.map((l, i) => (
              <Text key={i} variant="caption">
                Série {i + 1}: {l.done ? '✓' : '—'} {l.weight ?? '—'} kg × {l.reps ?? '—'}{' '}
                {e.metric === 'seconds' ? 's' : e.metric === 'meters' ? 'm' : 'rep.'} ·{' '}
                {l.actual_effort ? effortLabel(l.actual_effort) : 'RIR/RPE não informado'}
              </Text>
            ))}
          </View>
        ) : (
          <Text variant="caption">Sem execução concluída deste exercício.</Text>
        )}
        <View style={{ gap: 10 }}>
          <Text variant="caption">
            A sugestão exige todas as séries de trabalho concluídas na última execução, atingindo a
            meta. Não altera a ficha sem sua aprovação. Técnicas e unidades de tempo/distância
            exigem revisão manual.
          </Text>
          {!e.progression ? (
            <Button
              title="Configurar progressão"
              variant="outline"
              disabled={disabled}
              onPress={() =>
                onChange({ progression: { mode: 'load', increment: 2, target_reps: 12 } })
              }
            />
          ) : (
            <>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['load', 'reps'] as const).map((mode) => (
                  <Button
                    key={mode}
                    title={mode === 'load' ? 'Carga (kg)' : 'Repetições'}
                    variant={e.progression?.mode === mode ? 'primary' : 'outline'}
                    disabled={disabled}
                    onPress={() =>
                      onChange({
                        progression: {
                          ...e.progression!,
                          mode,
                          increment: mode === 'reps' ? 1 : 2,
                        },
                      })
                    }
                  />
                ))}
              </View>
              <TextField
                label="Meta de repetições em todas as séries"
                value={String(e.progression.target_reps)}
                keyboardType="number-pad"
                editable={!disabled}
                maxLength={4}
                onChangeText={(v) =>
                  onChange({ progression: { ...e.progression!, target_reps: Number(v) } })
                }
              />
              <TextField
                label={
                  e.progression.mode === 'load'
                    ? 'Incremento de carga (kg)'
                    : 'Incremento de repetições'
                }
                value={incrementInput ?? String(e.progression.increment)}
                onFocus={() => setIncrementInput(String(e.progression!.increment))}
                onBlur={() => setIncrementInput(null)}
                keyboardType="decimal-pad"
                editable={!disabled}
                maxLength={6}
                onChangeText={(v) => {
                  setIncrementInput(v);
                  onChange({
                    progression: { ...e.progression!, increment: Number(v.replace(',', '.')) },
                  });
                }}
              />
              {suggestion ? (
                <>
                  <Text color="#B7F34A">
                    Sugestão: {suggestion.load || 'carga livre'} · {suggestion.reps} rep.
                  </Text>
                  <Button
                    title="Aplicar sugestão ao rascunho"
                    disabled={disabled}
                    onPress={() => onChange(applyProgression(e, suggestion))}
                  />
                </>
              ) : (
                <Text variant="caption">
                  Sem sugestão automática disponível. Revise os registros e a meta.
                </Text>
              )}
              <Button
                title="Remover regra de progressão"
                variant="ghost"
                disabled={disabled}
                onPress={() => onChange({ progression: undefined })}
              />
            </>
          )}
          <Text variant="title">Metas por semana</Text>
          <Text variant="caption">
            O treinador aplica a semana desejada ao rascunho e publica. As metas não substituem
            automaticamente a prescrição.
          </Text>
          {(e.weekly_targets || []).map((t, i) => (
            <View
              key={i}
              style={{
                gap: 8,
                padding: 10,
                borderWidth: 1,
                borderColor: '#35432C',
                borderRadius: 10,
              }}
            >
              <TextField
                label="Semana do ciclo (1–52)"
                value={String(t.week)}
                keyboardType="number-pad"
                maxLength={2}
                editable={!disabled}
                onChangeText={(v) =>
                  onChange({
                    weekly_targets: e.weekly_targets!.map((x, n) =>
                      n === i ? { ...x, week: Number(v) } : x,
                    ),
                  })
                }
              />
              <TextField
                label="Carga planejada"
                value={t.load}
                maxLength={100}
                editable={!disabled}
                onChangeText={(load) =>
                  onChange({
                    weekly_targets: e.weekly_targets!.map((x, n) => (n === i ? { ...x, load } : x)),
                  })
                }
              />
              <TextField
                label="Alvo planejado"
                value={t.reps}
                maxLength={40}
                editable={!disabled}
                onChangeText={(reps) =>
                  onChange({
                    weekly_targets: e.weekly_targets!.map((x, n) => (n === i ? { ...x, reps } : x)),
                  })
                }
              />
              <Button
                title={`Aplicar meta da semana ${t.week}`}
                disabled={disabled || !t.reps.trim()}
                onPress={() => onChange(applyProgression(e, t))}
              />
              <Button
                title="Remover meta semanal"
                variant="ghost"
                disabled={disabled}
                onPress={() =>
                  onChange({ weekly_targets: e.weekly_targets!.filter((_, n) => n !== i) })
                }
              />
            </View>
          ))}
          <Button
            title="+ Planejar semana"
            variant="outline"
            disabled={disabled || (e.weekly_targets?.length || 0) >= 26}
            onPress={() =>
              onChange({
                weekly_targets: [
                  ...(e.weekly_targets || []),
                  {
                    week: Math.max(0, ...(e.weekly_targets || []).map((t) => t.week)) + 1,
                    load: e.load || '',
                    reps: e.reps,
                  },
                ],
              })
            }
          />
          <Text variant="title">Alternativas aprovadas</Text>
          <Text variant="caption">
            O aluno escolhe antes de registrar as séries. A prescrição e a unidade são mantidas;
            aprove apenas movimentos compatíveis.
          </Text>
          {alternatives.map((a, i) => (
            <View key={i} style={{ gap: 4 }}>
              <Text>{a.name}</Text>
              <Button
                title={`Remover alternativa ${a.name}`}
                variant="ghost"
                disabled={disabled}
                onPress={() =>
                  onChange({ approved_alternatives: alternatives.filter((_, n) => n !== i) })
                }
              />
            </View>
          ))}
          <Button
            title="+ Autorizar alternativa da biblioteca"
            variant="outline"
            disabled={disabled || alternatives.length >= 5}
            onPress={() => setLibrary(true)}
          />
          {library ? (
            <ExerciseLibrary
              profileId={profileId}
              single
              existingIds={[e.catalog?.id, ...alternatives.map((a) => a.catalog?.id)].filter(
                (x): x is string => !!x,
              )}
              remaining={1}
              onClose={() => setLibrary(false)}
              onAdd={(items) => {
                const item = items[0];
                if (item)
                  onChange({
                    approved_alternatives: [
                      ...alternatives,
                      { name: exerciseName(item), catalog: catalogReference(item) },
                    ],
                  });
                setLibrary(false);
              }}
            />
          ) : null}
        </View>
      </DetailsPanel>
    </View>
  );
}

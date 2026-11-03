import { PlatePicker } from './PlatePicker';
import { adjustLogValue } from './plateMath';
import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Button, Text } from '@/components/ui';
import { DetailsPanel } from './DetailsPanel';
import type { Exercise } from './workoutModel';
import type { SetLog } from './trainingRuntime';
import { quickSuggestions } from './quickSet';
export function QuickSetEntry({
  exercise,
  index,
  log,
  previous,
  onChange,
  children,
}: {
  exercise: Exercise;
  index: number;
  log: SetLog;
  previous?: SetLog;
  onChange: (patch: Partial<SetLog>) => void;
  children: React.ReactNode;
}) {
  const [plates, setPlates] = useState(false),
    [manual, setManual] = useState(false),
    [step, setStep] = useState(2.5);
  const suggested = quickSuggestions(exercise, index, previous);
  const metric = exercise.metric === 'seconds' ? 's' : exercise.metric === 'meters' ? 'm' : 'reps';
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['weight', 'reps'] as const).map((field) => (
          <Pressable
            key={field}
            accessibilityRole="button"
            accessibilityLabel={`${log[field] != null ? 'Editar' : 'Usar'} ${log[field] ?? suggested[field] ?? ''} ${field === 'weight' ? 'kg' : metric}, série ${index + 1}`}
            onPress={() =>
              log[field] == null && suggested[field] != null
                ? onChange({ [field]: suggested[field] })
                : setManual(true)
            }
            style={{
              flex: 1,
              minHeight: 56,
              padding: 10,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: log[field] != null ? '#94C650' : '#435637',
              backgroundColor: log[field] != null ? '#2B401F' : '#1B2814',
            }}
          >
            <Text style={{ fontSize: 19, lineHeight: 26, fontWeight: '600' }}>
              {log[field] ?? suggested[field] ?? '—'}{' '}
              <Text variant="caption">{field === 'weight' ? 'kg' : metric}</Text>
            </Text>
            <Text variant="caption" style={{ fontSize: 11 }}>
              {log[field] != null ? '✓ Confirmado · editar' : 'Toque para confirmar'}
            </Text>
          </Pressable>
        ))}
      </View>
      {manual ? (
        <View style={{ gap: 8 }}>
          {children}
          <Button title="Fechar campos" variant="ghost" onPress={() => setManual(false)} />
        </View>
      ) : null}
      <DetailsPanel title="Ajustar valores, anilhas e histórico">
        <Text variant="caption">{suggested.source}. Confirme o que realizou.</Text>
        {children}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['weight', 'reps'] as const).map((field) => (
            <View key={field} style={{ flex: 1, gap: 4 }}>
              <Text variant="caption">{field === 'weight' ? 'Carga' : 'Realizado'}</Text>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {[-1, 1].map((direction) => (
                  <Button
                    key={direction}
                    title={direction > 0 ? '+' : '−'}
                    accessibilityLabel={`${direction > 0 ? 'Aumentar' : 'Diminuir'} ${field === 'weight' ? 'carga' : 'repetições'}, série ${index + 1}`}
                    style={{ flex: 1, paddingHorizontal: 4 }}
                    variant="outline"
                    onPress={() =>
                      onChange({
                        [field]: adjustLogValue(
                          log[field] ?? suggested[field],
                          direction * (field === 'weight' ? step : 1),
                          field === 'weight'
                            ? 2000
                            : exercise.metric && exercise.metric !== 'reps'
                              ? 1000000
                              : 1000,
                        ),
                      })
                    }
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
        <Button
          title={'Passo: ' + step.toLocaleString('pt-BR') + ' kg'}
          variant="ghost"
          onPress={() =>
            setStep((value) => {
              const options = [0.5, 1, 2.5, 5];
              return options[(options.indexOf(value) + 1) % options.length];
            })
          }
        />
        <Button title="Registrar por anilhas" variant="outline" onPress={() => setPlates(true)} />
        {previous && previous.weight != null && previous.reps != null && !log.done ? (
          <Button
            title={`Repetir ${previous.weight} kg · ${previous.reps} ${metric}`}
            variant="outline"
            onPress={() => onChange({ weight: previous.weight, reps: previous.reps })}
          />
        ) : null}
      </DetailsPanel>
      {plates ? (
        <PlatePicker onClose={() => setPlates(false)} onApply={(weight) => onChange({ weight })} />
      ) : null}
    </View>
  );
}

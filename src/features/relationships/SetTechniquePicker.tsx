import React, { useState } from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { Button, Text, TextField } from '@/components/ui';
import { SetPrescription } from './workoutModel';
import { kindInfo, techniqueInfo, methodProblems } from './trainingMethods';
import { TrainingHelp } from './TrainingHelp';
export function SetTechniquePicker({
  value,
  index,
  onSave,
  onClose,
}: {
  value: SetPrescription;
  index: number;
  onSave: (value: SetPrescription) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<SetPrescription>(() => structuredClone(value));
  const [error, setError] = useState('');
  function technique(type: keyof typeof techniqueInfo) {
    if (type === 'traditional') {
      setDraft((d) => ({ ...d, technique: undefined }));
      return;
    }
    const count = type === 'isometric' ? 1 : 2;
    setDraft((d) => ({
      ...d,
      technique: {
        type,
        steps: Array.from({ length: count }, (_, i) => ({
          target: d.target,
          load: d.load,
          rest: type === 'drop_set' ? '0' : '20',
          ...(type === 'isometric' ? { seconds: '20' } : {}),
          ...(type === 'drop_set' && i > 0 ? { reduction: '20' } : {}),
        })),
      },
    }));
  }
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: '#11190D',
          padding: 16,
          gap: 12,
          maxWidth: 680,
          width: '100%',
          alignSelf: 'center',
        }}
      >
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Text variant="title">Série {index + 1}</Text>
          <Button title="Cancelar" variant="ghost" onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={{ gap: 14 }} keyboardShouldPersistTaps="handled">
          <Text variant="title">Tipo da série</Text>
          {Object.entries(kindInfo).map(([kind, info]) => (
            <View key={kind} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Button
                title={`${info.badge ? info.badge + ' · ' : ''}${info.label}`}
                style={{ flex: 1 }}
                variant={draft.kind === kind ? 'primary' : 'outline'}
                onPress={() =>
                  setDraft((d) => ({
                    ...d,
                    kind: kind as SetPrescription['kind'],
                    ...(['warmup', 'ramp'].includes(kind) ? { effort_target: undefined } : {}),
                  }))
                }
              />
              <TrainingHelp info={info} />
            </View>
          ))}
          <Text variant="title">Técnica de execução</Text>
          <Text variant="caption">
            Tipo e técnica são independentes. Uma série de trabalho pode usar rest-pause, por
            exemplo.
          </Text>
          {Object.entries(techniqueInfo).map(([type, info]) => (
            <View key={type} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Button
                title={info.label}
                style={{ flex: 1 }}
                variant={(draft.technique?.type || 'traditional') === type ? 'primary' : 'outline'}
                onPress={() => technique(type as keyof typeof techniqueInfo)}
              />
              <TrainingHelp info={info} />
            </View>
          ))}
          {draft.technique ? (
            <>
              <Text variant="title">Etapas prescritas</Text>
              <Text variant="caption">
                O intervalo de cada etapa acontece antes da próxima etapa. Ao terminar a última,
                vale o descanso da série.
              </Text>
              {draft.technique.steps.map((s, i) => {
                const patch = (value: Partial<typeof s>) =>
                  setDraft((d) => ({
                    ...d,
                    technique: {
                      ...d.technique!,
                      steps: d.technique!.steps.map((x, n) => (n === i ? { ...x, ...value } : x)),
                    },
                  }));
                return (
                  <View
                    key={i}
                    style={{ gap: 10, padding: 14, backgroundColor: '#24331B', borderRadius: 14 }}
                  >
                    <Text>
                      Etapa {i + 1}
                      {i === 0 ? ' · inicial' : ''}
                    </Text>
                    {draft.technique?.type === 'isometric' ? (
                      <TextField
                        label="Sustentação em segundos (1–1800)"
                        value={s.seconds || ''}
                        keyboardType="number-pad"
                        maxLength={4}
                        onChangeText={(seconds) => patch({ seconds: seconds.replace(/\D/g, '') })}
                      />
                    ) : (
                      <TextField
                        label="Alvo de repetições / unidade do exercício"
                        value={s.target}
                        maxLength={40}
                        onChangeText={(target) => patch({ target })}
                      />
                    )}
                    <TextField
                      label="Carga orientada (opcional)"
                      value={s.load}
                      maxLength={100}
                      onChangeText={(load) => patch({ load })}
                    />
                    {draft.technique?.type === 'drop_set' && i > 0 ? (
                      <TextField
                        label="Redução em % da etapa anterior (opcional)"
                        value={s.reduction || ''}
                        maxLength={2}
                        keyboardType="number-pad"
                        onChangeText={(reduction) =>
                          patch({ reduction: reduction.replace(/\D/g, '') })
                        }
                      />
                    ) : null}
                    {i < draft.technique!.steps.length - 1 ? (
                      <TextField
                        label="Pausa antes da próxima etapa (s)"
                        value={s.rest}
                        keyboardType="number-pad"
                        maxLength={4}
                        onChangeText={(rest) => patch({ rest: rest.replace(/\D/g, '') })}
                      />
                    ) : null}
                    <Button
                      title="Remover etapa"
                      variant="ghost"
                      disabled={
                        draft.technique!.steps.length <=
                        (draft.technique!.type === 'isometric' ? 1 : 2)
                      }
                      onPress={() =>
                        setDraft((d) => ({
                          ...d,
                          technique: {
                            ...d.technique!,
                            steps: d.technique!.steps.filter((_, n) => n !== i),
                          },
                        }))
                      }
                    />
                  </View>
                );
              })}
              <Button
                title="+ Adicionar etapa"
                variant="outline"
                disabled={draft.technique.steps.length >= 8}
                onPress={() =>
                  setDraft((d) => ({
                    ...d,
                    technique: {
                      ...d.technique!,
                      steps: [
                        ...d.technique!.steps,
                        structuredClone(d.technique!.steps[d.technique!.steps.length - 1]),
                      ],
                    },
                  }))
                }
              />
            </>
          ) : null}
          <TextField
            label="Orientação desta série (opcional)"
            value={draft.notes || ''}
            multiline
            maxLength={500}
            onChangeText={(notes) => setDraft((d) => ({ ...d, notes }))}
          />
          {error ? (
            <Text accessibilityRole="alert" color="#FFAF71">
              {error}
            </Text>
          ) : null}
        </ScrollView>
        <Button
          title="Aplicar à série"
          onPress={() => {
            const problems = methodProblems({
              name: '',
              sets: '1',
              reps: draft.target,
              rest_seconds: draft.rest,
              notes: '',
              key: 'validation',
              prescribed_sets: [draft],
            });
            if (problems.length) {
              setError(problems.join('\n'));
              return;
            }
            onSave(draft);
          }}
        />
      </View>
    </Modal>
  );
}

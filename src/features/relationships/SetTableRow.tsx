import React, { useState } from 'react';
import { Modal, View, TextInput, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Text } from '@/components/ui';
import type { Exercise } from './workoutModel';
import type { SetLog } from './trainingRuntime';
import { seriesFor, kindInfo } from './trainingMethods';
import { quickSuggestions } from './quickSet';
export function SetTableHeader({ exercise }: { exercise: Exercise }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center', paddingHorizontal: 4 }}>
      {[
        'Nº',
        'kg',
        exercise.metric === 'seconds' ? 's' : exercise.metric === 'meters' ? 'm' : 'Reps',
        'RIR',
        'Técnica',
        '✓',
      ].map((label, i) => (
        <Text
          key={i}
          variant="caption"
          style={{
            fontSize: 11,
            textAlign: 'center',
            width: i === 0 ? 24 : undefined,
            flex: i === 0 ? undefined : i === 1 ? 1.2 : 1,
          }}
        >
          {label}
        </Text>
      ))}
    </View>
  );
}
export function SetTableRow({
  exercise,
  index,
  log,
  previous,
  onChange,
}: {
  exercise: Exercise;
  index: number;
  log: SetLog;
  previous?: SetLog;
  onChange: (patch: Partial<SetLog>, rest?: number) => void;
}) {
  const [quality, setQuality] = useState(false);
  const [editing, setEditing] = useState<{ field: string; value: string } | null>(null);
  const suggested = quickSuggestions(exercise, index, previous),
    p = seriesFor(exercise, index);
  const metric =
    exercise.metric === 'seconds'
      ? 'segundos'
      : exercise.metric === 'meters'
        ? 'metros'
        : 'repetições';
  function input(field: 'weight' | 'reps' | 'rir', text: string) {
    if (!(field === 'weight' ? /^\d*(?:[.,]\d*)?$/ : /^\d*$/).test(text)) return;
    const n = Number(text.replace(',', '.')),
      max =
        field === 'weight'
          ? 2000
          : field === 'rir'
            ? 10
            : exercise.metric && exercise.metric !== 'reps'
              ? 1000000
              : 1000;
    if (text && text !== '.' && text !== ',' && (!Number.isFinite(n) || n > max)) return;
    setEditing({ field, value: text });
    if (text === '.' || text === ',') return;
    if (field === 'rir') onChange({ actual_effort: text ? { mode: 'rir', min: n, max: n } : null });
    else onChange({ [field]: text ? n : null });
  }
  const base = {
    minWidth: 0,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: log.done ? '#456332' : '#34412D',
    backgroundColor: log.done ? '#24371C' : '#151D11',
    color: '#F2F4EE',
    fontSize: 16,
    textAlign: 'center' as const,
    paddingHorizontal: 2,
  };
  const weight = log.weight ?? suggested.weight,
    reps = log.reps ?? suggested.reps;
  return (
    <>
      <View
        style={{
          flexDirection: 'row',
          gap: 4,
          alignItems: 'center',
          paddingVertical: 3,
          paddingHorizontal: 4,
          borderRadius: 10,
          backgroundColor: log.done ? '#1E2C17' : 'transparent',
        }}
      >
        <Text
          accessibilityLabel={'Série ' + (index + 1) + ' · ' + kindInfo[p.kind].label}
          style={{ width: 24, textAlign: 'center', fontSize: 13 }}
        >
          {kindInfo[p.kind].badge || index + 1}
        </Text>
        {(['weight', 'reps', 'rir'] as const).map((field) => (
          <TextInput
            key={field}
            accessibilityLabel={
              (field === 'weight'
                ? 'Carga em kg'
                : field === 'reps'
                  ? 'Realizado em ' + metric
                  : log.actual_effort?.mode === 'rpe'
                    ? 'RPE registrado, digite para substituir por RIR'
                    : 'RIR realizado') +
              ', série ' +
              (index + 1) +
              ', ' +
              exercise.name
            }
            placeholder={
              field === 'rir'
                ? '—'
                : String((field === 'weight' ? suggested.weight : suggested.reps) ?? '—')
            }
            placeholderTextColor="#87947C"
            value={
              editing?.field === field
                ? editing.value
                : field === 'rir'
                  ? log.actual_effort
                    ? String(log.actual_effort.min)
                    : ''
                  : log[field] == null
                    ? ''
                    : String(log[field])
            }
            keyboardType={field === 'weight' ? 'decimal-pad' : 'number-pad'}
            maxLength={8}
            onChangeText={(text) => input(field, text)}
            onBlur={() => setEditing(null)}
            style={{ ...base, flex: field === 'weight' ? 1.2 : 1 }}
          />
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            'Qualidade das repetições, série ' + (index + 1) + ', ' + exercise.name
          }
          onPress={() => setQuality(true)}
          style={{ ...base, flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 12 }}>
            {log.rep_quality === 'good'
              ? 'Boa'
              : log.rep_quality === 'fair'
                ? 'Regular'
                : log.rep_quality === 'poor'
                  ? 'Ruim'
                  : '—'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: log.done, disabled: !log.done && reps == null }}
          accessibilityLabel={
            (log.done
              ? 'Desmarcar'
              : 'Concluir com ' +
                (weight ?? 'carga não informada') +
                ' kg e ' +
                (reps ?? '—') +
                ' ' +
                metric) +
            ', série ' +
            (index + 1) +
            ', ' +
            exercise.name
          }
          disabled={!log.done && reps == null}
          onPress={() =>
            onChange(
              log.done
                ? { done: false }
                : { done: true, weight: weight ?? null, reps: reps ?? null },
              log.done ? undefined : Number(p.rest),
            )
          }
          style={{
            flex: 1,
            minHeight: 44,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
            backgroundColor: log.done ? '#B7F34A' : '#293620',
          }}
        >
          <Ionicons name="checkmark" size={21} color={log.done ? '#172111' : '#A7B59B'} />
        </Pressable>
      </View>
      {log.actual_effort?.mode === 'rpe' ? (
        <Text variant="caption">
          Série {index + 1}: esforço registrado em RPE ({log.actual_effort.min}).
        </Text>
      ) : null}
      {quality ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setQuality(false)}>
          <View style={{ flex: 1, backgroundColor: '#0009', justifyContent: 'flex-end' }}>
            <View
              style={{
                gap: 10,
                padding: 20,
                backgroundColor: '#172111',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
              }}
            >
              <Text variant="title">Qualidade das repetições</Text>
              <Text variant="caption">Sua avaliação da execução · série {index + 1}</Text>
              {(
                [
                  ['good', 'Boa · controle e amplitude'],
                  ['fair', 'Regular · algumas compensações'],
                  ['poor', 'Ruim · técnica comprometida'],
                  [null, 'Não informar'],
                ] as const
              ).map(([value, label]) => (
                <Button
                  key={String(value)}
                  title={label}
                  variant={log.rep_quality === value ? 'primary' : 'outline'}
                  onPress={() => {
                    onChange({ rep_quality: value });
                    setQuality(false);
                  }}
                />
              ))}
              <Button title="Voltar" variant="ghost" onPress={() => setQuality(false)} />
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}

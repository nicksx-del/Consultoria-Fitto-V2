import React, { useState } from 'react';
import { Modal, View, TextInput, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Text } from '@/components/ui';
import { effortLabel, setEffort, type Exercise } from './workoutModel';
import type { SetLog } from './trainingRuntime';
import { seriesFor, kindInfo } from './trainingMethods';
import { quickSuggestions } from './quickSet';

const setBadgeColors = {
  warmup: { color: '#9CD6FF', backgroundColor: '#203847' },
  ramp: { color: '#FFD18A', backgroundColor: '#45341B' },
  work: { color: '#C9F78C', backgroundColor: '#2B4022' },
  top: { color: '#C9F78C', backgroundColor: '#2B4022' },
  backoff: { color: '#C9F78C', backgroundColor: '#2B4022' },
};
const setBadgeWidth = 44;
const rirOptions = [0, 1, 2, 3, 4, 5];

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
            width: i === 0 ? setBadgeWidth : undefined,
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
  const [panel, setPanel] = useState<'quality' | 'rir' | 'type' | null>(null);
  const [editing, setEditing] = useState<{ field: string; value: string } | null>(null);
  const suggested = quickSuggestions(exercise, index, previous),
    p = seriesFor(exercise, index);
  const kind = kindInfo[p.kind];
  const kindLabel = p.kind === 'ramp' ? 'Preparatória (aproximação)' : kind.label;
  const badgeColors = setBadgeColors[p.kind];
  const target = setEffort(exercise, index);
  const actual = log.actual_effort;
  const rirDisplay = !actual
    ? '—'
    : actual.mode === 'rpe'
      ? 'RPE'
      : actual.min === 5 && actual.max === 10
        ? '5+'
        : actual.min === actual.max
          ? String(actual.min)
          : `${actual.min}–${actual.max}`;
  const metric =
    exercise.metric === 'seconds'
      ? 'segundos'
      : exercise.metric === 'meters'
        ? 'metros'
        : 'repetições';
  function input(field: 'weight' | 'reps', text: string) {
    if (!(field === 'weight' ? /^\d*(?:[.,]\d*)?$/ : /^\d*$/).test(text)) return;
    const n = Number(text.replace(',', '.')),
      max =
        field === 'weight' ? 2000 : exercise.metric && exercise.metric !== 'reps' ? 1000000 : 1000;
    if (text && text !== '.' && text !== ',' && (!Number.isFinite(n) || n > max)) return;
    setEditing({ field, value: text });
    if (text === '.' || text === ',') return;
    onChange({ [field]: text ? n : null });
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Tipo da série ${index + 1}, ${kindLabel}`}
          onPress={() => setPanel('type')}
          style={{
            width: setBadgeWidth,
            minHeight: 44,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: badgeColors.backgroundColor,
            borderRadius: 8,
          }}
        >
          <Text color={badgeColors.color} style={{ fontWeight: '700' }}>
            {kind.badge || index + 1}
          </Text>
        </Pressable>
        {(['weight', 'reps'] as const).map((field) => (
          <TextInput
            key={field}
            accessibilityLabel={
              (field === 'weight' ? 'Carga em kg' : 'Realizado em ' + metric) +
              ', série ' +
              (index + 1) +
              ', ' +
              exercise.name
            }
            placeholder={String((field === 'weight' ? suggested.weight : suggested.reps) ?? '—')}
            placeholderTextColor="#87947C"
            value={
              editing?.field === field
                ? editing.value
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
          accessibilityLabel={`RIR realizado, série ${index + 1}, ${exercise.name}, ${actual ? (rirDisplay === '5+' ? '5 ou mais' : effortLabel(actual)) : 'não informado'}`}
          onPress={() => setPanel('rir')}
          style={{ ...base, flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text color={actual ? '#C9F78C' : '#A7B59B'} style={{ fontSize: 13 }}>
            {rirDisplay}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            'Qualidade das repetições, série ' + (index + 1) + ', ' + exercise.name
          }
          onPress={() => setPanel('quality')}
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
      {panel ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setPanel(null)}>
          <View style={{ flex: 1, backgroundColor: '#0009', justifyContent: 'flex-end' }}>
            <View
              style={{
                gap: 10,
                padding: 20,
                width: '100%',
                maxWidth: 560,
                alignSelf: 'center',
                backgroundColor: '#172111',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
              }}
            >
              <Text variant="caption">
                {exercise.name} · Série {index + 1}
              </Text>
              {panel === 'type' ? (
                <>
                  <Text variant="title" color={badgeColors.color}>
                    {kindLabel}
                  </Text>
                  <Text>{kind.description}</Text>
                </>
              ) : panel === 'rir' ? (
                <>
                  <Text variant="title">RIR realizado</Text>
                  <Text>Quantas repetições ainda conseguiria fazer?</Text>
                  {target ? (
                    <Text variant="caption">Meta do treinador · {effortLabel(target)}</Text>
                  ) : null}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {rirOptions.map((value) => (
                      <Pressable
                        key={value}
                        accessibilityRole="button"
                        accessibilityLabel={value === 5 ? 'RIR 5 ou mais' : `RIR ${value}`}
                        accessibilityState={{
                          selected:
                            actual?.mode === 'rir' &&
                            rirDisplay === (value === 5 ? '5+' : String(value)),
                        }}
                        onPress={() => {
                          onChange({
                            actual_effort: {
                              mode: 'rir',
                              min: value,
                              max: value === 5 ? 10 : value,
                            },
                          });
                          setPanel(null);
                        }}
                        style={{
                          ...base,
                          minWidth: 44,
                          flexGrow: 1,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text
                          color={
                            actual?.mode === 'rir' &&
                            rirDisplay === (value === 5 ? '5+' : String(value))
                              ? '#C9F78C'
                              : undefined
                          }
                        >
                          {value === 5 ? '5+' : value}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  {actual ? (
                    <Button
                      title="Limpar esforço registrado"
                      variant="outline"
                      onPress={() => {
                        onChange({ actual_effort: null });
                        setPanel(null);
                      }}
                    />
                  ) : null}
                </>
              ) : (
                <>
                  <Text variant="title">Qualidade das repetições</Text>
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
                        setPanel(null);
                      }}
                    />
                  ))}
                </>
              )}
              <Button title="Fechar" variant="ghost" onPress={() => setPanel(null)} />
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}

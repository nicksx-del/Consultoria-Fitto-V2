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
  top: { color: '#E1B5FF', backgroundColor: '#3C2850' },
  backoff: { color: '#A5E7DE', backgroundColor: '#203D39' },
};
const setBadgeWidth = 44;
const qualityOptions = {
  good: {
    label: 'Boa',
    detail: 'Controle e amplitude',
    icon: 'checkmark-circle-outline',
    color: '#C9F78C',
    background: '#2B4022',
  },
  fair: {
    label: 'Regular',
    detail: 'Alguma compensação',
    icon: 'remove-circle-outline',
    color: '#FFD18A',
    background: '#45341B',
  },
  poor: {
    label: 'Ruim',
    detail: 'Perdi o controle',
    icon: 'alert-circle-outline',
    color: '#FFC4BC',
    background: '#512820',
  },
} as const;
const rirOptions = [
  { value: 0, color: '#FFC4BC', background: '#512820', effort: 'Falha' },
  { value: 1, color: '#FFC49A', background: '#4C3020', effort: 'Muito alto' },
  { value: 2, color: '#FBE39B', background: '#443818', effort: 'Alto' },
  { value: 3, color: '#E3EBAB', background: '#373D20', effort: 'Moderado' },
  { value: 4, color: '#D0F3AA', background: '#2C4023', effort: 'Leve' },
  { value: 5, color: '#A5E7DE', background: '#203D39', effort: 'Muito leve' },
];

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
  hasRecord = false,
  onViewRecord,
  onChange,
}: {
  exercise: Exercise;
  index: number;
  log: SetLog;
  previous?: SetLog;
  hasRecord?: boolean;
  onViewRecord?: () => void;
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
  const quality = log.rep_quality ? qualityOptions[log.rep_quality] : undefined;
  const record = log.done && hasRecord;
  const rirDisplay = !actual
    ? '—'
    : actual.mode === 'rpe'
      ? 'RPE'
      : actual.min >= 5
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
    borderColor: record ? '#8A6C2C' : log.done ? '#456332' : '#34412D',
    backgroundColor: record ? '#43351A' : log.done ? '#24371C' : '#151D11',
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
          backgroundColor: record ? '#32270F' : log.done ? '#1E2C17' : 'transparent',
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
          accessibilityLabel={`Técnica, série ${index + 1}, ${exercise.name}, ${quality?.label ?? 'não registrada'}`}
          onPress={() => setPanel('quality')}
          style={{
            ...base,
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: quality?.background ?? base.backgroundColor,
          }}
        >
          <Text color={quality?.color} style={{ fontSize: 12 }}>
            {quality?.label ?? '—'}
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
            exercise.name +
            (record ? ', recorde pessoal' : '')
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
            backgroundColor: record ? '#F7CC6A' : log.done ? '#B7F34A' : '#293620',
          }}
        >
          <Ionicons
            name="checkmark"
            size={21}
            color={record ? '#34260B' : log.done ? '#172111' : '#A7B59B'}
          />
        </Pressable>
      </View>
      {record && onViewRecord ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ver recorde da série ${index + 1}, ${exercise.name}`}
          onPress={onViewRecord}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'flex-start',
            gap: 6,
            minHeight: 44,
            paddingHorizontal: 10,
          }}
        >
          <Ionicons name="trophy-outline" size={17} color="#F7CC6A" />
          <Text color="#F7CC6A" style={{ fontSize: 12 }}>
            Ver recorde
          </Text>
        </Pressable>
      ) : null}
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text variant="caption">
                    {exercise.name} · Série {index + 1}
                  </Text>
                  {panel === 'rir' ? <Text variant="title">RIR realizado</Text> : null}
                  {panel === 'quality' ? <Text variant="title">Técnica da série</Text> : null}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Fechar"
                  onPress={() => setPanel(null)}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: '#26351F',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="close" size={20} color="#D6E5C9" />
                </Pressable>
              </View>
              {panel === 'type' ? (
                <>
                  <Text variant="title" color={badgeColors.color}>
                    {kindLabel}
                  </Text>
                  <Text>{kind.description}</Text>
                </>
              ) : panel === 'rir' ? (
                <>
                  <Text>Quantas repetições ainda conseguiria fazer?</Text>
                  {target ? (
                    <Text variant="caption">Meta do treinador · {effortLabel(target)}</Text>
                  ) : null}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {rirOptions.map(({ value, color, background, effort }) => {
                      const label = value === 5 ? '5+' : String(value);
                      const selected = actual?.mode === 'rir' && rirDisplay === label;
                      return (
                        <Pressable
                          key={value}
                          accessibilityRole="button"
                          accessibilityLabel={`RIR ${value === 5 ? '5 ou mais' : value}, esforço ${effort}`}
                          accessibilityState={{ selected }}
                          onPress={() => {
                            onChange({
                              actual_effort: {
                                mode: 'rir',
                                min: value,
                                max: value,
                              },
                            });
                            setPanel(null);
                          }}
                          style={{
                            ...base,
                            flexBasis: '29%',
                            flexGrow: 1,
                            minHeight: 62,
                            borderColor: selected ? color : background,
                            backgroundColor: background,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text color={color} style={{ fontSize: 19, fontWeight: '700' }}>
                            {label}
                          </Text>
                          <Text color={color} style={{ fontSize: 11 }}>
                            {effort}
                          </Text>
                        </Pressable>
                      );
                    })}
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
                  <Text>Como foi a execução das repetições?</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {(['good', 'fair', 'poor'] as const).map((value) => {
                      const { label, detail, icon, color, background } = qualityOptions[value];
                      const selected = log.rep_quality === value;
                      return (
                        <Pressable
                          key={value}
                          accessibilityRole="button"
                          accessibilityLabel={`${label}, ${detail}`}
                          accessibilityState={{ selected }}
                          onPress={() => {
                            onChange({ rep_quality: value });
                            setPanel(null);
                          }}
                          style={{
                            flex: 1,
                            minHeight: 90,
                            gap: 3,
                            padding: 6,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: selected ? color : background,
                            backgroundColor: background,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Ionicons name={icon} size={21} color={color} />
                          <Text color={color} style={{ fontWeight: '700' }}>
                            {label}
                          </Text>
                          <Text color={color} align="center" style={{ fontSize: 11 }}>
                            {detail}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {quality ? (
                    <Button
                      title="Limpar avaliação"
                      variant="ghost"
                      onPress={() => {
                        onChange({ rep_quality: null });
                        setPanel(null);
                      }}
                    />
                  ) : null}
                </>
              )}
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}

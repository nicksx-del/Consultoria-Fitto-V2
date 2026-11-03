import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Text } from '@/components/ui';
import { EffortTarget, effortLabel, validEffort } from './workoutModel';
export function EffortPicker({
  value,
  title,
  onApply,
  onClose,
  onInherit,
  purpose = 'prescription',
  singleOnly = false,
}: {
  value?: EffortTarget | null;
  title: string;
  onApply: (value: EffortTarget | null) => void;
  onClose: () => void;
  onInherit?: () => void;
  purpose?: 'prescription' | 'feedback';
  singleOnly?: boolean;
}) {
  const initial = validEffort(value) ? value : { mode: 'rir' as const, min: 2, max: 2 };
  const [target, setTarget] = useState<EffortTarget>(initial);
  const [range, setRange] = useState(!singleOnly && initial.min !== initial.max);
  const step = target.mode === 'rir' ? 1 : 0.5;
  const floor = target.mode === 'rir' ? 0 : 1;
  function adjust(field: 'min' | 'max', delta: number) {
    const next = Math.min(10, Math.max(floor, target[field] + delta));
    setTarget((v) =>
      !range
        ? { ...v, min: next, max: next }
        : field === 'min'
          ? { ...v, min: next, max: Math.max(next, v.max) }
          : { ...v, min: Math.min(next, v.min), max: next },
    );
  }
  function stepper(field: 'min' | 'max', label: string) {
    return (
      <View style={{ flex: 1, gap: 8 }}>
        <Text variant="caption" align="center">
          {label}
        </Text>
        <View
          style={{ flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Diminuir ${label}`}
            disabled={target[field] <= floor}
            onPress={() => adjust(field, -step)}
            style={{ padding: 12, backgroundColor: '#293820', borderRadius: 10 }}
          >
            <Ionicons name="remove" size={20} color="#B7F34A" />
          </Pressable>
          <Text variant="heading" style={{ minWidth: 36, textAlign: 'center' }}>
            {String(target[field]).replace('.', ',')}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Aumentar ${label}`}
            disabled={target[field] >= 10}
            onPress={() => adjust(field, step)}
            style={{ padding: 12, backgroundColor: '#293820', borderRadius: 10 }}
          >
            <Ionicons name="add" size={20} color="#B7F34A" />
          </Pressable>
        </View>
      </View>
    );
  }
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <View
          style={{
            width: '100%',
            maxWidth: 560,
            alignSelf: 'center',
            maxHeight: '92%',
            backgroundColor: '#172012',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            gap: 16,
          }}
        >
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <View style={{ flex: 1 }}>
              <Text variant="title">
                {purpose === 'feedback' ? 'Registrar esforço realizado' : 'Prescrever esforço'}
              </Text>
              <Text variant="caption">{title}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar prescrição de esforço"
              onPress={onClose}
              style={{ padding: 12 }}
            >
              <Ionicons name="close" size={24} color="#B7F34A" />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ gap: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['rir', 'rpe'] as const).map((mode) => (
                <Button
                  key={mode}
                  title={mode.toUpperCase()}
                  style={{ flex: 1 }}
                  variant={target.mode === mode ? 'primary' : 'outline'}
                  onPress={() => {
                    setTarget({ mode, min: mode === 'rir' ? 2 : 8, max: mode === 'rir' ? 2 : 8 });
                    setRange(false);
                  }}
                />
              ))}
            </View>
            <Text>
              {purpose === 'feedback' ? 'Registre o esforço que você sentiu nesta série.' : target.mode === 'rir'
                ? 'RIR: quantas repetições ainda sobrariam ao terminar a série.'
                : 'RPE: nota de esforço percebido na série, de 1 a 10.'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {(target.mode === 'rir' ? [0, 1, 2, 3, 4, 5] : [6, 7, 8, 9, 10]).map((n) => (
                <Pressable
                  key={n}
                  accessibilityRole="button"
                  accessibilityLabel={`Escolher ${target.mode.toUpperCase()} ${n}`}
                  accessibilityState={{ selected: !range && target.min === n }}
                  onPress={() => {
                    setTarget((v) => ({ ...v, min: n, max: n }));
                    setRange(false);
                  }}
                  style={{
                    minWidth: 44,
                    minHeight: 44,
                    borderWidth: 1,
                    borderColor: !range && target.min === n ? '#B7F34A' : '#4D6040',
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: !range && target.min === n ? '#314A22' : 'transparent',
                  }}
                >
                  <Text color="#D7E8CD">{n}</Text>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button
                title="Valor único"
                style={{ flex: 1 }}
                variant={!range ? 'primary' : 'outline'}
                onPress={() => {
                  setRange(false);
                  setTarget((v) => ({ ...v, max: v.min }));
                }}
              />
              <Button
                title="Faixa de esforço"
                disabled={singleOnly}
                style={{ flex: 1 }}
                variant={range ? 'primary' : 'outline'}
                onPress={() => {
                  setRange(true);
                  setTarget((v) => ({ ...v, max: Math.min(10, v.min + step) }));
                }}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              {stepper('min', range ? 'Mínimo' : 'Meta')}
              {range ? stepper('max', 'Máximo') : null}
            </View>
            <View style={{ padding: 14, backgroundColor: '#26381E', borderRadius: 12, gap: 6 }}>
              <Text variant="title" color="#B7F34A">
                {effortLabel(target)}
              </Text>
              <Text variant="caption">
                {purpose === 'feedback' ? 'Registre o esforço que você sentiu nesta série.' : target.mode === 'rir'
                  ? target.min === target.max
                    ? `${target.min} repetiç${target.min === 1 ? 'ão' : 'ões'} em reserva.`
                    : `Terminar com ${target.min} a ${target.max} repetições em reserva.`
                  : 'Esta nota será mostrada ao aluno como meta prescrita.'}
              </Text>
            </View>
            {purpose === 'feedback' ? <Text variant="caption">Este registro é separado da meta prescrita pelo treinador.</Text> : onInherit ? (
              <Button title="Usar o padrão do exercício" variant="outline" onPress={onInherit} />
            ) : (
              <Text variant="caption">
                O padrão vale para séries de trabalho. Aquecimentos ficam sem meta, salvo ajuste
                individual.
              </Text>
            )}
            <Button title={purpose === 'feedback' ? 'Limpar esforço realizado' : 'Sem meta de esforço'} variant="ghost" onPress={() => onApply(null)} />
          </ScrollView>
          <Button
            title={`${purpose === 'feedback' ? 'Registrar' : 'Aplicar'} ${effortLabel(target)}`}
            onPress={() => onApply(target)}
          />
        </View>
      </View>
    </Modal>
  );
}

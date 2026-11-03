import React, { useState } from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { Button, Text, TextField } from '@/components/ui';
import { DraftExercise, ExerciseGroup } from './workoutModel';
import { groupInfo } from './trainingMethods';
import { TrainingHelp } from './TrainingHelp';
export function ExerciseGroupPicker({
  exercises,
  currentId,
  onApply,
  onClose,
}: {
  exercises: DraftExercise[];
  currentId?: string;
  onApply: (keys: string[], group: Omit<ExerciseGroup, 'id'> | null) => void;
  onClose: () => void;
}) {
  const initial = exercises.find((e) => e.group_rule?.id === currentId)?.group_rule;
  const [selected, setSelected] = useState<string[]>(
    exercises.filter((e) => currentId && e.group_rule?.id === currentId).map((e) => e.key),
  );
  const [type, setType] = useState<ExerciseGroup['type']>(initial?.type || 'superset');
  const [rounds, setRounds] = useState(String(initial?.rounds || 3));
  const [rest, setRest] = useState(String(initial?.rest_seconds ?? 60));
  const valid =
    selected.length >= 2 &&
    (type !== 'biset' || selected.length === 2) &&
    /^\d+$/.test(rounds) &&
    Number(rounds) >= 1 &&
    Number(rounds) <= 20 &&
    /^\d+$/.test(rest) &&
    Number(rest) <= 1800;
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          padding: 16,
          gap: 14,
          backgroundColor: '#11190D',
          width: '100%',
          maxWidth: 680,
          alignSelf: 'center',
        }}
      >
        <Text variant="heading">Agrupar exercícios</Text>
        <Button title="Voltar ao treino" variant="ghost" onPress={onClose} />
        <ScrollView contentContainerStyle={{ gap: 12 }} keyboardShouldPersistTaps="handled">
          {Object.entries(groupInfo).map(([id, info]) => (
            <View key={id} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Button
                title={info.label}
                style={{ flex: 1 }}
                variant={type === id ? 'primary' : 'outline'}
                onPress={() => setType(id as ExerciseGroup['type'])}
              />
              <TrainingHelp info={info} />
            </View>
          ))}
          <Text>Selecione os movimentos na ordem em que aparecem na divisão.</Text>
          {exercises.map((e) => (
            <Button
              key={e.key}
              title={`${selected.includes(e.key) ? '✓ ' : ''}${e.name || 'Sem nome'}${e.group_rule && e.group_rule.id !== currentId ? ' · em outro grupo' : ''}`}
              disabled={!!e.group_rule && e.group_rule.id !== currentId}
              variant={selected.includes(e.key) ? 'primary' : 'outline'}
              onPress={() =>
                setSelected((keys) =>
                  keys.includes(e.key) ? keys.filter((k) => k !== e.key) : [...keys, e.key],
                )
              }
            />
          ))}
          <TextField
            label="Voltas (1–20)"
            value={rounds}
            keyboardType="number-pad"
            maxLength={2}
            onChangeText={(v) => setRounds(v.replace(/\D/g, ''))}
          />
          <TextField
            label="Descanso entre voltas (s)"
            value={rest}
            keyboardType="number-pad"
            maxLength={4}
            onChangeText={(v) => setRest(v.replace(/\D/g, ''))}
          />
          <Text variant="caption">
            Cada exercício selecionado terá uma série por volta. O total de séries será ajustado; as
            prescrições existentes serão preservadas até esse total.
          </Text>
          {type === 'biset' && selected.length !== 2 ? (
            <Text color="#FFAF71">Bi-set precisa de exatamente dois exercícios.</Text>
          ) : null}
          {initial ? (
            <Button
              title="Desfazer este agrupamento"
              variant="ghost"
              onPress={() => onApply([], null)}
            />
          ) : null}
        </ScrollView>
        <Button
          title="Aplicar agrupamento"
          disabled={!valid}
          onPress={() =>
            onApply(selected, { type, rounds: Number(rounds), rest_seconds: Number(rest) })
          }
        />
      </View>
    </Modal>
  );
}

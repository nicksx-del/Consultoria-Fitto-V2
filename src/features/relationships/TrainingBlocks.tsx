import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button, Text, TextField } from '@/components/ui';
import { DetailsPanel } from './DetailsPanel';
import { DraftExercise, WorkoutContent, key, toDraft } from './workoutModel';
import { TrainingBlock, trainingTools } from './trainingToolsApi';
export function TrainingBlocks({
  profileId,
  linkId,
  exercises,
  onInsert,
  disabled,
}: {
  profileId: string;
  linkId: string;
  exercises: DraftExercise[];
  onInsert: (e: DraftExercise[]) => void;
  disabled: boolean;
}) {
  const [rows, setRows] = useState<TrainingBlock[]>([]),
    [name, setName] = useState(''),
    [selected, setSelected] = useState<string[]>([]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('');
  async function load() {
    const d = await trainingTools<{ blocks: TrainingBlock[] }>(profileId, linkId, 'read');
    setRows(d.blocks);
  }
  useEffect(() => {
    let live = true;
    void trainingTools<{ blocks: TrainingBlock[] }>(profileId, linkId, 'read')
      .then((d) => {
        if (live) setRows(d.blocks);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [profileId, linkId]);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const picked = exercises.filter((e) => selected.includes(e.key));
  function insert(b: TrainingBlock) {
    const mapped = new Map<string, string>();
    const draft = toDraft(b.content).sessions[0].exercises.map((e) => {
      if (!e.group_rule) return e;
      const old = e.group_rule.id;
      if (!mapped.has(old)) mapped.set(old, key());
      return {
        ...e,
        group: mapped.get(old),
        group_rule: { ...e.group_rule, id: mapped.get(old)! },
      };
    });
    onInsert(draft);
    setNotice(`${b.name} inserido no rascunho.`);
  }
  return (
    <DetailsPanel title="Biblioteca de prescrições e blocos">
      <Text variant="caption">
        Salve um exercício ou um bloco com séries, técnicas e RIR. Modelos ficam disponíveis para
        todos os seus alunos. Selecione todos os membros de um agrupamento.
      </Text>
      {error ? (
        <Text accessibilityRole="alert" color="#FF6B5A">
          {error}
        </Text>
      ) : null}
      {notice ? <Text color="#B7F34A">{notice}</Text> : null}
      {exercises.map((e) => (
        <Button
          key={e.key}
          title={`${selected.includes(e.key) ? '✓ ' : ''}${e.name}`}
          variant={selected.includes(e.key) ? 'primary' : 'outline'}
          disabled={disabled || busy}
          onPress={() =>
            setSelected(
              selected.includes(e.key) ? selected.filter((k) => k !== e.key) : [...selected, e.key],
            )
          }
        />
      ))}
      <TextField
        label="Nome do modelo"
        value={name}
        maxLength={100}
        editable={!disabled && !busy}
        onChangeText={setName}
      />
      <Button
        title="Salvar seleção como modelo"
        disabled={disabled || busy || !picked.length || name.trim().length < 2}
        onPress={() =>
          void run(async () => {
            const content: WorkoutContent = {
              title: name.trim(),
              notes: '',
              sessions: [
                {
                  name: 'Bloco',
                  exercises: picked.map(({ key: ignored, ...e }) => ({
                    ...e,
                    sets: Number(e.sets),
                    rest_seconds: Number(e.rest_seconds),
                  })),
                },
              ],
            };
            await trainingTools(profileId, linkId, 'block_save', { content });
            await load();
            setName('');
            setSelected([]);
            setNotice('Modelo salvo.');
          })
        }
      />
      {rows.length ? (
        rows.map((b) => (
          <View
            key={b.id}
            style={{
              gap: 6,
              padding: 10,
              borderWidth: 1,
              borderColor: '#35432C',
              borderRadius: 10,
            }}
          >
            <Text>
              {b.name} · {b.content.sessions[0].exercises.length} exercício(s)
            </Text>
            <Button
              title={`Inserir ${b.name}`}
              disabled={
                disabled || busy || exercises.length + b.content.sessions[0].exercises.length > 40
              }
              onPress={() => insert(b)}
            />
            <Button
              title={`Remover modelo ${b.name}`}
              variant="ghost"
              disabled={disabled || busy}
              onPress={() =>
                void run(async () => {
                  await trainingTools(profileId, linkId, 'block_delete', { id: b.id });
                  await load();
                })
              }
            />
          </View>
        ))
      ) : (
        <Text variant="caption">Nenhum modelo de bloco salvo.</Text>
      )}
    </DetailsPanel>
  );
}

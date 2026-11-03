import React, { useState } from 'react';
import { Modal, View, ScrollView } from 'react-native';
import { Screen, Text, Button, TextField } from '@/components/ui';
import type { Execution } from './Executions';
import { seriesFor, kindInfo, techniqueInfo } from './trainingMethods';
import type { SetPrescription } from './workoutModel';
import {
  adjustmentMembers,
  buildSessionPrescription,
  setHasRecord,
  SessionAdjustment,
} from './sessionAdjustments';
import { DetailsPanel } from './DetailsPanel';

export function SessionAdjuster({
  current,
  busy,
  onApply,
  onClose,
}: {
  current: Execution;
  busy: boolean;
  onApply: (request: SessionAdjustment) => Promise<void>;
  onClose: () => void;
}) {
  const [ei, setEi] = useState(() => {
      const next = current.progress.findIndex((sets) => sets.some((set) => !set.done));
      return next < 0 ? 0 : next;
    }),
    [form, setForm] = useState<{
      operation: 'add' | 'replace';
      index: number;
      base: SetPrescription;
    } | null>(null);
  const [kind, setKind] = useState<SetPrescription['kind']>('work'),
    [format, setFormat] = useState('traditional'),
    [target, setTarget] = useState(''),
    [load, setLoad] = useState(''),
    [rest, setRest] = useState('60'),
    [blocks, setBlocks] = useState('3'),
    [reps, setReps] = useState(''),
    [pause, setPause] = useState('15'),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const exercise = current.snapshot.session.exercises[ei],
    logs = current.progress[ei],
    members = adjustmentMembers(current.snapshot.session.exercises, ei);
  function open(operation: 'add' | 'replace', index: number) {
    const base = seriesFor(exercise, Math.min(index, exercise.sets - 1));
    setForm({ operation, index, base });
    setKind(operation === 'add' ? 'work' : base.kind);
    setFormat(operation === 'add' ? 'traditional' : base.technique?.type || 'traditional');
    setTarget(base.target);
    setLoad(base.load);
    setRest(base.rest);
    setBlocks(String(base.technique?.steps.length || 3));
    setReps(base.technique?.steps[0]?.target || '');
    setPause(base.technique?.steps[0]?.rest || '15');
    setError('');
    setNotice('');
  }
  async function apply(request: SessionAdjustment) {
    setError('');
    setNotice('');
    try {
      await onApply(request);
      setForm(null);
      setNotice('Ajuste aplicado somente a esta sessão.');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <Screen
        scrollable
        contentContainerStyle={{
          gap: 12,
          paddingVertical: 16,
          width: '100%',
          maxWidth: 720,
          alignSelf: 'center',
        }}
      >
        <Button
          title={form ? 'Voltar às séries' : 'Voltar ao treino'}
          variant="ghost"
          disabled={busy}
          onPress={() => (form ? setForm(null) : onClose())}
        />
        <Text variant="title">Editar séries deste treino</Text>
        <Text variant="caption">
          Adicione, remova ou mude o tipo das séries só para hoje. Na próxima sessão, vale a ficha
          original do treinador. Os ajustes ficam no histórico deste treino.
        </Text>
        <Text variant="caption">Ao aplicar um ajuste, o descanso atual é encerrado.</Text>
        {error ? (
          <Text color="#FFB87A" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
        {notice ? (
          <Text color="#C0F568" accessibilityLiveRegion="polite">
            {notice}
          </Text>
        ) : null}
        {!form ? (
          <>
            <ScrollView horizontal style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8 }}>
              {current.snapshot.session.exercises.map((ex, i) => (
                <Button
                  key={i}
                  title={ex.name}
                  variant={ei === i ? 'primary' : 'outline'}
                  disabled={busy}
                  onPress={() => {
                    setEi(i);
                    setNotice('');
                    setError('');
                  }}
                />
              ))}
            </ScrollView>
            <Text>
              {exercise.name} · {exercise.sets} séries
            </Text>
            {exercise.group_rule ? (
              <Text variant="caption">
                Adicionar ou remover altera a volta de todos os {members.length} exercícios do
                grupo. Mudar o tipo afeta só o movimento selecionado.
              </Text>
            ) : null}
            {logs.map((log, si) => {
              const p = seriesFor(exercise, si),
                locked = setHasRecord(log),
                groupLocked = members.some((i) => setHasRecord(current.progress[i][si]));
              return (
                <View
                  key={si}
                  style={{ gap: 8, padding: 12, borderRadius: 14, backgroundColor: '#1D2917' }}
                >
                  <Text>
                    Série {si + 1} · {kindInfo[p.kind].label}
                    {p.technique ? ' · ' + techniqueInfo[p.technique.type].label : ''}
                  </Text>
                  <Text variant="caption">
                    {p.target} · {p.load || 'carga livre'} · {p.rest}s
                  </Text>
                  <View
                    style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}
                  >
                    {locked ? (
                      <Text variant="caption">
                        Registrada · tipo bloqueado para preservar o histórico.
                      </Text>
                    ) : (
                      <Button
                        title={'Editar tipo da série ' + (si + 1)}
                        variant="outline"
                        disabled={busy}
                        onPress={() => open('replace', si)}
                      />
                    )}
                    <Button
                      title={
                        exercise.group_rule
                          ? 'Remover volta ' + (si + 1)
                          : 'Remover série ' + (si + 1)
                      }
                      variant="ghost"
                      disabled={busy || logs.length <= 1 || groupLocked}
                      onPress={() =>
                        void apply({ operation: 'remove', exercise_index: ei, set_index: si })
                      }
                    />
                  </View>
                </View>
              );
            })}
            <Button
              title={exercise.group_rule ? '+ Adicionar volta' : '+ Adicionar série'}
              disabled={busy || logs.length >= 20}
              onPress={() => open('add', logs.length)}
            />
            <Text variant="caption">
              Séries com carga, repetições, esforço ou etapas registradas não podem ser removidas ou
              reinterpretadas.
            </Text>
          </>
        ) : (
          <>
            <Text>
              {exercise.name} ·{' '}
              {form.operation === 'add' ? 'Nova série' : 'Série ' + (form.index + 1)}
            </Text>
            <Text variant="caption">Tipo de série</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {(Object.keys(kindInfo) as SetPrescription['kind'][]).map((value) => (
                <Button
                  key={value}
                  title={kindInfo[value].label}
                  variant={kind === value ? 'primary' : 'outline'}
                  disabled={busy}
                  onPress={() => {
                    setKind(value);
                    if (form.operation === 'add') {
                      setForm({ ...form, index: value === 'warmup' ? 0 : logs.length });
                    }
                  }}
                />
              ))}
            </View>
            <Text variant="caption">Formato</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {[
                'traditional',
                'cluster',
                ...(form.base.technique && form.base.technique.type !== 'cluster'
                  ? [form.base.technique.type]
                  : []),
              ].map((value) => (
                <Button
                  key={value}
                  title={techniqueInfo[value as keyof typeof techniqueInfo].label}
                  variant={format === value ? 'primary' : 'outline'}
                  disabled={busy}
                  onPress={() => setFormat(value)}
                />
              ))}
            </View>
            {format === 'cluster' ? (
              <Text variant="caption">
                Total previsto: {Number(blocks) * Number(reps) || '—'} repetições nos blocos.
              </Text>
            ) : (
              <TextField
                label="Alvo de repetições da série"
                value={target}
                maxLength={40}
                editable={!busy}
                onChangeText={setTarget}
              />
            )}
            <TextField
              label="Carga de referência (opcional)"
              value={load}
              maxLength={100}
              editable={!busy}
              onChangeText={setLoad}
            />
            <TextField
              label="Descanso após a série (s)"
              value={rest}
              maxLength={4}
              keyboardType="number-pad"
              editable={!busy}
              onChangeText={setRest}
            />
            {format === 'cluster' ? (
              <>
                <TextField
                  label="Quantidade de blocos (2 a 8)"
                  value={blocks}
                  maxLength={1}
                  keyboardType="number-pad"
                  editable={!busy}
                  onChangeText={setBlocks}
                />
                <TextField
                  label="Repetições por bloco"
                  value={reps}
                  maxLength={3}
                  keyboardType="number-pad"
                  editable={!busy}
                  onChangeText={setReps}
                />
                <TextField
                  label="Pausa entre blocos (s)"
                  value={pause}
                  maxLength={4}
                  keyboardType="number-pad"
                  editable={!busy}
                  onChangeText={setPause}
                />
              </>
            ) : null}
            {form.operation === 'add' ? (
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <Button
                  title="Inserir no início"
                  variant={form.index === 0 ? 'primary' : 'outline'}
                  disabled={busy}
                  onPress={() => setForm({ ...form, index: 0 })}
                />
                <Button
                  title="Inserir no final"
                  variant={form.index === logs.length ? 'primary' : 'outline'}
                  disabled={busy}
                  onPress={() => setForm({ ...form, index: logs.length })}
                />
              </View>
            ) : null}
            <Button
              title={busy ? 'Aplicando…' : 'Aplicar à sessão'}
              disabled={busy}
              onPress={() => {
                try {
                  const prescription = buildSessionPrescription(
                    form.base,
                    kind,
                    format,
                    target,
                    load,
                    rest,
                    blocks,
                    reps,
                    pause,
                  );
                  void apply({
                    operation: form.operation,
                    exercise_index: ei,
                    set_index: form.index,
                    prescription,
                  });
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            />
          </>
        )}
      </Screen>
    </Modal>
  );
}
export function SessionAdjustmentsSummary({ current }: { current: Execution }) {
  if (!current.adjustments?.length) return null;
  return (
    <DetailsPanel title={'Ajustes desta sessão · ' + current.adjustments.length}>
      <Text variant="caption">A ficha original do treinador foi preservada.</Text>
      {current.original_snapshot?.session.exercises.map((ex, i) => (
        <Text key={i} variant="caption">
          {ex.name}: original {ex.sets} séries · sessão{' '}
          {current.snapshot.session.exercises[i]?.sets}
        </Text>
      ))}
      {current.original_snapshot ? (
        <DetailsPanel title="Ver prescrição original">
          {current.original_snapshot.session.exercises.map((ex, i) => (
            <View key={i} style={{ gap: 4 }}>
              <Text>{ex.name}</Text>
              {Array.from({ length: ex.sets }, (_, si) => {
                const p = seriesFor(ex, si);
                return (
                  <Text key={si} variant="caption">
                    Série {si + 1} · {kindInfo[p.kind].label}
                    {p.technique ? ' / ' + techniqueInfo[p.technique.type].label : ''} · {p.target}{' '}
                    · {p.load || 'carga livre'} · {p.rest}s
                  </Text>
                );
              })}
            </View>
          ))}
        </DetailsPanel>
      ) : null}
      {current.adjustments.map((event, i) => (
        <Text key={i} variant="caption">
          {i + 1}. {event.exercise} ·{' '}
          {event.operation === 'add'
            ? 'adicionou'
            : event.operation === 'remove'
              ? 'removeu'
              : 'alterou'}{' '}
          {event.group && event.operation !== 'replace' ? 'volta' : 'série'} {event.set_index + 1}
          {event.prescription
            ? ' · ' +
              kindInfo[event.prescription.kind].label +
              (event.prescription.technique
                ? ' / ' + techniqueInfo[event.prescription.technique.type].label
                : '')
            : ''}
        </Text>
      ))}
    </DetailsPanel>
  );
}

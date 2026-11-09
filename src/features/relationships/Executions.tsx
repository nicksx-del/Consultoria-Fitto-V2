import { ProfilePosts } from './ProfilePosts';
import { SessionAdjuster, SessionAdjustmentsSummary } from './SessionAdjuster';
import type { SessionAdjustment } from './sessionAdjustments';
import { readRestAlerts, setRestAlerts } from './restAlerts';
import { TrainingProgress, StudentSessionCard } from './StudentWorkoutUI';
import { RestTimer } from './RestTimer';
import React, { useEffect, useRef, useState } from 'react';
import { View, Modal, ScrollView } from 'react-native';
import { Button, Text, TextField, Screen } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { SetLog } from './trainingRuntime';
import { TrainingLogSummary } from './ExecutionExercises';
import { ExecutionWithFeedback, CompletedExerciseFeedback } from './ExerciseFeedback';
import { trainingTools, TrainingFeedback } from './trainingToolsApi';
import { Exercise, SetPrescription } from './workoutModel';
import { WorkoutResultsSummary } from './WorkoutResultsSummary';
import { WorkoutCompletion } from './WorkoutCompletion';
import { executionTotals, type PublishedWorkout } from './trainingExperience';
import { useMinimizedWorkout } from './MinimizedWorkout';
import { DetailsPanel } from './DetailsPanel';

export type Execution = {
  original_snapshot?: Execution['snapshot'] | null;
  adjustments?: {
    operation: 'add' | 'remove' | 'replace';
    exercise: string;
    exercise_index: number;
    set_index: number;
    group: boolean;
    at: string;
    prescription: SetPrescription | null;
  }[];
  feedback?: TrainingFeedback[];
  id: string;
  version: number;
  status: string;
  started_at: string;
  finished_at?: string | null;
  snapshot: {
    plan?: string;
    title: string;
    session: {
      name: string;
      exercises: Exercise[];
    };
  };
  progress: SetLog[][];
  notes: string;
  difficulty: number | null;
  rest_until: string | null;
};
export function Executions({
  profileId,
  linkId,
  trainer = false,
  plans = [],
  initialStart,
  onEntryHandled,
  onBusy,
  onNavigate,
  onMinimize,
}: {
  profileId: string;
  linkId: string;
  trainer?: boolean;
  plans?: PublishedWorkout[];
  initialStart?: { plan: string; division: number };
  onEntryHandled?: () => void;
  onBusy?: (busy: boolean) => void;
  onNavigate?: () => void;
  onMinimize?: () => void;
}) {
  const minimized = useMinimizedWorkout();
  const [adjusting, setAdjusting] = useState(false);
  const adjustLock = useRef(false);
  const [focused, setFocused] = useState(false);
  const [rows, setRows] = useState<Execution[]>([]);
  const [feedback, setFeedback] = useState<TrainingFeedback[]>([]);
  const [current, setCurrent] = useState<Execution | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Carregando execuções…');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [confirm, setConfirm] = useState(false);
  const latest = useRef<Execution | null>(null);
  const restOwner = useRef<{ ei: number; si: number } | null>(null);
  const pending = useRef(false);
  const sending = useRef(false);
  const alive = useRef(true);
  const [ready, setReady] = useState(false);
  const [finished, setFinished] = useState<Execution | null>(null);
  const entryHandled = useRef(false);
  useEffect(() => {
    onBusy?.(busy || (!!current && status !== 'Salvo'));
  }, [busy, current, status, onBusy]);
  async function api<T>(action: string, payload: object = {}): Promise<T> {
    const { data, error: failure } = await supabase.rpc('execution_api', {
      action,
      profile_id: profileId,
      link_id: linkId,
      payload,
    });
    if (failure)
      throw new Error(
        failure.code === 'P0001'
          ? failure.message
          : 'Não foi possível salvar. Confira sua conexão e tente novamente.',
      );
    return data as T;
  }
  function install(row: Execution | null) {
    if (row && !latest.current && (onMinimize || minimized.workout?.executionId !== row.id)) {
      const stored = minimized.workout;
      restOwner.current =
        stored?.executionId === row.id &&
        stored.restUntil &&
        row.rest_until &&
        Date.parse(stored.restUntil) === Date.parse(row.rest_until)
          ? stored.restOwner
          : null;
      setFocused(true);
      minimized.clear(profileId, linkId);
    }
    if (!row && !trainer) minimized.clear(profileId, linkId);
    latest.current = row;
    setCurrent(row);
  }
  function minimizeWorkout() {
    const row = latest.current;
    if (!row || busy || sending.current || pending.current || status !== 'Salvo') return;
    const sets = row.progress.flat();
    minimized.minimize({
      profileId,
      linkId,
      executionId: row.id,
      name: row.snapshot.session.name,
      done: sets.filter((set) => set.done).length,
      total: sets.length,
      restUntil: row.rest_until,
      restOwner: restOwner.current,
    });
    setFocused(false);
    setConfirm(false);
    onMinimize?.();
  }
  async function refresh() {
    const [data, tools] = await Promise.all([
      api<Execution[]>('list'),
      trainingTools<{ feedback: TrainingFeedback[] }>(profileId, linkId, 'read'),
    ]);
    if (!alive.current) return;
    setRows(data);
    setFeedback(tools.feedback);
    install(trainer ? null : (data.find((r) => r.status === 'active') ?? null));
    setReady(true);
    setStatus('Salvo');
  }
  useEffect(() => {
    alive.current = true;
    void refresh().catch((e) => {
      setError(e.message);
      setStatus('Falha ao carregar');
    });
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      alive.current = false;
      clearInterval(timer);
    };
    // Each instance belongs to one relationship.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, linkId, trainer]);
  async function flush() {
    if (sending.current) return false;
    sending.current = true;
    try {
      while (pending.current && latest.current) {
        const row = latest.current;
        pending.current = false;
        setStatus('Salvando…');
        const saved = await api<Execution>('save', row);
        const next = { ...(latest.current ?? saved), version: saved.version };
        latest.current = next;
        if (alive.current) setCurrent(next);
      }
      if (alive.current) {
        setStatus('Salvo');
        setError('');
      }
      return true;
    } catch (e) {
      pending.current = true;
      if (alive.current) {
        setStatus('Alterações não salvas');
        setError((e as Error).message);
      }
      return false;
    } finally {
      sending.current = false;
    }
  }
  function edit(patch: Partial<Execution>) {
    if (!latest.current) return;
    install({ ...latest.current, ...patch });
    pending.current = true;
    setStatus('Salvando…');
    void flush();
  }
  async function run(task: () => Promise<void>) {
    if (sending.current || busy) return;
    setBusy(true);
    setError('');
    try {
      await task();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function adjustSession(request: SessionAdjustment) {
    if (adjustLock.current || busy || sending.current)
      throw new Error('Aguarde o salvamento da sessão.');
    adjustLock.current = true;
    setBusy(true);
    try {
      if (!(await flush()) || !latest.current)
        throw new Error('Salve os registros antes de ajustar.');
      const { data, error: failure } = await supabase.rpc('execution_adjust', {
        profile_id: profileId,
        link_id: linkId,
        payload: { ...request, id: latest.current.id, version: latest.current.version },
      });
      if (failure)
        throw new Error(
          failure.code === 'P0001' ? failure.message : 'Não foi possível aplicar o ajuste.',
        );
      install(data as Execution);
      restOwner.current = null;
      setStatus('Salvo');
    } finally {
      adjustLock.current = false;
      setBusy(false);
    }
  }
  function changeSet(ei: number, si: number, patch: Partial<SetLog>, rest?: number) {
    if (!latest.current) return;
    const progress = latest.current.progress.map((sets, index) =>
      index === ei ? sets.map((set, n) => (n === si ? { ...set, ...patch } : set)) : sets,
    );
    let rest_until = latest.current.rest_until;
    if (rest !== undefined) {
      rest_until = rest > 0 ? new Date(Date.now() + rest * 1000).toISOString() : null;
      restOwner.current = rest_until ? { ei, si } : null;
      if (rest > 0) void setRestAlerts(readRestAlerts());
    } else if (
      patch.done === false &&
      restOwner.current?.ei === ei &&
      restOwner.current.si === si
    ) {
      rest_until = null;
      restOwner.current = null;
    }
    edit({ progress, rest_until });
  }
  useEffect(() => {
    if (!ready || trainer || !initialStart || entryHandled.current) return;
    void Promise.resolve().then(() => {
      if (entryHandled.current) return;
      entryHandled.current = true;
      void run(async () => {
        try {
          if (current) {
            onNavigate?.();
            return;
          }
          const p = plans.find((p) => p.id === initialStart.plan);
          if (
            !p ||
            !Number.isInteger(initialStart.division) ||
            initialStart.division < 0 ||
            initialStart.division >= p.content.sessions.length
          )
            throw new Error('Escolha uma divisão disponível para começar.');
          install(await api<Execution>('start', initialStart));
          onNavigate?.();
        } finally {
          onEntryHandled?.();
        }
      });
    });
    // This entry is a one-time action explicitly selected on the home screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, trainer, initialStart, current, plans, onEntryHandled, onNavigate]);
  function details(row: Execution) {
    return (
      <View style={{ gap: 8 }}>
        <SessionAdjustmentsSummary current={row} />
        {row.snapshot.session.exercises.map((e, i) => (
          <View key={i} style={{ gap: 4 }}>
            <Text variant="title">{e.name}</Text>
            {feedback.find((f) => f.execution_id === row.id && f.exercise_index === i)
              ?.alternative ? (
              <Text color="#B7F34A">
                Alternativa executada:{' '}
                {
                  feedback.find((f) => f.execution_id === row.id && f.exercise_index === i)!
                    .alternative
                }
              </Text>
            ) : null}
            <Text variant="caption">
              {row.original_snapshot ? 'Sessão ajustada' : 'Prescrito'}: {e.sets} × {e.reps} ·
              descanso {e.rest_seconds}s
            </Text>
            {<TrainingLogSummary exercise={e} logs={row.progress[i]} />}
          </View>
        ))}
        {row.notes ? <Text>Observações: {row.notes}</Text> : null}
        <Text>Dificuldade: {row.difficulty ?? '—'}/10</Text>
        {!trainer && row.status === 'completed' ? (
          <CompletedExerciseFeedback profileId={profileId} linkId={linkId} execution={row} />
        ) : null}
      </View>
    );
  }
  if (finished) {
    const totals = executionTotals(finished);
    return (
      <View style={{ gap: 16 }}>
        <WorkoutCompletion
          row={finished}
          history={rows}
          feedback={feedback}
          achievementsReady={rows.some(
            (row) => row.id === finished.id && row.status === 'completed',
          )}
        />
        {!trainer && finished.status === 'completed' ? (
          <ProfilePosts
            key={finished.id}
            profileId={profileId}
            workout={{
              id: finished.id,
              title: finished.snapshot.session.name,
              minutes: totals.minutes ?? null,
              exercises: totals.exercises,
            }}
          />
        ) : null}
        {error ? (
          <Text accessibilityRole="alert" color="#FFB87A">
            {error}
          </Text>
        ) : null}
        <DetailsPanel title="Deixar feedback sobre os exercícios">
          <CompletedExerciseFeedback profileId={profileId} linkId={linkId} execution={finished} />
        </DetailsPanel>
        <Button
          title="Voltar aos meus treinos"
          onPress={() => {
            setFinished(null);
            onNavigate?.();
          }}
        />
      </View>
    );
  }
  return (
    <View style={{ gap: 14 }}>
      <Text variant="title">
        {trainer ? 'Histórico de execução' : current ? 'Vamos treinar' : 'Meus treinos'}
      </Text>
      {error ? (
        <Text accessibilityRole="alert" color="#FF6B5A">
          {error}
        </Text>
      ) : null}
      {!current ? <Text variant="caption">{status}</Text> : null}
      {!ready ? (
        <Button title="Tentar carregar novamente" onPress={() => void run(refresh)} />
      ) : null}
      {current ? (
        <>
          <Button
            title="Retomar treino em andamento"
            onPress={() => {
              minimized.clear(profileId, linkId);
              setFocused(true);
            }}
          />
          {focused ? (
            <Modal visible animationType="slide" onRequestClose={minimizeWorkout}>
              <Screen withPadding={false}>
                <View style={{ flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center' }}>
                  <View style={{ paddingHorizontal: 12, paddingTop: 8, gap: 8 }}>
                    <TrainingProgress
                      current={current}
                      status={status}
                      onMinimize={minimizeWorkout}
                      disabled={busy || status !== 'Salvo'}
                    />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Button
                        title="Editar séries"
                        variant="outline"
                        style={{ flex: 1, minHeight: 44 }}
                        disabled={busy || status !== 'Salvo'}
                        onPress={() => setAdjusting(true)}
                      />
                      <RestTimer
                        key={`${current.id}:${current.rest_until}`}
                        until={current.rest_until}
                        now={now}
                        onChange={(rest_until) => edit({ rest_until })}
                      />
                    </View>
                  </View>
                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ padding: 12, gap: 10 }}
                  >
                    {error ? (
                      <Text accessibilityRole="alert" color="#FFB87A">
                        {error}
                      </Text>
                    ) : null}
                    <SessionAdjustmentsSummary current={current} />
                    {adjusting ? (
                      <SessionAdjuster
                        current={current}
                        busy={busy}
                        onApply={adjustSession}
                        onClose={() => setAdjusting(false)}
                      />
                    ) : null}
                    {
                      <ExecutionWithFeedback
                        key={current.id}
                        profileId={profileId}
                        linkId={linkId}
                        current={current}
                        history={rows}
                        historyFeedback={feedback}
                        onChange={changeSet}
                      />
                    }
                    <DetailsPanel title="Como foi o treino? Adicionar observações e dificuldade">
                      <TextField
                        label="Observações do treino"
                        multiline
                        maxLength={1000}
                        value={current.notes}
                        onChangeText={(notes) => edit({ notes })}
                      />
                      <TextField
                        label="Dificuldade percebida (1 a 10)"
                        keyboardType="number-pad"
                        value={current.difficulty === null ? '' : String(current.difficulty)}
                        onChangeText={(v) => {
                          if (!v || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 10))
                            edit({ difficulty: v ? Number(v) : null });
                        }}
                      />
                    </DetailsPanel>
                    {status === 'Alterações não salvas' ? (
                      <Button
                        title="Tentar salvar novamente"
                        disabled={busy}
                        onPress={() => void flush()}
                      />
                    ) : null}
                    <Button
                      title="Finalizar treino"
                      disabled={busy || status === 'Salvando…'}
                      onPress={() => setConfirm(true)}
                    />
                    {confirm ? (
                      <View style={{ gap: 10 }}>
                        <Text>
                          Finalizar com as séries registradas? Séries não marcadas ficarão como não
                          concluídas.
                        </Text>
                        <Button title="Continuar treinando" onPress={() => setConfirm(false)} />
                        <Button
                          title="Confirmar finalização"
                          loading={busy}
                          onPress={() =>
                            void run(async () => {
                              if (!(await flush())) return;
                              const completed = await api<Execution>('finish', latest.current!);
                              setFinished(completed);
                              install(null);
                              setConfirm(false);
                              onNavigate?.();
                              try {
                                await refresh();
                              } catch {
                                setError(
                                  'Treino finalizado. Não foi possível atualizar o histórico agora.',
                                );
                              }
                            })
                          }
                        />
                      </View>
                    ) : null}
                  </ScrollView>
                </View>
              </Screen>
            </Modal>
          ) : null}
        </>
      ) : !trainer && ready ? (
        plans.map((p) => (
          <View key={p.id} style={{ gap: 8 }}>
            <Text>{p.content.title}</Text>
            {p.content.sessions.map((session, i) => (
              <StudentSessionCard
                key={i}
                session={session}
                index={i}
                disabled={busy}
                onStart={() =>
                  void run(async () => {
                    setFinished(null);
                    install(await api<Execution>('start', { plan: p.id, division: i }));
                    onNavigate?.();
                  })
                }
              />
            ))}
          </View>
        ))
      ) : null}
      {!current ? (
        <>
          <WorkoutResultsSummary rows={rows} now={now} />
          <DetailsPanel title="Consultar histórico de treinos">
            <Text variant="title">Últimas execuções</Text>
            {rows
              .filter((r) => trainer || r.status !== 'active')
              .map((r) => (
                <View
                  key={r.id}
                  style={{
                    gap: 8,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: '#3E4B31',
                    borderRadius: 14,
                  }}
                >
                  <Text variant="title">{r.snapshot.session.name}</Text>
                  <Text>
                    {new Date(r.started_at).toLocaleString('pt-BR')} ·{' '}
                    {r.status === 'completed'
                      ? 'Finalizado'
                      : r.status === 'active'
                        ? 'Em andamento'
                        : 'Cancelado'}
                  </Text>
                  {details(r)}
                </View>
              ))}
            {ready && !rows.length ? <Text>Nenhuma execução registrada.</Text> : null}
            <Button
              title="Atualizar histórico"
              disabled={busy || !!current}
              onPress={() => void run(refresh)}
            />
          </DetailsPanel>
        </>
      ) : null}
    </View>
  );
}

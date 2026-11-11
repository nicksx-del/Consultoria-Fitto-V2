import { TrainingAchievements } from './AchievementCards';
import { personalRecords } from './trainingAchievements';
import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Button, Text, TextField } from '@/components/ui';
import { DetailsPanel } from './DetailsPanel';
import type { Execution } from './Executions';
import { TrainingFeedback, trainingTools } from './trainingToolsApi';
import { ExecutionExercises } from './ExecutionExercises';
import { ExercisePerformance } from './ExercisePerformancePanel';
import { exercisePerformance } from './exercisePerformance';
import { previousSets } from './trainingExperience';
import type { SetLog } from './trainingRuntime';
function FeedbackForm({
  exercise,
  index,
  row,
  locked,
  onSave,
  disabled,
  inline = false,
}: {
  exercise: Execution['snapshot']['session']['exercises'][number];
  index: number;
  row?: TrainingFeedback;
  locked: boolean;
  disabled: boolean;
  inline?: boolean;
  onSave: (p: object) => Promise<void>;
}) {
  const [message, setMessage] = useState(row?.message || ''),
    [difficulty, setDifficulty] = useState(row?.difficulty ? String(row.difficulty) : ''),
    [discomfort, setDiscomfort] = useState(row?.discomfort || false),
    [alternative, setAlternative] = useState(row?.alternative || ''),
    [status, setStatus] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <DetailsPanel
      title={
        inline
          ? exercise.approved_alternatives?.length
            ? 'Observações e alternativas'
            : 'Observações do exercício'
          : `${index + 1}. ${exercise.name}: alternativa e feedback`
      }
    >
      {exercise.approved_alternatives?.length ? (
        <>
          <Text variant="caption">
            Escolha uma alternativa autorizada antes de registrar as séries. A escolha é confirmada
            ao salvar abaixo.
          </Text>
          <Button
            title={`Original: ${exercise.name}`}
            variant={!alternative ? 'primary' : 'outline'}
            disabled={disabled || busy || locked}
            onPress={() => setAlternative('')}
          />
          {exercise.approved_alternatives.map((a) => (
            <Button
              key={a.name}
              title={a.name}
              variant={alternative === a.name ? 'primary' : 'outline'}
              disabled={disabled || busy || locked}
              onPress={() => setAlternative(a.name)}
            />
          ))}
        </>
      ) : null}
      <TextField
        label="Dificuldade deste exercício (1–10, opcional)"
        value={difficulty}
        maxLength={2}
        keyboardType="number-pad"
        editable={!disabled && !busy}
        onChangeText={setDifficulty}
      />
      <Button
        title={discomfort ? '✓ Senti desconforto' : 'Senti desconforto'}
        variant={discomfort ? 'primary' : 'outline'}
        disabled={disabled || busy}
        onPress={() => setDiscomfort(!discomfort)}
      />
      {discomfort ? (
        <Text color="#FFB87A">Interrompa o movimento se houver dor e avise o treinador.</Text>
      ) : null}
      <TextField
        label="Dúvida ou observação para o treinador"
        value={message}
        maxLength={500}
        multiline
        editable={!disabled && !busy}
        onChangeText={setMessage}
      />
      <Button
        title={
          exercise.approved_alternatives?.length
            ? 'Salvar observações e alternativa'
            : 'Salvar observações'
        }
        disabled={disabled || busy}
        onPress={() => {
          if (
            difficulty &&
            (!/^\d+$/.test(difficulty) || Number(difficulty) < 1 || Number(difficulty) > 10)
          ) {
            setStatus('Informe dificuldade entre 1 e 10.');
            return;
          }
          setBusy(true);
          setStatus('Salvando…');
          void onSave({
            exercise_index: index,
            message,
            difficulty: difficulty ? Number(difficulty) : null,
            discomfort,
            alternative,
          })
            .then(() => setStatus('Salvo para o treinador.'))
            .catch((e) => setStatus(e.message))
            .finally(() => setBusy(false));
        }}
      />
      {status ? <Text accessibilityLiveRegion="polite">{status}</Text> : null}
    </DetailsPanel>
  );
}
export function ExecutionWithFeedback({
  profileId,
  linkId,
  current,
  onChange,
  history = [],
  historyFeedback = [],
}: {
  profileId: string;
  linkId: string;
  current: Execution;
  onChange: (ei: number, si: number, patch: Partial<SetLog>, rest?: number) => void;
  history?: Execution[];
  historyFeedback?: TrainingFeedback[];
}) {
  const [performance, setPerformance] = useState<{
    exerciseIndex: number;
    setIndex?: number;
  } | null>(null);
  const [rows, setRows] = useState<TrainingFeedback[]>([]),
    [ready, setReady] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    void trainingTools<{ feedback: TrainingFeedback[] }>(profileId, linkId, 'read', {
      execution_id: current.id,
    })
      .then((d) => {
        if (live) {
          setRows(d.feedback.filter((f) => f.execution_id === current.id));
          setReady(true);
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [profileId, linkId, current.id]);
  const effective = useMemo(
    () =>
      current.snapshot.session.exercises.map((e, i) => {
        const a = e.approved_alternatives?.find(
          (a) => a.name === rows.find((r) => r.exercise_index === i)?.alternative,
        );
        return a ? { ...e, name: a.name, catalog: a.catalog } : e;
      }),
    [current.snapshot, rows],
  );
  const previous = useMemo(
    () =>
      previousSets(
        effective,
        history,
        { id: current.id, started_at: current.started_at },
        historyFeedback,
      ),
    [effective, history, current.id, current.started_at, historyFeedback],
  );
  const sessionFeedback = [
    ...historyFeedback.filter((f) => f.execution_id !== current.id),
    ...rows,
  ];
  const records = personalRecords(current, history, sessionFeedback);
  const performanceExercise = performance ? effective[performance.exerciseIndex] : undefined;
  return (
    <View style={{ gap: 14 }}>
      {error ? (
        <>
          <Text accessibilityRole="alert" color="#FF6B5A">
            {error}
          </Text>
          <Button
            title="Tentar carregar feedback"
            onPress={() => {
              setError('');
              void trainingTools<{ feedback: TrainingFeedback[] }>(profileId, linkId, 'read', {
                execution_id: current.id,
              })
                .then((d) => {
                  setRows(d.feedback.filter((f) => f.execution_id === current.id));
                  setReady(true);
                })
                .catch((e) => setError(e.message));
            }}
          />
        </>
      ) : null}
      {ready ? (
        <>
          <ExecutionExercises
            achievements={records}
            exercises={effective}
            progress={current.progress}
            previous={previous}
            onChange={onChange}
            onViewPerformance={(exerciseIndex, setIndex) =>
              setPerformance({ exerciseIndex, setIndex })
            }
            renderFeedback={(i) => (
              <FeedbackForm
                key={i}
                inline
                exercise={current.snapshot.session.exercises[i]}
                index={i}
                row={rows.find((r) => r.exercise_index === i)}
                locked={current.progress[i].some(
                  (l) =>
                    l.done ||
                    l.weight != null ||
                    l.reps != null ||
                    l.seconds != null ||
                    l.hold_until != null ||
                    l.steps?.some(
                      (s) =>
                        s.done ||
                        s.weight != null ||
                        s.reps != null ||
                        s.seconds != null ||
                        s.hold_until != null,
                    ),
                )}
                disabled={false}
                onSave={async (p) => {
                  const saved = await trainingTools<TrainingFeedback>(
                    profileId,
                    linkId,
                    'feedback_save',
                    { ...p, execution_id: current.id },
                  );
                  setRows((rs) => [...rs.filter((r) => r.exercise_index !== i), saved]);
                }}
              />
            )}
          />
          <DetailsPanel title="Conquistas desta sessão">
            <TrainingAchievements records={records} />
          </DetailsPanel>
          {performance && performanceExercise ? (
            <ExercisePerformance
              key={`${performance.exerciseIndex}:${performance.setIndex ?? 'all'}`}
              exercise={performanceExercise}
              data={exercisePerformance(
                performanceExercise,
                current,
                history,
                sessionFeedback,
                performance.setIndex,
              )}
              records={records.filter(
                (record) =>
                  record.exerciseIndex === performance.exerciseIndex &&
                  (performance.setIndex === undefined || record.setIndex === performance.setIndex),
              )}
              onClose={() => setPerformance(null)}
            />
          ) : null}
        </>
      ) : !error ? (
        <Text>Carregando alternativas e feedback…</Text>
      ) : null}
    </View>
  );
}
export function FeedbackInbox({ profileId, linkId }: { profileId: string; linkId: string }) {
  const [rows, setRows] = useState<(TrainingFeedback & { exercise_name: string })[]>([]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true);
    setError('');
    try {
      const d = await trainingTools<{ feedback: typeof rows }>(profileId, linkId, 'read');
      setRows(d.feedback);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void Promise.resolve().then(load); /* Relationship is keyed by parent. */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, linkId]);
  return (
    <DetailsPanel
      title={`Feedback dos exercícios · ${rows.filter((r) => !r.reviewed).length} pendente(s)`}
    >
      <Button
        title="Atualizar feedback"
        variant="outline"
        disabled={busy}
        onPress={() => void load()}
      />
      {error ? (
        <Text accessibilityRole="alert" color="#FF6B5A">
          {error}
        </Text>
      ) : null}
      {rows.length ? (
        rows.map((r) => (
          <View
            key={`${r.execution_id}:${r.exercise_index}`}
            style={{
              gap: 6,
              padding: 12,
              borderWidth: 1,
              borderColor: r.discomfort ? '#FFB87A' : '#35432C',
              borderRadius: 12,
            }}
          >
            <Text variant="title">{r.exercise_name}</Text>
            <Text variant="caption">
              {new Date(r.updated_at).toLocaleString('pt-BR')} ·{' '}
              {r.reviewed ? 'Revisado' : 'Pendente'}
            </Text>
            <Text>
              Dificuldade: {r.difficulty ?? 'não informada'}
              {r.discomfort ? ' · Relatou desconforto' : ''}
            </Text>
            {r.alternative ? <Text>Executou alternativa: {r.alternative}</Text> : null}
            {r.message ? <Text>{r.message}</Text> : null}
            {!r.reviewed ? (
              <Button
                title="Marcar como revisado"
                disabled={busy}
                onPress={() => {
                  setBusy(true);
                  void trainingTools(profileId, linkId, 'feedback_review', {
                    execution_id: r.execution_id,
                    exercise_index: r.exercise_index,
                  })
                    .then(load)
                    .catch((e) => setError(e.message))
                    .finally(() => setBusy(false));
                }}
              />
            ) : null}
          </View>
        ))
      ) : (
        <Text variant="caption">Nenhum feedback registrado.</Text>
      )}
    </DetailsPanel>
  );
}
export function CompletedExerciseFeedback({
  profileId,
  linkId,
  execution,
}: {
  profileId: string;
  linkId: string;
  execution: Execution;
}) {
  const [rows, setRows] = useState<TrainingFeedback[] | null>(null),
    [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    void trainingTools<{ feedback: TrainingFeedback[] }>(profileId, linkId, 'read', {
      execution_id: execution.id,
    })
      .then((d) => {
        if (alive) setRows(d.feedback);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [profileId, linkId, execution.id]);
  return (
    <View style={{ gap: 8 }}>
      {error ? (
        <Text accessibilityRole="alert">{error}</Text>
      ) : rows ? (
        execution.snapshot.session.exercises.map((e, i) => (
          <FeedbackForm
            key={i}
            exercise={e}
            index={i}
            row={rows.find((r) => r.exercise_index === i)}
            disabled={false}
            locked
            onSave={async (p) => {
              const saved = await trainingTools<TrainingFeedback>(
                profileId,
                linkId,
                'feedback_save',
                { ...p, execution_id: execution.id },
              );
              setRows((rs) => [...(rs || []).filter((r) => r.exercise_index !== i), saved]);
            }}
          />
        ))
      ) : (
        <Text>Carregando feedback…</Text>
      )}
    </View>
  );
}

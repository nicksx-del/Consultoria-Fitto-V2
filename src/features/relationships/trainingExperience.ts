import type { Execution } from './Executions';
import type { Exercise, WorkoutContent } from './workoutModel';
import type { TrainingFeedback } from './trainingToolsApi';
import type { SetLog } from './trainingRuntime';
import { seriesFor, isWorking, estimateExerciseSeconds } from './trainingMethods';
export type PublishedWorkout = { id: string; content: WorkoutContent; published_at?: string };
export type PreviousSet = { date: string; log: SetLog };
export function effectiveExercises(row: Execution, feedback: TrainingFeedback[]) {
  const choices = new Map(
    feedback.filter((f) => f.execution_id === row.id).map((f) => [f.exercise_index, f.alternative]),
  );
  return row.snapshot.session.exercises.map((e, i) => {
    const name = choices.get(i);
    const a = e.approved_alternatives?.find((a) => a.name === name);
    return a ? { ...e, name: a.name, catalog: a.catalog } : e;
  });
}
export function sameExercise(a: Exercise, b: Exercise) {
  return (
    (a.metric || 'reps') === (b.metric || 'reps') &&
    (a.catalog?.id || b.catalog?.id
      ? a.catalog?.id === b.catalog?.id
      : a.name.trim().toLocaleLowerCase('pt-BR') === b.name.trim().toLocaleLowerCase('pt-BR'))
  );
}
export function previousSets(
  exercises: Exercise[],
  rows: Execution[],
  current: Pick<Execution, 'id' | 'started_at'>,
  feedback: TrainingFeedback[],
): (PreviousSet | undefined)[][] {
  const history = rows
    .filter(
      (r) => r.status === 'completed' && r.id !== current.id && r.started_at < current.started_at,
    )
    .sort((a, b) => b.started_at.localeCompare(a.started_at))
    .map((row) => ({ row, exercises: effectiveExercises(row, feedback) }));
  return exercises.map((e, ei) => {
    const occurrence = exercises.slice(0, ei).filter((x) => sameExercise(e, x)).length;
    // Use the latest occurrence of this movement; never silently skip a missing/incomplete set.
    for (const { row, exercises: oldExercises } of history) {
      const matches = oldExercises.flatMap((x, i) => (sameExercise(e, x) ? [i] : []));
      const i = matches[occurrence];
      if (i === undefined) continue;
      const old = oldExercises[i];
      return Array.from({ length: e.sets }, (_, si) => {
        const p = seriesFor(e, si),
          q = seriesFor(old, si),
          log = row.progress[i]?.[si];
        const technique = p.technique?.type || 'traditional',
          oldTechnique = q.technique?.type || 'traditional';
        if (
          si >= old.sets ||
          !log?.done ||
          p.kind !== q.kind ||
          technique !== oldTechnique ||
          (p.technique && p.technique.steps.length !== q.technique?.steps.length)
        )
          return undefined;
        return { date: row.started_at, log };
      });
    }
    return [];
  });
}
export function suggestedWorkout(plans: PublishedWorkout[], rows: Execution[]) {
  const active = rows.find((r) => r.status === 'active');
  if (active) return { active };
  const plan = plans[0];
  if (!plan?.content.sessions.length) return null;
  const last = rows
    .filter((r) => r.status === 'completed' && r.snapshot.plan === plan.id)
    .sort((a, b) => b.started_at.localeCompare(a.started_at))[0];
  const matching = last
    ? plan.content.sessions.flatMap((s, i) => (s.name === last.snapshot.session.name ? [i] : []))
    : [];
  const division = matching.length === 1 ? (matching[0] + 1) % plan.content.sessions.length : 0;
  return { plan, division, session: plan.content.sessions[division] };
}
export function estimatedMinutes(exercises: Exercise[]) {
  return Math.max(
    1,
    Math.round(exercises.reduce((n, e) => n + estimateExerciseSeconds(e, exercises), 0) / 60),
  );
}
export function executionTotals(row: Execution) {
  let total = 0,
    done = 0,
    work = 0,
    preparation = 0,
    exercises = 0;
  row.snapshot.session.exercises.forEach((e, i) => {
    total += e.sets;
    const logs = row.progress[i] || [];
    if (logs.length >= e.sets && logs.slice(0, e.sets).every((l) => l.done)) exercises++;
    for (let si = 0; si < e.sets; si++)
      if (logs[si]?.done) {
        done++;
        if (isWorking(seriesFor(e, si).kind)) work++;
        else preparation++;
      }
  });
  const ms = row.finished_at ? Date.parse(row.finished_at) - Date.parse(row.started_at) : NaN;
  return {
    total,
    done,
    work,
    preparation,
    exercises,
    exerciseTotal: row.snapshot.session.exercises.length,
    minutes: Number.isFinite(ms) && ms >= 0 ? Math.round(ms / 60000) : null,
  };
}
export function previousSession(row: Execution, rows: Execution[]) {
  return rows
    .filter(
      (r) =>
        r.status === 'completed' &&
        r.id !== row.id &&
        r.started_at < row.started_at &&
        r.snapshot.plan === row.snapshot.plan &&
        r.snapshot.session.name === row.snapshot.session.name,
    )
    .sort((a, b) => b.started_at.localeCompare(a.started_at))[0];
}

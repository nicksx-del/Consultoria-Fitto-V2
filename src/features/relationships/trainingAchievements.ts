import type { Execution } from './Executions';
import type { TrainingFeedback } from './trainingToolsApi';
import { effectiveExercises, sameExercise } from './trainingExperience';
import { isWorking, seriesFor } from './trainingMethods';

export type PersonalRecord = {
  key: string;
  kind: string;
  exercise: string;
  type: 'load' | 'reps';
  value: number;
  before: number;
  weight?: number;
};
export function personalRecords(
  current: Execution,
  history: Execution[],
  feedback: TrainingFeedback[] = [],
): PersonalRecord[] {
  const past = history.filter(
    (r) => r.id !== current.id && r.status === 'completed' && r.started_at < current.started_at,
  );
  const records: PersonalRecord[] = [];
  for (const [ei, e] of effectiveExercises(current, feedback).entries()) {
    if ((e.metric || 'reps') !== 'reps') continue;
    const comparable = past.flatMap((row) =>
      effectiveExercises(row, feedback).flatMap((old, oi) => {
        if (!sameExercise(e, old) || (e.group_rule?.type || '') !== (old.group_rule?.type || ''))
          return [];
        return (row.progress[oi] || []).flatMap((log, si) => {
          const prescription = seriesFor(old, si);
          return log.done &&
            log.weight != null &&
            log.weight >= 0 &&
            Number.isFinite(log.weight) &&
            log.reps != null &&
            log.reps > 0 &&
            Number.isFinite(log.reps) &&
            isWorking(prescription.kind) &&
            !prescription.technique
            ? [{ ...log, kind: prescription.kind }]
            : [];
        });
      }),
    );
    for (const [si, log] of (current.progress[ei] || []).entries()) {
      const p = seriesFor(e, si);
      if (
        !log.done ||
        log.weight == null ||
        !Number.isFinite(log.weight) ||
        log.weight < 0 ||
        log.reps == null ||
        !Number.isFinite(log.reps) ||
        log.reps <= 0 ||
        !isWorking(p.kind) ||
        p.technique
      )
        continue;
      const baseline = comparable.filter((old) => old.kind === p.kind);
      if (!baseline.length) continue;
      const bestWeight = Math.max(...baseline.map((old) => old.weight!));
      if (log.weight > bestWeight)
        records.push({
          key: `${e.catalog?.provider}:${e.catalog?.id || e.name.toLowerCase()}:${p.kind}:load`,
          kind: p.kind,
          exercise: e.name,
          type: 'load',
          value: log.weight,
          before: bestWeight,
        });
      const sameLoad = baseline.filter((old) => old.weight === log.weight);
      const bestReps = sameLoad.length ? Math.max(...sameLoad.map((old) => old.reps!)) : null;
      if (bestReps !== null && log.reps > bestReps)
        records.push({
          key: `${e.catalog?.provider}:${e.catalog?.id || e.name.toLowerCase()}:${p.kind}:reps:${log.weight}`,
          kind: p.kind,
          exercise: e.name,
          type: 'reps',
          value: log.reps,
          before: bestReps,
          weight: log.weight,
        });
    }
  }
  // A record is shown once per movement/category, using the best series of this workout.
  return records.filter(
    (record, i) =>
      !records.some(
        (other, j) =>
          other.key === record.key &&
          (other.value > record.value || (other.value === record.value && j < i)),
      ),
  );
}
export function workoutMilestone(current: Execution, history: Execution[]) {
  if (current.status !== 'completed' || history.length >= 50) return null;
  const previous = new Set(
    history
      .filter(
        (r) => r.id !== current.id && r.status === 'completed' && r.started_at < current.started_at,
      )
      .map((r) => r.id),
  ).size;
  const count = previous + 1;
  return [1, 5, 10, 25].includes(count) ? count : null;
}

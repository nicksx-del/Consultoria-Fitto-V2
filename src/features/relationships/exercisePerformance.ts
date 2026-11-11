import type { Execution } from './Executions';
import type { Exercise } from './workoutModel';
import type { TrainingFeedback } from './trainingToolsApi';
import { effectiveExercises, sameExercise } from './trainingExperience';
import { isWorking, seriesFor } from './trainingMethods';
import { setEffort } from './workoutModel';
import type { SetLog } from './trainingRuntime';

type PerformanceSet = {
  weight: number;
  reps: number;
  date: string;
  effort?: SetLog['actual_effort'];
  quality?: SetLog['rep_quality'];
};

function estimate1RM(set: PerformanceSet) {
  if (set.weight <= 0 || set.reps > 10) return undefined;
  return set.reps === 1 ? set.weight : set.weight * (1 + set.reps / 30);
}

export function exercisePerformance(
  exercise: Exercise,
  current: Execution,
  history: Execution[],
  feedback: TrainingFeedback[],
  setIndex?: number,
) {
  const past = history.filter(
    (row) =>
      row.status === 'completed' && row.id !== current.id && row.started_at < current.started_at,
  );
  const sessions = [...past, current]
    .sort((a, b) => a.started_at.localeCompare(b.started_at))
    .flatMap((row) => {
      const sets = effectiveExercises(row, feedback).flatMap((candidate, ei) => {
        if (
          (exercise.metric || 'reps') !== 'reps' ||
          !sameExercise(exercise, candidate) ||
          exercise.group_rule?.type !== candidate.group_rule?.type
        )
          return [];
        return (row.progress[ei] ?? []).flatMap((log, si) => {
          const p = seriesFor(candidate, si);
          return log.done &&
            isWorking(p.kind) &&
            !p.technique &&
            log.weight != null &&
            Number.isFinite(log.weight) &&
            log.weight >= 0 &&
            log.reps != null &&
            Number.isInteger(log.reps) &&
            log.reps > 0
            ? [
                {
                  weight: log.weight,
                  reps: log.reps,
                  date: row.started_at,
                  effort: log.actual_effort,
                  quality: log.rep_quality,
                },
              ]
            : [];
        });
      });
      return sets.length
        ? [
            {
              id: row.id,
              date: row.started_at,
              name: row.snapshot.session.name,
              active: row.status === 'active',
              sets,
              peak: Math.max(...sets.map((s) => s.weight)),
              estimate: sets.reduce<number | undefined>((best, set) => {
                const value = estimate1RM(set);
                return value !== undefined && value > (best ?? 0) ? value : best;
              }, undefined),
              volume: sets.reduce((sum, set) => sum + set.weight * set.reps, 0),
              reps: sets.reduce((sum, set) => sum + set.reps, 0),
            },
          ]
        : [];
    });
  const byReps = new Map<number, PerformanceSet>();
  let bestLoad: PerformanceSet | undefined;
  let bestEstimate: (PerformanceSet & { estimate: number }) | undefined;
  for (const set of sessions.flatMap((session) => session.sets)) {
    if (
      !bestLoad ||
      set.weight > bestLoad.weight ||
      (set.weight === bestLoad.weight && set.reps > bestLoad.reps)
    )
      bestLoad = set;
    if (set.weight > (byReps.get(set.reps)?.weight ?? -1)) byReps.set(set.reps, set);
    const estimate = estimate1RM(set);
    if (estimate !== undefined && (!bestEstimate || estimate > bestEstimate.estimate))
      bestEstimate = { ...set, estimate };
  }
  const workIndex =
    exercise.prescribed_sets?.findIndex((p) => isWorking(p.kind) && !p.technique) ?? -1;
  const targetIndex = setIndex ?? Math.max(0, workIndex);
  const target = seriesFor(exercise, targetIndex).target.trim();
  const range = /^(\d+)\s*(?:[-–—]\s*(\d+))?$/.exec(target);
  const targetBest = range
    ? [...byReps.values()]
        .filter((s) => s.reps >= Number(range[1]) && s.reps <= Number(range[2] ?? range[1]))
        .sort((a, b) => b.weight - a.weight || b.reps - a.reps)[0]
    : undefined;
  return {
    bestLoad,
    bestEstimate,
    byReps: [...byReps.values()].sort((a, b) => a.reps - b.reps),
    target: range ? target : undefined,
    targetEffort: setEffort(exercise, targetIndex),
    targetRange: range ? [Number(range[1]), Number(range[2] ?? range[1])] : undefined,
    targetBest,
    last: sessions.filter((session) => session.id !== current.id).at(-1),
    recent: sessions.slice(-6),
    sessions,
  };
}

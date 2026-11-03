import type { EffortTarget, Exercise } from './workoutModel';
export type StepLog = {
  weight: number | null;
  reps: number | null;
  seconds?: number | null;
  done: boolean;
  hold_until?: string | null;
};
export type SetLog = StepLog & {
  rep_quality?: 'good' | 'fair' | 'poor' | null;
  actual_effort?: EffortTarget | null;
  steps?: StepLog[];
};
export function emptyStep(): StepLog {
  return { weight: null, reps: null, done: false };
}
export function summarizeSteps(steps: StepLog[], isometric: boolean): Partial<SetLog> {
  const weights = steps.flatMap((s) => (s.weight === null ? [] : [s.weight]));
  const reps = steps.flatMap((s) => (s.reps === null ? [] : [s.reps]));
  return {
    steps,
    done: steps.every((s) => s.done),
    weight: weights.length ? Math.max(...weights) : null,
    reps: isometric ? null : reps.length ? reps.reduce((a, b) => a + b, 0) : null,
    seconds: isometric ? steps.reduce((n, s) => n + (s.seconds || 0), 0) : undefined,
  };
}
export function nextGroupSet(
  exercises: Exercise[],
  indices: number[],
  progress: SetLog[][],
  rounds: number,
) {
  for (let round = 0; round < rounds; round++)
    for (let member = 0; member < indices.length; member++)
      if (!progress[indices[member]]?.[round]?.done)
        return { round, member, exerciseIndex: indices[member] };
  return null;
}

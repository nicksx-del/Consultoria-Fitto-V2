import type { SetLog } from './trainingRuntime';
import type { Exercise, SetPrescription } from './workoutModel';
export type SessionAdjustment = {
  operation: 'add' | 'remove' | 'replace';
  exercise_index: number;
  set_index: number;
  prescription?: SetPrescription;
};
export function setHasRecord(log: SetLog) {
  return (
    log.done ||
    log.weight != null ||
    log.reps != null ||
    log.seconds != null ||
    log.actual_effort != null ||
    log.rep_quality != null ||
    log.steps?.some(
      (step) =>
        step.done ||
        step.weight != null ||
        step.reps != null ||
        step.seconds != null ||
        step.hold_until != null,
    ) ||
    false
  );
}
export function buildSessionPrescription(
  base: SetPrescription,
  kind: SetPrescription['kind'],
  format: string,
  target: string,
  load: string,
  rest: string,
  blocks: string,
  blockReps: string,
  blockRest: string,
): SetPrescription {
  if (
    (format !== 'cluster' && (!target.trim() || target.length > 40)) ||
    load.length > 100 ||
    !/^\d{1,4}$/.test(rest) ||
    Number(rest) > 1800
  )
    throw new Error('Confira alvo, carga e descanso (0 a 1800 s).');
  const next = { ...base, kind, target, load, rest };
  if (format === 'traditional') {
    delete next.technique;
    return next;
  }
  if (format !== 'cluster') return next;
  if (
    !/^[2-8]$/.test(blocks) ||
    !/^\d{1,3}$/.test(blockReps) ||
    Number(blockReps) < 1 ||
    Number(blocks) * Number(blockReps) > 1000 ||
    !/^\d{1,4}$/.test(blockRest) ||
    Number(blockRest) > 1800
  )
    throw new Error('Cluster: de 2 a 8 blocos, repetições por bloco e pausa de 0 a 1800 s.');
  next.target = String(Number(blocks) * Number(blockReps));
  next.technique = {
    type: 'cluster',
    steps: Array.from({ length: Number(blocks) }, (_, i) => ({
      target: blockReps,
      load,
      rest: i === Number(blocks) - 1 ? '0' : blockRest,
    })),
  };
  return next;
}
export function adjustmentMembers(exercises: Exercise[], index: number) {
  const group = exercises[index].group_rule?.id;
  return exercises.flatMap((ex, i) =>
    i === index || (group && ex.group_rule?.id === group) ? [i] : [],
  );
}

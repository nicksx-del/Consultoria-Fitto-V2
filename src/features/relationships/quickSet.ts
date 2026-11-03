import type { Exercise } from './workoutModel';
import { seriesFor } from './trainingMethods';
import type { SetLog } from './trainingRuntime';

export function quickSuggestions(exercise: Exercise, index: number, previous?: SetLog) {
  const p = seriesFor(exercise, index);
  const load = p.load.trim().replace(',', '.');
  const prescribedWeight = /^\d+(?:\.\d+)?\s*(?:kg)?$/i.test(load)
    ? Number(load.replace(/kg/i, '').trim())
    : null;
  const target = p.target.trim();
  const match = target.match(/^(\d+)(?:\s*(?:[-–—]|a)\s*(\d+))?$/);
  const maximum = exercise.metric && exercise.metric !== 'reps' ? 1000000 : 1000;
  const valid = (value: number | null | undefined, max: number) =>
    value != null && Number.isFinite(value) && value >= 0 && value <= max ? value : null;
  return {
    weight: valid(previous?.weight, 2000) ?? valid(prescribedWeight, 2000),
    reps:
      valid(previous?.reps, maximum) ?? valid(match ? Number(match[2] || match[1]) : null, maximum),
    source: previous ? 'Último registro compatível' : 'Sugestão da prescrição',
  };
}

import type { EffortTarget, SetPrescription } from './workoutModel';
import { validEffort } from './workoutModel';
import { isWorking } from './trainingMethods';

export function parseQuickEffort(
  text: string,
  mode: EffortTarget['mode'] = 'rir',
): EffortTarget | null {
  if (!text.trim()) return null;
  const match = text
    .trim()
    .replace(/,/g, '.')
    .match(/^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)$|^(\d+(?:\.\d+)?)$/);
  if (!match) throw new Error('Use um valor ou intervalo, como 2 ou 1–2.');
  const min = Number(match[1] ?? match[3]),
    max = Number(match[2] ?? match[3]);
  const value = { mode, min, max };
  if (!validEffort(value))
    throw new Error(
      mode === 'rir'
        ? 'RIR: inteiros de 0 a 10, em ordem crescente.'
        : 'RPE: de 1 a 10, em passos de 0,5.',
    );
  return value;
}
export function applyWorkingPrescription(
  rows: SetPrescription[],
  target: string,
  rest: string,
  effort: EffortTarget | null,
) {
  if (!target.trim() || target.length > 40 || !/^\d{1,4}$/.test(rest) || Number(rest) > 1800)
    throw new Error('Confira repetições e descanso (0 a 1800 s).');
  return rows.map((row) =>
    isWorking(row.kind)
      ? { ...row, target: row.technique ? row.target : target.trim(), rest, effort_target: effort }
      : row,
  );
}
export function duplicatePrescription(rows: SetPrescription[], index: number) {
  if (!rows[index] || rows.length >= 20) return rows;
  return [...rows.slice(0, index + 1), structuredClone(rows[index]), ...rows.slice(index + 1)];
}

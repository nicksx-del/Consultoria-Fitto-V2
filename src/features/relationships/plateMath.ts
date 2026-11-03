export const olympicPlates = [
  { kg: 25, color: '#D83737', ink: '#FFFFFF' },
  { kg: 20, color: '#2468C9', ink: '#FFFFFF' },
  { kg: 15, color: '#F2CA38', ink: '#172111' },
  { kg: 10, color: '#25945D', ink: '#FFFFFF' },
  { kg: 5, color: '#F3F3ED', ink: '#172111' },
  { kg: 2.5, color: '#D83737', ink: '#FFFFFF' },
  { kg: 2, color: '#2468C9', ink: '#FFFFFF' },
  { kg: 1.5, color: '#F2CA38', ink: '#172111' },
  { kg: 1, color: '#25945D', ink: '#FFFFFF' },
  { kg: 0.5, color: '#F3F3ED', ink: '#172111' },
] as const;
export function plateTotal(counts: Record<string, number>, bar: number, paired: boolean) {
  const side = olympicPlates.reduce(
    (sum, p) => sum + p.kg * Math.max(0, Math.min(20, Math.floor(counts[p.kg] || 0))),
    0,
  );
  return Math.round(((paired ? bar : 0) + side * (paired ? 2 : 1)) * 100) / 100;
}
export function adjustLogValue(value: number | null | undefined, delta: number, max: number) {
  return Math.round(Math.max(0, Math.min(max, (value ?? 0) + delta)) * 100) / 100;
}

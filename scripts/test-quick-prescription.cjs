const assert = require('node:assert/strict');
const { parseQuickEffort, applyWorkingPrescription, duplicatePrescription } =
  require('./load-feature.cjs')('./quickPrescription');
assert.deepEqual(parseQuickEffort('1–2'), { mode: 'rir', min: 1, max: 2 });
assert.deepEqual(parseQuickEffort('8,5-9', 'rpe'), { mode: 'rpe', min: 8.5, max: 9 });
assert.equal(parseQuickEffort(''), null);
for (const text of ['2-1', '11', '1.5', 'a', '1-2-3', '-1'])
  assert.throws(() => parseQuickEffort(text));
const base = {
  kind: 'work',
  target: '12',
  rest: '60',
  load: '',
  effort_target: { mode: 'rir', min: 3, max: 3 },
};
const cluster = {
  ...base,
  technique: {
    type: 'cluster',
    steps: [
      { target: '3', rest: '15', load: '' },
      { target: '3', rest: '0', load: '' },
    ],
  },
};
const original = [
  { ...base, kind: 'warmup' },
  { ...base, kind: 'ramp' },
  base,
  { ...base, kind: 'top' },
  { ...base, kind: 'backoff' },
  cluster,
];
const updated = applyWorkingPrescription(original, '8–10', '90', parseQuickEffort('1–2'));
assert.equal(updated[0], original[0]);
assert.equal(updated[1], original[1]);
for (const i of [2, 3, 4]) {
  assert.equal(updated[i].target, '8–10');
  assert.equal(updated[i].rest, '90');
  assert.equal(updated[i].effort_target.min, 1);
}
assert.equal(updated[5].target, '12');
assert.deepEqual(updated[5].technique, cluster.technique);
assert.equal(original[2].rest, '60');
assert.throws(() => applyWorkingPrescription(original, '12', '1801', null));
const dup = duplicatePrescription(original, 5);
dup[6].technique.steps[0].target = '5';
assert.equal(original[5].technique.steps[0].target, '3');
assert.equal(dup.length, 7);
assert.equal(
  duplicatePrescription(
    Array.from({ length: 20 }, () => base),
    0,
  ).length,
  20,
);
console.log(
  'PASS: quick RIR/RPE parsing, invalid ranges, preparation preservation, bulk work/top/backoff, technique preservation and deep duplication.',
);

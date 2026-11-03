const fs = require('fs'),
  ts = require('typescript'),
  assert = require('node:assert/strict');
const api = {};
new Function(
  'exports',
  ts.transpileModule(fs.readFileSync('src/features/relationships/sessionAdjustments.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
)(api);
const base = { kind: 'work', target: '12', load: '20 kg', rest: '60' };
const p = api.buildSessionPrescription(
  base,
  'warmup',
  'cluster',
  '12',
  '10 kg',
  '60',
  '3',
  '4',
  '15',
);
assert.equal(p.kind, 'warmup');
assert.equal(p.technique.steps.length, 3);
assert.equal(p.technique.steps[2].rest, '0');
assert.equal(p.technique.steps[0].rest, '15');
assert.equal(base.technique, undefined);
const normal = api.buildSessionPrescription(
  p,
  'work',
  'traditional',
  '12',
  '20 kg',
  '60',
  '3',
  '4',
  '15',
);
assert.equal(normal.technique, undefined);
assert.equal(p.technique.type, 'cluster');
const clusterWithoutTarget = api.buildSessionPrescription(
  base,
  'work',
  'cluster',
  '',
  '20 kg',
  '60',
  '3',
  '4',
  '15',
);
assert.equal(clusterWithoutTarget.target, '12');
assert.throws(() =>
  api.buildSessionPrescription(base, 'work', 'traditional', '', '20 kg', '60', '3', '4', '15'),
);
assert.throws(() =>
  api.buildSessionPrescription(base, 'work', 'cluster', '12', '', '60', '9', '4', '15'),
);
assert.throws(() =>
  api.buildSessionPrescription(base, 'work', 'traditional', '12', '', '1801', '', '', ''),
);
assert.equal(api.setHasRecord({ weight: null, reps: null, done: false }), false);
assert.equal(api.setHasRecord({ weight: 0, reps: null, done: false }), true);
assert.equal(
  api.setHasRecord({
    weight: null,
    reps: null,
    done: false,
    steps: [{ weight: null, reps: 2, done: false }],
  }),
  true,
);
const exercises = [{ group_rule: { id: 'a' } }, { group_rule: { id: 'a' } }, { name: 'Separate' }];
assert.deepEqual(api.adjustmentMembers(exercises, 0), [0, 1]);
assert.deepEqual(api.adjustmentMembers(exercises, 2), [2]);
console.log(
  'PASS: cluster construction, immutable original, traditional conversion, numeric limits, recorded zero-load/partial steps and group scope.',
);

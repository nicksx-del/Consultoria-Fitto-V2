const assert = require('node:assert/strict');
const api = require('./load-feature.cjs')('./trainingAchievements');
const e = {
  name: 'Supino',
  sets: 1,
  reps: '10',
  rest_seconds: 60,
  catalog: { provider: 'exercisedb', id: 'bench' },
  prescribed_sets: [{ kind: 'work', target: '10', load: '20', rest: '60' }],
};
const row = (id, date, weight, reps, status = 'completed') => ({
  id,
  status,
  started_at: date,
  snapshot: { session: { name: 'A', exercises: [structuredClone(e)] } },
  progress: [[{ weight, reps, done: true }]],
});
const before = row('old', '2026-11-01T12:00:00Z', 20, 10),
  now = row('now', '2026-11-02T12:00:00Z', 22, 10);
assert.equal(api.personalRecords(now, [before])[0].type, 'load');
assert.equal(
  api.personalRecords({ ...now, progress: [[{ weight: 20, reps: 12, done: true }]] }, [before])[0]
    .type,
  'reps',
);
assert.deepEqual(api.personalRecords(now, []), []);
assert.deepEqual(api.personalRecords(now, [{ ...before, status: 'active' }]), []);
assert.deepEqual(
  api.personalRecords({ ...now, progress: [[{ weight: 22, reps: 10, done: false }]] }, [before]),
  [],
);
assert.deepEqual(
  api.personalRecords({ ...now, progress: [[{ weight: 22, reps: null, done: true }]] }, [before]),
  [],
);
const mismatch = structuredClone(now);
mismatch.snapshot.session.exercises[0].metric = 'seconds';
assert.deepEqual(api.personalRecords(mismatch, [before]), []);
const warmup = structuredClone(now);
warmup.snapshot.session.exercises[0].prescribed_sets[0].kind = 'warmup';
assert.deepEqual(api.personalRecords(warmup, [before]), []);
const other = structuredClone(before);
other.snapshot.session.exercises[0].catalog.id = 'other';
assert.deepEqual(api.personalRecords(now, [other]), []);
const alternative = structuredClone(before);
alternative.snapshot.session.exercises[0].approved_alternatives = [
  { name: 'Máquina', catalog: { id: 'machine' } },
];
assert.deepEqual(
  api.personalRecords(
    now,
    [alternative],
    [{ execution_id: 'old', exercise_index: 0, alternative: 'Máquina' }],
  ),
  [],
);
assert.deepEqual(
  api
    .personalRecords(now, [
      before,
      {
        ...before,
        started_at: '2026-11-03T12:00:00Z',
        progress: [[{ weight: 100, reps: 10, done: true }]],
      },
    ])
    .map((r) => r.value),
  [22],
);
assert.equal(api.workoutMilestone(now, []), 1);
assert.equal(api.workoutMilestone({ ...now, status: 'active' }, []), null);
assert.equal(
  api.workoutMilestone(
    now,
    Array.from({ length: 50 }, (_, i) => ({ ...before, id: String(i) })),
  ),
  null,
);
assert.equal(
  api.workoutMilestone(
    now,
    Array.from({ length: 4 }, (_, i) => ({ ...before, id: String(i) })),
  ),
  5,
);
console.log(
  'PASS: load/repetition records, baseline, incomplete/missing logs, units, warmups, identity, alternatives, future sessions and milestone history limits',
);

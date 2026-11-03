const assert = require('node:assert/strict');
const { quickSuggestions } = require('./load-feature.cjs')('./quickSet');
const exercise = { name: 'Supino', sets: 3, reps: '8–12', load: '20,5 kg', rest_seconds: 60 };
assert.deepEqual(quickSuggestions(exercise, 0), {
  weight: 20.5,
  reps: 12,
  source: 'Sugestão da prescrição',
});
const previous = {
  weight: 22,
  reps: 10,
  done: true,
  actual_effort: { mode: 'rir', min: 1, max: 1 },
};
const suggestion = quickSuggestions(exercise, 1, previous);
assert.equal(suggestion.weight, 22);
assert.equal(suggestion.reps, 10);
assert(!('actual_effort' in suggestion));
assert(!('done' in suggestion));
for (const load of ['80%', '20–30 kg', '20 kg por lado', 'livre'])
  assert.equal(quickSuggestions({ ...exercise, load }, 0).weight, null);
assert.equal(quickSuggestions({ ...exercise, reps: 'até a falha' }, 0).reps, null);
assert.equal(quickSuggestions({ ...exercise, load: '0 kg', reps: '10' }, 0).weight, 0);
console.log(
  'PASS: explicit suggestions, decimal kg, rep ranges, prior values, ambiguous prescriptions and no copied completion/effort',
);

const assert = require('node:assert/strict');
const api = require('./load-feature.cjs')('./exerciseCatalog');

(async () => {
  const { rows } = await api.loadCatalog();
  for (const exercise of rows) {
    const label = api.exerciseName(exercise);
    assert.notEqual(label, exercise.name, `Missing Portuguese name: ${exercise.name}`);
    assert(label.length <= 120, `Name too long: ${label}`);
    assert(api.matchesExercise(exercise, label), `Portuguese search failed: ${label}`);
    assert(
      api.matchesExercise(exercise, api.normalize(label)),
      `Accent-free search failed: ${label}`,
    );
    assert(api.matchesExercise(exercise, exercise.name), `English search failed: ${exercise.name}`);
  }
  assert.equal(
    api.exerciseName({ id: 'custom', name: 'Meu exercício adaptado' }),
    'Meu exercício adaptado',
  );
  assert.equal(api.exerciseName({ id: 'Leg_Press', name: 'Leg Press' }), 'Leg press');
  console.log(
    `PASS: ${rows.length} Portuguese names; Portuguese, accent-free and English searches; custom and legacy names preserved`,
  );
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

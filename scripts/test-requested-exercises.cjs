const assert = require('node:assert/strict'),
  api = require('./load-feature.cjs')('./exerciseCatalog');
(async () => {
  const { rows } = await api.loadCatalog();
  const expected = [
    ['Supino Inclinado c/ halteres', 'Incline_Dumbbell_Press'],
    ['Triceps Francês', 'Standing_Dumbbell_Triceps_Extension'],
    ['Peck deck', 'Butterfly'],
    ['Voador', 'Butterfly'],
    ['T-bar', 'T-Bar_Row_with_Handle'],
    ['Pull down', 'Straight-Arm_Pulldown'],
    ['Rosca Alternada c/ Halteres', 'Dumbbell_Alternate_Bicep_Curl'],
    ['Adutora', 'Thigh_Adductor'],
    ['Agachamento Rack', 'Hack_Squat'],
    ['Stiff com barra', 'edb_hrVQWvE'],
    ['Cadeira Extensora', 'Leg_Extensions'],
    ['Crossover polia alta', 'edb_7saC5zz'],
    ['Paralela maquina', 'edb_PAgTVaK'],
    ['Paralela maquina', 'edb_BRImeP8'],
    ['Agachamento livre', 'edb_qXTaZnJ'],
    ['Panturillha', 'edb_ykUOVze'],
    ['Elevação lateral', 'edb_DsgkuIt'],
    ['Elevação lateral na polia', 'edb_goJ6ezq'],
    ['Puxada alta', 'edb_eYnzaCm'],
    ['Rosca martelo', 'edb_2NpxjC1'],
  ];
  for (const [q, id] of expected) {
    const found = rows.filter((e) => api.matchesExercise(e, q));
    assert(
      found.some((e) => e.id === api.animatedCatalogId(id)),
      q,
    );
    if (['T-bar', 'Pull down'].includes(q)) assert.equal(found.length, 1, q);
  }
  assert.equal(rows.find((e) => e.id === api.animatedCatalogId('Hack_Squat')).equipment, 'machine');
  await Promise.all(
    rows
      .filter((e) => expected.some(([, id]) => e.id === api.animatedCatalogId(id)))
      .map(async (e) => {
        const r = await fetch(api.imageUrl(e.images[0]));
        assert(r.ok, e.id + ' GIF');
        assert((r.headers.get('content-type') || '').startsWith('image/'), e.id);
      }),
  );
  for (const [, id] of expected) {
    if (id.startsWith('edb_')) continue;
    const upgraded = api.resolveCatalogReference({
      provider: 'free-exercise-db',
      id,
      images: [id + '/0.jpg'],
      instructions: 'Original',
    });
    assert.equal(upgraded.provider, 'exercisedb');
    assert.equal(upgraded.id, api.animatedCatalogId(id));
    assert(upgraded.images[0].endsWith('.gif'));
  }
  console.log('PASS: saved photo references upgrade to animated GIF references.');
  console.log(
    'PASS: all requested exercises searchable, exact T-bar/pull down, machine hack and live demonstration images.',
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

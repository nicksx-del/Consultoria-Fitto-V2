const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const source = fs.readFileSync('src/features/nutrition/nutritionModel.ts', 'utf8');
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const api = {};
new Function('exports', output)(api);
const doc = api.emptyNutrition();
assert.equal(doc.meals.length, 3);
assert.equal(new Set(doc.meals.map((m) => m.id)).size, 3);
assert.equal(api.nutritionProblems(doc, false).length, 0);
assert(api.nutritionProblems(doc, true).some((message) => message.includes('quantidade')));
doc.meals.forEach((m) => {
  m.foods[0].name = 'Alimento';
  m.foods[0].quantity = '1 unidade';
});
assert.equal(api.nutritionProblems(doc, true).length, 0);
doc.meals[0].time = '25:00';
assert(api.nutritionProblems(doc, true).some((m) => m.includes('HH:MM')));
doc.meals[0].time = '08:30';
doc.targets.kcal = '2000,5';
assert.equal(api.nutritionProblems(doc, true).length, 0);
doc.targets.kcal = 'abc';
assert(api.nutritionProblems(doc, true).some((m) => m.includes('numéricas')));
assert.equal(api.nutritionDay(new Date(2026, 10, 2, 23, 59)), '2026-11-02');
assert.deepEqual(
  api
    .recentMealEntries(
      [
        { day: '2026-10-26', status: 'done' },
        { day: '2026-10-27', status: 'done' },
        { day: '2026-11-02', status: 'pending', note: '' },
        { day: '2026-11-02', status: 'pending', note: 'Observação' },
        { day: '2026-11-03', status: 'done' },
      ],
      '2026-11-02',
    )
    .map((e) => e.day),
  ['2026-10-27', '2026-11-02'],
);
console.log(
  'PASS: independent meal IDs, drafts vs publish, food quantities, clocks, numeric optional targets and local calendar date',
);

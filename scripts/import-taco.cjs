const fs = require('fs');
(async () => {
  const base = 'https://brolesi.github.io/taco/';
  const index = await (await fetch(base + 'foods.json')).json();
  let next = 0;
  const rows = [];
  await Promise.all(
    Array.from({ length: 16 }, async () => {
      while (next < index.foods.length) {
        const f = index.foods[next++];
        let d;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const r = await fetch(base + 'foods/' + f.id + '.json');
            if (!r.ok) throw Error(r.status);
            d = await r.json();
            break;
          } catch (e) {
            if (attempt === 2) throw e;
          }
        }
        rows.push({
          id: d.id,
          name: d.description,
          category: d.category,
          kcal: d.energy_kcal,
          protein: d.protein_g,
          carbs: d.carbohydrate_g,
          fat: d.lipids_g,
        });
      }
    }),
  );
  rows.sort((a, b) => a.id - b.id);
  if (rows.length !== 597) throw Error('Incomplete');
  fs.writeFileSync('src/features/nutrition/taco-foods.json', JSON.stringify(rows));
  fs.writeFileSync(
    'src/features/nutrition/TACO-LICENSE.txt',
    await (await fetch('https://raw.githubusercontent.com/brolesi/taco/main/LICENSE')).text(),
  );
  console.log({
    count: rows.length,
    missing: rows.filter((r) => ['kcal', 'protein', 'carbs', 'fat'].some((k) => r[k] === null))
      .length,
  });
})();

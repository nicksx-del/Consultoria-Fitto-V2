const assert = require('node:assert/strict');
const { plateTotal, adjustLogValue, olympicPlates } = require('./load-feature.cjs')('./plateMath');
assert.equal(plateTotal({ 20: 1, 5: 1 }, 20, true), 70);
assert.equal(plateTotal({ 20: 1, 5: 1 }, 20, false), 25);
assert.equal(plateTotal({ 2.5: 2, 0.5: 1 }, 15, true), 26);
assert.equal(plateTotal({}, 20, true), 20);
assert.equal(plateTotal({ 10: -1 }, 20, true), 20);
assert.equal(adjustLogValue(20, 2.5, 2000), 22.5);
assert.equal(adjustLogValue(0, -2.5, 2000), 0);
assert.equal(adjustLogValue(1999, 5, 2000), 2000);
assert.equal(adjustLogValue(0.1, 0.2, 2000), 0.3);
assert.equal(olympicPlates.find((p) => p.kg === 5).color, '#F3F3ED');
console.log(
  'PASS: paired/single plate totals, bar inclusion, fractional plates, empty/removal and bounded decimal adjustments',
);

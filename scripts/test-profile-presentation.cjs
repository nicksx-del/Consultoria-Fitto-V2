const assert = require('node:assert/strict'),
  api = require('./load-feature.cjs')('./profilePresentation');
const base = {
  display_name: ' Marina Costa ',
  username: '@Marina_fit',
  bio: ' Sobre mim ',
  focus: ' Força ',
  location: ' São Paulo, SP ',
  website: 'instagram.com/marina',
  avatar_url: null,
};
let result = api.validateProfile(base);
assert.deepEqual(result.errors, {});
assert.equal(result.values.username, 'marina_fit');
assert.equal(result.values.website, 'https://instagram.com/marina');
assert.equal(result.values.bio, 'Sobre mim');
for (const link of [
  'javascript:alert(1)',
  'http://example.com',
  'https://user:password@example.com',
  'https://example.com/a b',
  'not-a-link',
  'data:text/html,abc',
])
  assert.throws(() => api.profileLink(link), link);
assert.equal(api.profileLink(''), '');
assert.equal(api.profileLink('https://example.com/path?x=1'), 'https://example.com/path?x=1');
assert(api.validateProfile({ ...base, display_name: 'a' }).errors.display_name);
assert(api.validateProfile({ ...base, username: 'bad name' }).errors.username);
assert(api.validateProfile({ ...base, bio: 'x'.repeat(281) }).errors.bio);
assert(api.validateProfile({ ...base, focus: 'x'.repeat(161) }).errors.focus);
assert(api.validateProfile({ ...base, location: 'x'.repeat(81) }).errors.location);
const profile = {
  ...result.values,
  id: 'p',
  role: 'professional',
  specialties: ['Treinador', 'Nutricionista'],
};
assert.equal(api.profileChecklist(profile).filter((item) => item.done).length, 5);
assert(api.profilePresentation(profile).includes('Treinador · Nutricionista'));
assert(!api.profilePresentation(profile).includes('undefined'));
assert.equal(api.profileDraft({ ...profile, location: null }).location, '');
console.log(
  'PASS: profile normalization, safe contact URLs, field limits, optional completeness and presentation copy.',
);

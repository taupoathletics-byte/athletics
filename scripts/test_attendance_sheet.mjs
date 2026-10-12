// Validates the printable attendance sheet's grouping: grade → girls/boys →
// A–Z, with the three bucket edge cases (no gender, no age, 15+).
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const problems = [];
const check = (c, m) => { if (!c) problems.push(m); };

const src = readFileSync(new URL('../public/getsetgo/script.js', import.meta.url), 'utf8');
const sandbox = {
  console, setTimeout, clearTimeout,
  document: {
    querySelector: () => ({ innerHTML: '', textContent: '', value: '', dataset: {}, classList: { add() {}, remove() {}, toggle() {} }, addEventListener() {} }),
    querySelectorAll: () => [],
    addEventListener() {},
  },
  window: { prompt: () => null, alert() {}, addEventListener() {}, open: () => null },
  location: { pathname: '/getsetgo/', search: '' },
  fetch: async () => ({ ok: false, status: 401, json: async () => ({}), text: async () => '' }),
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: 'script.js' });

const members = [
  { name: 'Zoe', age: 7, gender: 'F' },
  { name: 'Anna', age: 7, gender: 'F' },
  { name: 'Adam', age: 7, gender: 'M' },
  { name: 'Ben', age: 7, gender: 'M' },
  { name: 'Cara', age: 5, gender: 'F' },
  { name: 'Dora', age: 5, gender: 'F' },
  { name: 'Ivy', age: 12, gender: 'F' },
  { name: 'Eli', age: 15, gender: 'M' },
  { name: 'Noah', age: 10, gender: 'M' },
  { name: 'Alex', age: 8, gender: '' },
  { name: 'Sam', age: null, gender: 'M' },
];

vm.runInContext('globalThis.__groups = buildAttendanceGroups(globalThis.__members);', sandbox);
sandbox.__members = members;
vm.runInContext('globalThis.__members = ' + JSON.stringify(members) + '; globalThis.__groups = buildAttendanceGroups(__members);', sandbox);
const g = sandbox.__groups;

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

check(eq(g['7'].F, ['Anna', 'Zoe']), 'age 7 girls should be Anna, Zoe (A–Z): ' + JSON.stringify(g['7'] && g['7'].F));
check(eq(g['7'].M, ['Adam', 'Ben']), 'age 7 boys should be Adam, Ben (A–Z)');
check(eq(g['5'].F, ['Cara', 'Dora']), 'age 5 girls should be Cara, Dora');
check(eq(g['10'].M, ['Noah']), 'age 10 boys should be Noah');
check(eq(g['8'].X, ['Alex']), 'the no-gender member should land in the X bucket');
check(eq(g['12-14'].F, ['Ivy']), 'a 12-year-old should land in the 12-14 bucket');
check(eq(g['15+'].M, ['Eli']), 'a 15-year-old should land in 15+');
check(eq(g['Age not set'].M, ['Sam']), 'a member with no age should land in "Age not set"');

// The bucket ordering used by the printout (mirrors the Notion "Age (years)" column).
const order = ['Under 2'];
for (let n = 2; n <= 11; n += 1) order.push(String(n));
order.push('12-14', '15+', 'Age not set');
for (const grp of order) {
  if (g[grp] !== undefined) check(Array.isArray(g[grp].F) && Array.isArray(g[grp].M), `bucket ${grp} is malformed`);
}

console.log('Attendance sheet grouping');
console.log('  buckets:', Object.keys(g).join(', '));
console.log('  7 girls:', g['7'].F.join(', '), '| boys:', g['7'].M.join(', '));
console.log('  5 girls:', g['5'].F.join(', '));

if (problems.length) {
  console.error('\nFAILED:');
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log('\nAll attendance-sheet grouping checks passed.');

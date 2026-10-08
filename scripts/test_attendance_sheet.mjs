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

check(eq(g['Grade 7'].F, ['Anna', 'Zoe']), 'grade 7 girls should be Anna, Zoe (A–Z): ' + JSON.stringify(g['Grade 7'] && g['Grade 7'].F));
check(eq(g['Grade 7'].M, ['Adam', 'Ben']), 'grade 7 boys should be Adam, Ben (A–Z)');
check(eq(g['Get Set Go (6 & under)'].F, ['Cara', 'Dora']), '6 & under girls should be Cara, Dora');
check(eq(g['Grade 10'].M, ['Noah']), 'grade 10 boys should be Noah');
check(eq(g['Grade 8'].X, ['Alex']), 'the no-gender member should land in the X bucket');
check(eq(g['15 & over'].M, ['Eli']), 'a 15-year-old should land in 15 & over');
check(eq(g['Age not set'].M, ['Sam']), 'a member with no age should land in "Age not set"');

// The grade ordering used by the printout.
const order = ['Get Set Go (6 & under)'];
for (let n = 7; n <= 14; n += 1) order.push('Grade ' + n);
order.push('15 & over', 'Age not set');
for (const grp of order) {
  if (g[grp] !== undefined) check(Array.isArray(g[grp].F) && Array.isArray(g[grp].M), `bucket ${grp} is malformed`);
}

console.log('Attendance sheet grouping');
console.log('  buckets:', Object.keys(g).join(', '));
console.log('  Grade 7 girls:', g['Grade 7'].F.join(', '), '| boys:', g['Grade 7'].M.join(', '));
console.log('  6 & under girls:', g['Get Set Go (6 & under)'].F.join(', '));

if (problems.length) {
  console.error('\nFAILED:');
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log('\nAll attendance-sheet grouping checks passed.');

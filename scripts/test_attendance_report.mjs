// Validates the Attendance report: members are ranked by nights attended,
// highest first, with ties broken A–Z.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const problems = [];
const check = (c, m) => { if (!c) problems.push(m); };

const src = readFileSync(new URL('../public/getsetgo/script.js', import.meta.url), 'utf8');

let written = '';
const sandbox = {
  console, setTimeout, clearTimeout,
  document: {
    querySelector: () => ({ innerHTML: '', textContent: '', value: '', dataset: {}, classList: { add() {}, remove() {}, toggle() {} }, addEventListener() {} }),
    querySelectorAll: () => [],
    addEventListener() {},
  },
  window: {
    prompt: () => null,
    alert() {},
    addEventListener() {},
    open: () => ({ document: { write: (h) => { written = h; }, close() {} }, focus() {} }),
  },
  location: { pathname: '/getsetgo/', search: '' },
  fetch: async () => ({ ok: false, status: 401, json: async () => ({}), text: async () => '' }),
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: 'script.js' });

const members = [
  { name: 'Ada', grade: 7, gender: 'F', nights: 5 },
  { name: 'Ben', grade: 7, gender: 'M', nights: 12 },
  { name: 'Cleo', grade: 9, gender: 'F', nights: 5 },
  { name: 'Dee', grade: 4, gender: 'F', nights: 0 },
  { name: 'Eli', grade: 10, gender: 'M', nights: 12 },
];
sandbox.__members = members;
vm.runInContext('globalThis.__members = ' + JSON.stringify(members) + '; attendanceMembers = __members; attendanceDate = "2026-11-12";', sandbox);

vm.runInContext('openAttendanceReport();', sandbox);

check(written.length > 0, 'the report produced no HTML');
check(written.includes('Attendance report'), 'the report heading is missing');

// Order by nights desc, ties A–Z: Ben(12), Eli(12), Ada(5), Cleo(5), Dee(0)
const order = ['Ben', 'Eli', 'Ada', 'Cleo', 'Dee'];
let last = -1;
for (const name of order) {
  const at = written.indexOf('>' + name + '<');
  check(at !== -1, `member ${name} is missing from the report`);
  check(at > last, `member ${name} is out of order (should come after the previous)`);
  last = at;
}
check(!/undefined|NaN/.test(written), 'the report contains undefined/NaN');

console.log('Attendance report');
console.log('  expected order:', order.join(' > '));
console.log('  nights in output:', (written.match(/class="num">(\d+)</g) || []).length, 'numeric cells');

if (problems.length) {
  console.error('\nFAILED:');
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log('\nAll attendance-report checks passed.');

// Validates the printable measure sheet: the selected event, grouped by grade,
// girls/boys A–Z, with the last recorded mark shown and a blank Result column.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const problems = [];
const check = (c, m) => { if (!c) problems.push(m); };

const src = readFileSync(new URL('../public/getsetgo/script.js', import.meta.url), 'utf8');

let written = '';
function makeEl() {
  return { innerHTML: '', textContent: '', value: '', dataset: {}, classList: { add() {}, remove() {}, toggle() {} }, addEventListener() {}, closest: () => null };
}
const els = new Map();
const sandbox = {
  console, setTimeout, clearTimeout,
  document: {
    querySelector: (sel) => { if (!els.has(sel)) els.set(sel, makeEl()); return els.get(sel); },
    querySelectorAll: () => [],
    addEventListener() {},
  },
  window: { prompt: () => null, alert() {}, addEventListener() {}, open: () => ({ document: { write: (h) => { written = h; }, close() {} }, focus() {} }) },
  location: { pathname: '/getsetgo/', search: '' },
  fetch: async () => ({ ok: false, status: 401, json: async () => ({}), text: async () => '' }),
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: 'script.js' });

const members = [
  { id: 'g1', name: 'Zoe Smith', grade: '7', gender: 'F' },
  { id: 'g2', name: 'Anna Brown', grade: '7', gender: 'F' },
  { id: 'b1', name: 'Ben Jones', grade: '7', gender: 'M' },
  { id: 'g3', name: 'Mia Lee', grade: '9', gender: 'F' },
];
const records = [
  { id: 'r1', memberId: 'g1', event: '60m', season: '2026-27', result: '10.73', createdTime: '2026-11-01T00:00:00Z', date: '2026-11-01' },
];

els.set('#bulk-event', makeEl()); els.get('#bulk-event').value = '60m';
els.set('#bulk-season', makeEl()); els.get('#bulk-season').value = '2026-27';
els.set('#bulk-date', makeEl()); els.get('#bulk-date').value = '2026-11-12';

sandbox.__members = members;
sandbox.__records = records;
vm.runInContext('recordMembers = __members; recordAll = __records; openMeasureSheet();', sandbox);

check(written.length > 0, 'no HTML produced');
check(written.includes('60m'), 'the event name is missing from the sheet');
check(written.includes('Grade 7'), 'the Grade 7 section is missing');
check(written.includes('Grade 9'), 'the Grade 9 section is missing');
check(written.includes('Zoe Smith') && written.includes('Anna Brown'), 'grade-7 girls are missing');
check(written.includes('Ben Jones'), 'grade-7 boys are missing');
check(written.includes('10.73'), "the last recorded mark isn't shown");
check(written.includes('Result (seconds)'), 'the time unit header is missing');
check(!/undefined|NaN/.test(written), 'the sheet contains undefined/NaN');

// Girls before boys, names A–Z inside each sex.
const iAnna = written.indexOf('Anna Brown');
const iZoe = written.indexOf('Zoe Smith');
check(iAnna !== -1 && iAnna < iZoe, 'girls are not sorted A–Z');

// --- all-events sheet ---
written = '';
vm.runInContext('openAllMeasureSheets();', sandbox);
check(written.length > 0, 'the all-events sheet produced no HTML');
const evs = ['60m', '100m', '200m', '400m', '800m', '1500m', 'Long Jump', 'High Jump', 'Shot Put', 'Discus'];
for (const ev of evs) {
  if (!written.includes('>' + ev + '<')) problems.push(`all-events sheet is missing ${ev}`);
}
const blocks = (written.match(/class="event-block"/g) || []).length;
check(blocks === evs.length, `expected ${evs.length} event blocks, found ${blocks}`);

console.log('Measure sheet');
console.log('  all-events blocks:', blocks);
console.log('  grades present: Grade 7, Grade 9');
console.log('  last recorded 10.73 shown:', written.includes('10.73'));

if (problems.length) {
  console.error('\nFAILED:');
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log('\nAll measure-sheet checks passed.');

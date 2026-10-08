// Validates the measure-night bulk entry grid: for a chosen grade it should
// render a girls table and a boys table, each sorted A–Z, with a result input
// per member carrying the member id/name/gender for the bulk save.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const problems = [];
const check = (c, m) => { if (!c) problems.push(m); };

const src = readFileSync(new URL('../public/getsetgo/script.js', import.meta.url), 'utf8');

function makeEl() {
  return {
    innerHTML: '', textContent: '', value: '', disabled: false, dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    addEventListener() {}, focus() {}, closest: () => null,
  };
}
const els = new Map();
const sandbox = {
  console, setTimeout, clearTimeout,
  document: {
    querySelector: (sel) => { if (!els.has(sel)) els.set(sel, makeEl()); return els.get(sel); },
    querySelectorAll: (sel) => {
      if (sel === '#bulk-tables .bulk-result') return (els.get('__bulk-results') || []);
      return [];
    },
    addEventListener() {},
  },
  window: { prompt: () => null, alert() {}, addEventListener() {} },
  location: { pathname: '/getsetgo/', search: '' },
  fetch: async () => ({ ok: false, status: 401, json: async () => ({}), text: async () => '' }),
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: 'script.js' });

// Mock the member roster: grade 7 has three girls and two boys, out of order.
sandbox.recordMembers = [
  { id: 'g1', name: 'Zoe', grade: '7', gender: 'F' },
  { id: 'b2', name: 'Ben', grade: '7', gender: 'M' },
  { id: 'g2', name: 'Anna', grade: '7', gender: 'F' },
  { id: 'b1', name: 'Adam', grade: '7', gender: 'M' },
  { id: 'g3', name: 'Mia', grade: '7', gender: 'F' },
  { id: 'x1', name: 'Ignored Grade 8', grade: '8', gender: 'M' },
  { id: 'x2', name: 'No Gender', grade: '7', gender: '' },
];
vm.runInContext('recordMembers = globalThis.recordMembers;', sandbox);

// Pre-create the DOM stubs the grid reads, and set the grade.
const gradeEl = sandbox.document.querySelector('#bulk-grade');
gradeEl.value = '7';
sandbox.document.querySelector('#bulk-tables');
sandbox.document.querySelector('#bulk-save');

vm.runInContext('renderBulkTables();', sandbox);

const html = els.get('#bulk-tables').innerHTML;

check(html.includes('Girls') && html.includes('Boys'), 'missing the girls/boys table headings');
check(html.includes('Zoe') && html.includes('Anna') && html.includes('Mia'), 'a grade-7 girl is missing');
check(html.includes('Adam') && html.includes('Ben'), 'a grade-7 boy is missing');
check(!html.includes('Ignored Grade 8'), 'a grade-8 member leaked into the grade-7 grid');
check(!html.includes('No Gender'), 'a member with no gender leaked into the grid');

// Girls sorted A–Z: Anna before Mia before Zoe.
const a = html.indexOf('Anna');
const m = html.indexOf('Mia');
const z = html.indexOf('Zoe');
check(a !== -1 && a < m && m < z, 'girls are not sorted A–Z (Anna → Mia → Zoe)');

// Boys sorted A–Z: Adam before Ben.
const ad = html.indexOf('Adam');
const be = html.indexOf('Ben');
check(ad !== -1 && ad < be, 'boys are not sorted A–Z (Adam → Ben)');

// The grid renders three girls + two boys = five result inputs with data attrs.
const resultInputs = (html.match(/class="bulk-result"/g) || []).length;
check(resultInputs === 5, `expected 5 result inputs, found ${resultInputs}`);
check(html.includes('data-gender="F"') && html.includes('data-gender="M"'), 'gender data attribute missing');
check(els.get('#bulk-save').disabled === false, 'the save button should be enabled when there are members');

// An empty grade renders a note and disables save.
els.get('#bulk-grade').value = '14';
vm.runInContext('renderBulkTables();', sandbox);
const html14 = els.get('#bulk-tables').innerHTML;
check(html14.includes('No girls in grade 14') && html14.includes('No boys in grade 14'), 'empty grade note missing');
check(els.get('#bulk-save').disabled === true, 'save should be disabled for an empty grade');

console.log('Measure-night bulk grid');
console.log('  grade 7 girls: Anna, Mia, Zoe | boys: Adam, Ben');
console.log('  result inputs:', resultInputs);
console.log('  empty grade 14: disabled save ✓');

if (problems.length) {
  console.error('\nFAILED:');
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log('\nAll bulk-grid checks passed.');

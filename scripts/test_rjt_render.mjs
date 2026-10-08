// Exercises the Run Jump Throw render functions from public/getsetgo/script.js
// against the real merged payload (timetable + activity library), in a stubbed
// DOM. Catches the class of bug a syntax check cannot: undefined values baked
// into markup, headings emitted with nothing under them, or a station rendering
// with no activities attached.
//
//   node scripts/test_rjt_render.mjs
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import runJumpThrow from '../api/_data/runJumpThrow.mjs';
import library from '../api/_data/rjtActivities.mjs';
import { withLibrary } from '../api/rjt.mjs';

const merged = withLibrary(runJumpThrow, library);

const src = readFileSync(new URL('../public/getsetgo/script.js', import.meta.url), 'utf8');

/** Minimal element stub: the renderers only set innerHTML and bind listeners. */
function makeEl() {
  return {
    innerHTML: '',
    textContent: '',
    value: '',
    disabled: false,
    dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    addEventListener() {},
    focus() {},
    closest: () => null,
  };
}

const els = new Map();
const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  document: {
    querySelector: (sel) => {
      if (!els.has(sel)) els.set(sel, makeEl());
      return els.get(sel);
    },
    querySelectorAll: () => [],
    addEventListener() {},
  },
  window: { prompt: () => null, alert() {}, addEventListener() {} },
  location: { pathname: '/getsetgo/', search: '' },
  fetch: async () => ({ ok: false, status: 401, json: async () => ({}), text: async () => '' }),
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: 'script.js' });

// `rjt` is a top-level `let`, which lives in the context's global lexical
// environment — shared across scripts in the same context, so this reaches it.
vm.runInContext('rjt = __DATA__; rjtFailed = false;'.replace('__DATA__', JSON.stringify(merged)), sandbox);
sandbox.__rjt = merged;

const problems = [];

// 1. Every skill body renders without holes, and each station has cards.
let skillsWithActivities = 0;
for (const [key, sk] of Object.entries(merged.skills)) {
  vm.runInContext(`globalThis.__out = rjtSkillBodyHTML(__rjt.skills[${JSON.stringify(key)}]);`, sandbox);
  const html = sandbox.__out;
  if (/undefined|NaN|\[object Object\]/.test(html)) problems.push(`skill "${key}" renders undefined/NaN/object`);
  if (!html.includes('<div class="rjt-detail">')) problems.push(`skill "${key}" is missing its detail wrapper`);
  // A heading must be followed by a list, never emitted on its own.
  if (/<h4>[^<]*<\/h4>\s*(?=<h4>|<\/div>|<p)/.test(html)) problems.push(`skill "${key}" has a dangling heading`);
  const cards = (sk.activities || []).length + (sk.events || []).length;
  if (cards) skillsWithActivities++;
  const rendered = (html.match(/<li>/g) || []).length;
  if (cards && rendered < cards) {
    problems.push(`skill "${key}" has ${cards} cards but rendered only ${rendered} list items`);
  }
}

// 2. Every night renders, and each populated station shows its slot + name.
let nightsChecked = 0;
let stationsChecked = 0;
for (const term of merged.terms) {
  for (const night of term.nights) {
    const ti = merged.terms.indexOf(term);
    const ni = term.nights.indexOf(night);
    vm.runInContext(`globalThis.__out = rjtNightHTML(__rjt.terms[${ti}].nights[${ni}]);`, sandbox);
    const html = sandbox.__out;
    nightsChecked++;
    if (/undefined|NaN|\[object Object\]/.test(html)) problems.push(`night "${night.date}" renders undefined/NaN/object`);
    if (night.blank) {
      if (!html.includes('rjt-night--blank')) problems.push(`blank night "${night.date}" lost its blank styling`);
      continue;
    }
    for (const st of night.stations) {
      if (!st.station) continue;
      stationsChecked++;
      const name = st.station.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      if (!html.includes(name)) problems.push(`night "${night.date}" is missing station "${st.station}"`);
      const sk = merged.skills[st.skill];
      if (sk && !html.includes(`>${sk.category}<`)) {
        problems.push(`station "${st.station}" (${night.date}) is missing its "${sk.category}" tag`);
      }
    }
  }
}

// 3. Full section render. renderRJT() fills #admin-content, then #rjt-tabs and
// #rjt-nights separately, so term names live in the night list / tab strip.
vm.runInContext('renderRJT();', sandbox);
const page = sandbox.document.querySelector('#admin-content').innerHTML;
const nightsHtml = sandbox.document.querySelector('#rjt-nights').innerHTML;
const tabsHtml = sandbox.document.querySelector('#rjt-tabs').innerHTML;
const everything = page + nightsHtml + tabsHtml;

if (/undefined|NaN|\[object Object\]/.test(everything)) problems.push('full render contains undefined/NaN/object');
for (const needle of ['Run Jump Throw', 'Weekly grade rotation', 'RJT Pentathlon', 'STEP', 'Warm-up games', 'Adaptive &amp; seated events', 'Not yet filed']) {
  if (!page.includes(needle)) problems.push(`page body is missing "${needle}"`);
}
for (const term of merged.terms) {
  if (!tabsHtml.includes(term.term)) problems.push(`tab strip is missing "${term.term}"`);
  if (!nightsHtml.includes(term.term)) problems.push(`night list is missing "${term.term}"`);
}
if (!nightsHtml.includes('rjt-night')) problems.push('night list rendered empty');
if (!nightsHtml.includes('rjt-station')) problems.push('no stations rendered in the night list');
if (page.includes('No station detail recorded')) problems.push('a station resolved to no skill detail');

// 4. Spot-check that specific known cards made it through to the page.
for (const card of ['Heart Beat', 'Aerobic Relay Fun', 'Bench Ball', 'Vortex Throw']) {
  if (!everything.includes(card)) problems.push(`activity card "${card}" is missing from the render`);
}

console.log('Run Jump Throw render check');
console.log('  skills rendered:   ', Object.keys(merged.skills).length);
console.log('  skills with cards: ', skillsWithActivities);
console.log('  nights rendered:   ', nightsChecked);
console.log('  stations rendered: ', stationsChecked);
console.log('  page body:         ', page.length, 'chars');
console.log('  night list:        ', nightsHtml.length, 'chars');

if (problems.length) {
  console.error('\nFAILED:');
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log('\nAll render checks passed.');

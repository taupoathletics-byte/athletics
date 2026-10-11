// Validates the Get Set Go run sheets: the generated data, and that the portal
// actually renders the new two-week structure without holes.
//
//   node scripts/test_sessions.mjs
//
// Guards against the failure mode that matters here: the Notion pull silently
// returning fewer lessons than expected, leaving a coach with a half-empty run
// sheet on the night.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import sessions from '../api/_data/sessions.mjs';

const problems = [];
const check = (cond, msg) => { if (!cond) problems.push(msg); };

/* ---------- 1. data ---------- */

const season = sessions.season || {};
const series = sessions.series || [];

check(season.title === 'Get Set Go', `season.title is "${season.title}", expected "Get Set Go"`);
check(series.length === 10, `expected 10 series (9 teaching + Week 19), found ${series.length}`);

// 9 teaching series x 4 rotations = 36 rotations, and Week 19 has none.
const teaching = series.filter((s) => !s.isFinal);
const final = series.filter((s) => s.isFinal);
check(teaching.length === 9, `expected 9 teaching series, found ${teaching.length}`);
check(final.length === 1, `expected exactly one final night, found ${final.length}`);

const totalRotations = teaching.reduce((n, s) => n + s.rotations.length, 0);
check(totalRotations === 36, `expected 36 rotations across the teaching series, found ${totalRotations}`);

for (const s of teaching) {
  check(s.rotations.length === 4, `series ${s.series} has ${s.rotations.length} rotations, expected 4`);
  const orders = s.rotations.map((r) => r.order).sort((a, b) => a - b);
  check(JSON.stringify(orders) === '[1,2,3,4]', `series ${s.series} rotation orders are ${orders.join(',')}, expected 1,2,3,4`);
  for (const r of s.rotations) {
    check(r.skill, `series ${s.series} rotation ${r.order} has no skill`);
    check(r.category, `series ${s.series} rotation ${r.order} has no category`);
    // The whole point of the 19-week rewrite: three phases per station.
    check(r.discovery, `series ${s.series} rot ${r.order} (${r.skill}) has no Discovery activity`);
    check(r.developing, `series ${s.series} rot ${r.order} (${r.skill}) has no Developing activity`);
    check(r.consolidating, `series ${s.series} rot ${r.order} (${r.skill}) has no Consolidating activity`);
    // Game / Manipulative / Athletics stations run a different challenge each week.
    // The six-station Fitness Circuit instead has a fixed course plus a Week B tweak,
    // so it legitimately has no Week A/B challenge pair.
    const isCircuit = r.category === 'Fitness Circuit' || !!r.course;
    if (isCircuit) {
      check(r.course, `series ${s.series} rot ${r.order} is a circuit but has no course`);
      check(r.weekBProgression, `series ${s.series} rot ${r.order} (${r.course.split('\n')[0]}) has no Week B progression`);
    } else {
      check(r.weekA && r.weekA.challenge, `series ${s.series} rot ${r.order} has no Week A challenge`);
      check(r.weekB && r.weekB.challenge, `series ${s.series} rot ${r.order} has no Week B challenge`);
      check(r.weekA?.challenge !== r.weekB?.challenge, `series ${s.series} rot ${r.order} has the same Week A and Week B challenge`);
    }
  }
}

// 19 week pages: two per teaching series, plus the mini meet.
const totalWeeks = series.reduce((n, s) => n + (s.weeks || []).length, 0);
check(totalWeeks === 19, `expected 19 weekly lesson pages, found ${totalWeeks}`);
const weeksWithRun = series.flatMap((s) => s.weeks || []).filter((w) => (w.runOfShow || []).length);
check(weeksWithRun.length === 18, `expected 18 weeks with a run of show, found ${weeksWithRun.length}`);

// Programme-level content a coach needs before the first night.
check(season.howEverySessionWorks?.steps?.length >= 3, 'missing the run-of-show structure for every session');
check(season.coachingPrinciples?.length === 7, `expected 7 coaching principles, found ${season.coachingPrinciples?.length}`);
check(season.howEverySessionWorks?.teachingNote, 'missing the finish-line teaching note');
check(season.athleticsNote, 'missing the athletics-equipment note');
check(season.warmdown?.name, 'missing the warm-down');
check(season.rules?.length >= 4, 'missing the standing rules');

// Every rotation that names a backup game must have a "how to play" summary.
const withBackup = teaching.flatMap((s) => s.rotations).filter((r) => r.backup);
const missingSummary = withBackup.filter((r) => !r.backupSummary).map((r) => `${r.backup} (series ${r.series ?? '?'})`);
check(missingSummary.length === 0, `backup games missing a summary: ${missingSummary.join(', ')}`);

/* ---------- 1b. wording matches the athletics event + senior schedule ---------- */

// Each series runs ONE athletics event. When events were swapped to avoid the
// seniors (scripts/notion_swap_events.mjs) only Rotation 4 moved, leaving stale
// labels on Rotations 1–3, the week pages and the series names. Guard all three.
const EVENT_WORDS = {
  'long jump': /long[ -]?jump/i,
  'high jump': /high[ -]?jump/i,
  hurdles: /hurdl/i,
  relays: /relay/i,
};
const warnings = [];
for (const s of teaching) {
  const ev = String(s.athleticsEvent || '').toLowerCase();
  for (const r of s.rotations) {
    check(String(r.event || '').toLowerCase() === ev, `series ${s.series} rotation ${r.order} says "${r.event}" but the series event is "${s.athleticsEvent}"`);
  }
  for (const [word, re] of Object.entries(EVENT_WORDS)) {
    if (word !== ev && re.test(s.name)) problems.push(`series ${s.series} is named "${s.name}" but its athletics event is "${s.athleticsEvent}"`);
  }
  for (const w of s.weeks || []) {
    const core = /Core athletics: ([^|]+)/.exec(w.seriesBits || '')?.[1]?.trim().toLowerCase();
    if (core) check(core === ev, `week ${w.week} says "Core athletics: ${core}" but series ${s.series} is "${s.athleticsEvent}"`);
  }
}

// Never the same athletics event as the seniors on the same night.
const senior = JSON.parse(readFileSync(new URL('./data/senior-schedule-2026-27.json', import.meta.url), 'utf8'));
const seniorByDate = new Map(senior.nights.map((n) => [n.date, n]));
const MONTHS = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
const isoDate = (label) => {
  const m = /(\d{1,2}) ([A-Z][a-z]{2}) (\d{4})/.exec(label);
  return m ? `${m[3]}-${MONTHS[m[2]]}-${m[1].padStart(2, '0')}` : null;
};
let nightsChecked = 0;
for (const s of teaching) {
  const ev = String(s.athleticsEvent || '').toLowerCase();
  for (const label of s.dates || []) {
    const date = isoDate(label);
    const night = date && seniorByDate.get(date);
    if (!night) {
      warnings.push(`${label}: Get Set Go night (series ${s.series}) has no entry in the senior schedule`);
      continue;
    }
    nightsChecked++;
    const clash = night.events.find((e) => e.toLowerCase() === ev);
    check(!clash, `${label}: Get Set Go series ${s.series} runs ${s.athleticsEvent} — the seniors have ${clash} that night`);
    const rjt = night.rjt.find((a) => EVENT_WORDS[ev]?.test(a));
    if (rjt) warnings.push(`${label}: Get Set Go ${s.athleticsEvent} overlaps the seniors' RJT "${rjt}" station — check space/equipment`);
  }
}

/* ---------- 2. render ---------- */

/** Mirror the portal's esc() so assertions compare against what is really emitted. */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

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
    querySelectorAll: () => [],
    addEventListener() {},
  },
  window: { prompt: () => null, alert() {}, addEventListener() {} },
  location: { pathname: '/getsetgo/', search: '' },
  fetch: async () => ({ ok: false, status: 401, json: async () => ({}), text: async () => '' }),
};
sandbox.globalThis = sandbox;
// Hand the data in as a context global rather than interpolating it into the
// script source — a huge JSON literal in a string makes any error unreadable.
sandbox.__sessions = sessions;
sandbox.__expect = { check: (cond, msg) => { if (!cond) problems.push(msg); } };
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: 'script.js' });
vm.runInContext('season = __sessions.season; series = __sessions.series;', sandbox);

vm.runInContext('globalThis.__out = renderRunSheets();', sandbox);
const page = els.get('#admin-content')?.innerHTML || '';
const grid = els.get('#lesson-grid')?.innerHTML || '';
const info = els.get('#season-info')?.innerHTML || '';

check(page.includes('Get Set Go Sessions'), 'the "Get Set Go Sessions" heading is missing');
check(info.includes(season.warmdown.name.slice(0, 25)), 'the warm-down is not rendered');
check(info.includes('How the night runs'), 'the "How the night runs" section is missing');
check(info.includes('Teaching note'), 'the finish-line teaching note is not rendered');
check(info.includes('Coaching principles'), 'the coaching principles are not rendered');
check(grid.includes('series-card'), 'no series cards rendered');
check(!grid.includes('week-card'), 'week cards should have been removed — series go straight to rotations');
check(grid.includes('class="phase"'), 'no Discovery/Developing/Consolidating phases rendered');
check(!grid.includes('Run of show'), 'the per-week "Run of show" blocks should have been removed');
check(grid.includes('long jump pit'), 'the athletics-equipment note is not rendered on Athletics stations');

for (const needle of ['Discovery', 'Developing', 'Consolidating', 'Week A', 'Week B']) {
  if (!grid.includes(needle)) problems.push(`rendered run sheets are missing "${needle}"`);
}

// Every teaching series should be present with its name.
for (const s of teaching) {
  if (!grid.includes(s.name.replace(/&/g, '&amp;'))) problems.push(`series "${s.name}" is not rendered`);
}

// Every rotation's skill and both week challenges should appear.
let rendered = 0;
let challenges = 0;
for (const s of teaching) {
  for (const r of s.rotations) {
    if (grid.includes(esc(r.skill))) rendered++;
    if (r.category === 'Fitness Circuit' || r.course) continue;
    for (const w of [r.weekA, r.weekB]) {
      challenges++;
      if (!grid.includes(esc(w.challenge))) {
        problems.push(`challenge "${w.challenge}" (series ${s.series} rot ${r.order}) is not rendered`);
      }
    }
  }
}
check(rendered >= 36, `only ${rendered} rotation skills rendered, expected at least 36`);
check(!/undefined|NaN|\[object Object\]/.test(grid), 'rendered run sheets contain undefined/NaN/[object Object]');
check(!grid.includes('No station detail'), 'a rotation rendered without content');

/* ---------- report ---------- */

console.log('Get Set Go run sheets');
console.log('  series:            ', series.length, `(${teaching.length} teaching + ${final.length} mini meet)`);
console.log('  week pages:        ', totalWeeks, `(${weeksWithRun.length} with a run of show)`);
console.log('  rotations:         ', totalRotations);
console.log('  phases per station:', 3);
console.log('  week A/B challenges checked:', challenges, `(${totalRotations - challenges / 2} circuits use a fixed course instead)`);
console.log('  rendered grid:     ', grid.length, 'chars');
console.log('  rendered info:     ', info.length, 'chars');
console.log('  senior clash check:', nightsChecked, 'nights vs the 26/27 senior schedule');
for (const w of warnings) console.log('  note: ' + w);

if (problems.length) {
  console.error('\nFAILED:');
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log('\nAll run-sheet checks passed.');

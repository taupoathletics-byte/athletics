// Validates the Get Set Go run sheets: the generated data, and that the portal
// actually renders the new two-week structure without holes.
//
//   node scripts/test_sessions.mjs
//
// Guards against the failure mode that matters here: the Notion pull silently
// returning fewer lessons than expected, leaving a coach with a half-empty run
// sheet on the night.
import { existsSync, readFileSync } from 'node:fs';
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
const dashSrc = readFileSync(new URL('../public/getsetgo/stations.js', import.meta.url), 'utf8');
function makeEl() {
  return {
    innerHTML: '', textContent: '', value: '', disabled: false, dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    addEventListener() {}, focus() {}, closest: () => null,
    querySelector: () => makeEl(), querySelectorAll: () => [],
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
  window: { prompt: () => null, alert() {}, addEventListener() {}, scrollTo() {}, GSGCards: { shortDate: (d) => d, longDate: (d) => d, splitStep: (x) => [x, ''] } },
  location: { pathname: '/getsetgo/', search: '' },
  fetch: async () => ({ ok: false, status: 401, json: async () => ({}), text: async () => '' }),
};
sandbox.globalThis = sandbox;
// Hand the data in as a context global rather than interpolating it into the
// script source — a huge JSON literal in a string makes any error unreadable.
sandbox.__sessions = sessions;
sandbox.__expect = { check: (cond, msg) => { if (!cond) problems.push(msg); } };
vm.createContext(sandbox);
sandbox.window.GSGCards.shortDate = (d) => d;
vm.runInContext(dashSrc, sandbox, { filename: 'stations.js' });
vm.runInContext(src, sandbox, { filename: 'script.js' });
vm.runInContext('season = __sessions.season; series = __sessions.series;', sandbox);

// The Sessions screen is now the visual dashboard; the full board text lives in
// its "Whole season" panel (seriesHTML) and "How the night runs" panel (seasonInfoHTML).
vm.runInContext('globalThis.__out = renderRunSheets();', sandbox);
const page = els.get('#admin-content')?.innerHTML || '';
const grid = vm.runInContext('series.map(seriesHTML).join("")', sandbox);
const info = vm.runInContext('seasonInfoHTML()', sandbox);

check(page.includes('Get Set Go Sessions'), 'the "Get Set Go Sessions" heading is missing');
check((page.match(/class="gsg-tile /g) || []).length === 4, 'the dashboard should show exactly four station tiles');
check(page.includes('id="gsg-generate"'), 'the Generate cards button is missing');
check(page.includes('Whole season') && page.includes('series-card'), 'the whole-season panel with the full run sheets is missing');
check(!/undefined|NaN|\[object Object\]/.test(page), 'the dashboard contains undefined/NaN/[object Object]');
check(info.includes(season.warmdown.name.slice(0, 25)), 'the warm-down is not rendered');
check(info.includes('How the night runs'), 'the "How the night runs" section is missing');
check(info.includes('Teaching note'), 'the finish-line teaching note is not rendered');
check(info.includes('Coaching principles'), 'the coaching principles are not rendered');
check(grid.includes('series-card'), 'no series cards rendered');
check(!grid.includes('week-card'), 'week cards should have been removed — series go straight to rotations');
check(grid.includes('class="phase"'), 'no Discovery/Developing/Consolidating phases rendered');
check(!grid.includes('Run of show'), 'the per-week "Run of show" blocks should have been removed');
check(grid.includes('long jump pit'), 'the athletics-equipment note is not rendered on Athletics stations');
// Juniors DO use the high jump mat (with a low elastic, never the pole). Guard
// against the old contradictory "no high jump mats" wording creeping back in.
check(!/no high jump mats?/i.test(grid + info), 'run sheets still say "no high jump mats" — juniors use the mat with an elastic');
check(!/high jump mat(?![^.]*elastic)/i.test(grid + info), 'a high jump mat mention does not say to use the elastic');

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

/* ---------- 3. volunteer station cards ---------- */

const CATS = ['Game', 'Manipulative', 'Fitness Circuit', 'Athletics'];
const allCards = teaching.flatMap((s) => [...s.cards.A, ...s.cards.B]);
const keys = new Set(allCards.map((c) => c.key));
check(allCards.length === teaching.length * 8, `expected 8 cards per series, got ${allCards.length}`);
check(keys.size === allCards.length, 'station card keys are not unique');
for (const s of teaching) {
  for (const [i, week] of ['A', 'B'].entries()) {
    const cards = s.cards[week];
    check(cards.map((c) => c.category).join() === CATS.join(), `series ${s.series} week ${week}: stations are not Game, Manipulative, Fitness Circuit, Athletics`);
    check(cards.every((c) => c.week === week && c.date === s.isoDates[i] && /^\d{4}-\d{2}-\d{2}$/.test(c.date)), `series ${s.series} week ${week}: card week/date doesn't match the series dates`);
    for (const c of cards) {
      check(c.name && c.steps.length >= 1 && c.steps.length <= 12, `${c.key}: needs a name and 1–12 steps`);
      check(/^[0-9a-f]{12}$/.test(c.hash), `${c.key}: missing board-version hash`);
      if (c.image) check(existsSync(new URL(`../public${c.image.src}`, import.meta.url)), `${c.key}: image ${c.image.src} does not exist`);
      const text = JSON.stringify(c).toLowerCase();
      if (/high jump/.test(c.skill.toLowerCase()) || /scissor/.test(c.name.toLowerCase())) {
        check(/elastic/.test(text) && /mat/.test(text), `${c.key}: a high jump card must name the elastic and the mat`);
      }
      check(!/(?<!never (a |the )?(high jump )?)\bpole\b(?! or rigid)/.test(text.replace(/never a pole or rigid bar/g, '').replace(/never a high jump pole/g, '').replace(/never the high jump pole/g, '')), `${c.key}: mentions a pole other than to forbid it`);
    }
  }
  // Week A and Week B are separate nights.
  check(s.cards.A.every((c, i) => c.key !== s.cards.B[i].key), `series ${s.series}: Week A and Week B share card keys`);
}
const card = (key) => allCards.find((c) => c.key === key);
const names = (series, week) => teaching.find((s) => s.series === series).cards[week].map((c) => c.name);
// Series 1–4 activities, as agreed with the club.
check(names(1, 'A').join('|') === 'Traffic Lights|Circus Throws|Animal Trail|Scissor Basics', `series 1 week A: ${names(1, 'A')}`);
check(names(1, 'B').join('|') === 'Toilet Tag|Bin It|Animal Trail|Scissor Rhythm', `series 1 week B: ${names(1, 'B')}`);
check(names(2, 'A').join('|') === 'Jumping Beans|Clever Catchers — floaters|Jungle Jaunt|Step and Run — hurdles', `series 2 week A: ${names(2, 'A')}`);
check(names(2, 'B').join('|') === 'Beanbag Hop|Clever Catchers — moving|Jungle Jaunt|Hurdle Rhythm', `series 2 week B: ${names(2, 'B')}`);
check(names(3, 'A').join('|') === 'Circle Dodge Ball|Force Back — beanbags|Superhero Training|Half-and-Half Relays', `series 3 week A: ${names(3, 'A')}`);
check(names(3, 'B').join('|') === "Dragon's Tail|Long Chase Ball|Superhero Training|Move and Exchange", `series 3 week B: ${names(3, 'B')}`);
check(names(4, 'A').join('|') === 'Dead Ants|Partner Kicking|Pirate Island|Jump and Freeze', `series 4 week A: ${names(4, 'A')}`);
check(names(4, 'B').join('|') === 'Skipping Experiments|Crazy Kickers|Pirate Island|Beat Your Own Marker', `series 4 week B: ${names(4, 'B')}`);
// Series 2 must not pick up the Series 1 Week 2 lesson that Notion links by mistake.
check(!names(2, 'A').concat(names(2, 'B')).some((n) => names(1, 'B').includes(n) || names(1, 'A').includes(n)), 'series 2 contains a series 1 activity');
// Circuits keep their moves: Animal Trail now runs the 9 illustrated obstacle cards.
for (const k of ['s2-A-3', 's3-A-3', 's3-B-3', 's4-A-3', 's4-B-3']) check(card(k).layout === 'circuit' && card(k).steps.length === 6, `${k}: circuit should have six exercises`);
for (const k of ['s1-A-3', 's1-B-3']) check(card(k).layout === 'circuit' && card(k).steps.length === 9, `${k}: Animal Trail should have the nine obstacle cards`);
const animalOrder = card('s1-A-3').steps.map((s) => s.split(' — ')[0]);
check(animalOrder[0] === 'Crab walk' && animalOrder[8] === 'Soft mat forward roll', `Animal Trail: nine moves out of order — ${animalOrder.join(' | ')}`);
check(/Superman flight/.test(card('s3-A-3').steps[0]) && /star jump/i.test(card('s3-A-3').steps[5]), 'Superhero Training: six moves out of order');
check(/FREEZE/.test(card('s3-B-3').steps.join(' ')) && !/FREEZE/.test(card('s3-A-3').steps.join(' ')), 'Superhero Training: the Week B freeze belongs to Week B only');
check(card('s3-A-3').image?.src === card('s3-B-3').image?.src, 'Superhero Training: both weeks should share one image');
// Safety requirements the club asked for.
check(/below the knees/.test(card('s3-A-1').safety) && /No elimination/.test(card('s3-A-1').safety), 'Circle Dodge Ball: soft balls below the knees, no elimination');
check(/one way/.test(card('s3-A-2').safety) && /soft/i.test(card('s3-A-2').safety), 'Force Back: one-way lanes with soft equipment');
check(/supervises every beanbag handover/.test(card('s3-A-4').safety) && /supervises every beanbag handover/.test(card('s3-B-4').safety), 'relays: supervised beanbag handovers');
check(/no rigid barriers/i.test(card('s3-A-3').safety), 'Superhero Training: no rigid barriers');
check(/SAFE SIDELINE ZONE/.test(card('s4-A-1').safety), 'Dead Ants: ant pose in the safe sideline zone');
check(/One soft ball per pair/.test(card('s4-A-2').safety), 'Partner Kicking: one soft ball per pair');
check(/never a block laid across cones/.test(card('s4-A-3').safety), 'Pirate Island: no raised block across cones');
// Conflicts are flagged, never silently resolved.
const s3 = teaching.find((s) => s.series === 3);
const s4 = teaching.find((s) => s.series === 4);
check(s3.conflicts.some((c) => /hurdles/i.test(c) && /relays/i.test(c)), 'series 3: the lessons-say-hurdles / board-says-relays conflict is not flagged');
check(s4.conflicts.some((c) => /Long jump/.test(c) && /Relays/.test(c)), 'series 4: the long jump vs relays conflict is not flagged');
check(card('s4-A-4').name === 'Jump and Freeze' && card('s4-B-4').name === 'Beat Your Own Marker', 'series 4: Station 4 is Long jump (Jump and Freeze / Beat Your Own Marker)');

// Series 5–9, as on the Rotations board.
const LATER = {
  5: [['Frogs and Flies', 'T-ball Strike', "Frosty's Winter Trail", 'Jump and Freeze — revisit'], ['Measure Your Hop', 'Super Strikers', "Frosty's Winter Trail", 'Long Jump Journey']],
  6: [['Cat & Mouse', 'Clever Catchers — return', 'Space Station', 'Step and Run — recap'], ['Push Throw Hoop', 'Catch and Chase', 'Space Station', 'Hurdle Trail']],
  7: [['Ballrush — change directions', 'Crazy Kickers — control', 'Farmyard Fitness', 'Scissor Jump Review'], ['Dragons Tail — dodge', 'Partner Kicking — accuracy', 'Farmyard Fitness', 'High Jump Choices']],
  8: [['Rippa Tag', 'Cricket Hit', 'Power Circuit', 'Half and Half Relay — revisit'], ['Chain Tag — skipping', 'Super Strikers — moving ball', 'Power Circuit', 'Smooth Relay']],
  9: [['Tigers and Cheetahs', 'Target Toys — underarm recap', 'Challenge Trail', 'Long Jump — personal goal'], ['Team Dodge Challenge', 'Force Back — overarm recap', 'Challenge Trail', 'Long Jump — celebration']],
};
for (const [n, [a, b]] of Object.entries(LATER)) {
  check(names(Number(n), 'A').join('|') === a.join('|'), `series ${n} week A: ${names(Number(n), 'A')}`);
  check(names(Number(n), 'B').join('|') === b.join('|'), `series ${n} week B: ${names(Number(n), 'B')}`);
  for (const w of ['A', 'B']) check(card(`s${n}-${w}-3`).layout === 'circuit' && card(`s${n}-${w}-3`).steps.length === 6, `s${n}-${w}-3: circuit should have six exercises`);
}
check(allCards.every((c) => !c.auto), `every Series 1–9 card should be hand-condensed; still auto: ${allCards.filter((c) => c.auto).map((c) => c.key).join(', ')}`);
// Series 6 and 7: the board decides Station 4; the lesson pages' version is one click away, and the clash is flagged.
const s6 = teaching.find((s) => s.series === 6);
const s7 = teaching.find((s) => s.series === 7);
check(/hurdle/i.test(card('s6-A-4').name + card('s6-B-4').name), 'series 6 station 4 must follow the board (hurdles)');
check(/scissor|high jump/i.test(card('s7-A-4').name + card('s7-B-4').name), 'series 7 station 4 must follow the board (high jump)');
for (const k of ['s6-A-4', 's6-B-4', 's7-A-4', 's7-B-4']) check(card(k).alternate && /lesson/i.test(card(k).alternate.label || ''), `${k}: the lesson version should be available as a labelled alternate`);
check(s6.conflicts.some((c) => /high jump/i.test(c) && /hurdle/i.test(c)), 'series 6: the hurdles vs high jump conflict is not flagged');
check(s7.conflicts.some((c) => /high jump/i.test(c) && /hurdle/i.test(c)), 'series 7: the high jump vs hurdles conflict is not flagged');
check(s6.conflicts.some((c) => /4 Feb/.test(c) && /senior/i.test(c)), 'series 6: the 4 Feb senior high jump clash evidence is missing');

/* ---------- 4. Week 19 Mini Meet ---------- */

const meetSeries = sessions.series.find((s) => s.isFinal);
const zones = meetSeries.cards.A;
check(zones.length === 4 && meetSeries.cards.B.length === 0, 'the Mini Meet should have four zones and no Week B');
check(zones.every((z, i) => z.kind === 'zone' && z.minutes === 8 && z.key === `s10-A-${i + 1}` && z.date === '2027-04-01'), 'Mini Meet zones must be 8-minute zone cards dated 1 Apr 2027');
check(/run|dodge/i.test(zones[0].name) && /hop|skip|jump|balance/i.test(zones[1].name) && /throw|push|catch/i.test(zones[2].name) && /kick|strike|relay/i.test(zones[3].name), `Mini Meet zones out of order: ${zones.map((z) => z.name)}`);
const meetText = JSON.stringify(meetSeries.meet);
check((meetSeries.meet.runOfShow || []).length >= 4 && /5:30/.test(meetText) && /certificate/i.test(meetText), 'the Mini Meet run of show is missing');
check(meetSeries.meet.passport && (meetSeries.meet.passport.zoneLabels || []).length === 4, 'the passport needs one sticker box per zone');
check(meetSeries.meet.certificate && !/\b(1st|2nd|3rd|winner|first place|fastest|furthest)\b/i.test(meetSeries.meet.certificate.title + meetSeries.meet.certificate.body), 'certificates must be participation-only');
check(/photo/i.test(meetText) && /soft/i.test(meetText), 'Mini Meet safety must cover soft equipment and photo consent');

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

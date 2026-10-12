// Build api/_data/sessions.mjs (the gated Get Set Go run sheets) from the
// committed Notion snapshot in scripts/data/lessons.json.
//
// Pipeline:
//   npm run pull:lessons     scripts/notion_pull_lessons.mjs  -> scripts/data/lessons.json
//   npm run build:sessions   this file                        -> api/_data/sessions.mjs
//
// The output is a module (not JSON) living in api/_data/ so the run sheets are
// only ever served through the gated /api/sessions endpoint — they were once a
// static file at public/getsetgo/sessions.json, which was publicly downloadable.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const data = (n) => JSON.parse(readFileSync(join(here, 'data', n), 'utf8'));

const lessons = data('lessons.json');
const extras = data('season-extras.json');
const curated = data('station-cards.json');

/** Week pages pair up: weeks 1–2 are series 1, 17–18 are series 9, week 19 is the mini meet. */
function seriesForWeek(week) {
  return week <= 18 ? Math.ceil(week / 2) : 10;
}

function buildSeason() {
  const term4 = lessons.series.filter((s) => s.term === 'Term 4' && s.series !== 10);
  const term1 = lessons.series.filter((s) => s.term === 'Term 1' && s.series !== 10);
  const span = (list) => {
    const dates = list.map((s) => s.dates).filter(Boolean);
    if (!dates.length) return '';
    const first = String(dates[0]).split('·')[0].trim();
    const last = String(dates[dates.length - 1]).split('·').pop().trim();
    return `${first} – ${last}`;
  };
  const finalSeries = lessons.series.find((s) => s.series === 10);

  return {
    title: 'Get Set Go',
    subtitle: extras.subtitle,
    time: extras.time,
    length: '19 weeks — 18 teaching sessions plus a Week 19 mini meet',
    term4: `Term 4 2026 · ${span(term4)}`,
    term1: `Term 1 2027 · ${span(term1)}`,
    finalNight: finalSeries ? `${finalSeries.dates} — ${finalSeries.name}` : '',
    // How a night runs, straight from the 19-week lesson programme.
    howEverySessionWorks: {
      title: extras.howNightRuns?.title || 'How the night runs',
      steps: extras.howNightRuns?.steps || [],
      teachingNote: extras.howNightRuns?.teachingNote || '',
      stationStructure: extras.stationNote || '',
    },
    coachingPrinciples: extras.coachingPrinciples || [],
    athleticsNote: extras.athleticsNote || '',
    recordWhatMatters: lessons.programme.recordWhatMatters?.paragraph || '',
    warmdown: extras.warmdown,
    rules: extras.rules,
  };
}

function buildSeries() {
  return lessons.series.map((s) => {
    const isFinal = s.series === 10;
    const rotations = isFinal ? [] : lessons.rotations
      .filter((r) => r.series === s.series)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((r) => ({
        order: r.order,
        category: r.category,
        skill: r.skill,
        ledBy: r.ledBy,
        event: r.event,
        skillsCovered: r.skillsCovered || [],
        course: r.course || '',
        weekA: r.weekA,
        weekB: r.weekB,
        discovery: r.discovery,
        developing: r.developing,
        consolidating: r.consolidating,
        weekBProgression: r.weekBProgression,
        setup: r.setup,
        how: r.how,
        equipment: r.equipment,
        adaptation: r.adaptation,
        extension: r.extension,
        watchFor: r.watchFor,
        coachObservation: r.coachObservation,
        backup: String(r.backup || '').split('\u2014')[0].trim(),
        backupSummary:
          (extras.backupGames || {})[String(r.backup || '').split('\u2014')[0].trim()] ||
          String(r.backup || '').split('\u2014')[1]?.trim() ||
          '',
      }));

    // The week pages belonging to this series, with their run of show.
    const weeks = lessons.weeks
      .filter((w) => (w.week ?? 0) >= 1 && seriesForWeek(w.week ?? 0) === s.series)
      .map((w) => ({
        week: w.week,
        title: w.title,
        phase: w.phase,
        header: w.header,
        seriesBits: w.seriesBits,
        intendedLearning: w.intendedLearning,
        runOfShow: w.runOfShow || [],
      }));

    const dates = s.dates ? String(s.dates).split('·').map((d) => d.trim()).filter(Boolean) : [];
    const seed = curated.series[String(s.series)] || {};
    return {
      series: s.series,
      name: s.name,
      theme: seed.theme || String(s.name || '').split('—').slice(1).join('—').trim(),
      term: s.term,
      weeksLabel: s.weeks ? `Weeks ${s.weeks}` : '',
      dates,
      isoDates: dates.map(isoDate),
      athleticsEvent: s.athleticsEvent,
      manipulative: s.manipulative,
      fitnessCircuit: s.fitnessCircuit,
      coachNote: s.coachNote,
      // Dashboard-only labels: a hand-condensed series may flag a provisional
      // event or carry a shorter note. The run-sheet fields above stay as the board has them.
      eventLabel: seed.athleticsEvent || s.athleticsEvent,
      sessionNote: (isFinal ? curated.meet?.coachNote : seed.coachNote) || s.coachNote,
      conflicts: (isFinal ? curated.meet?.conflicts : seed.conflicts) || [],
      isFinal,
      weeks,
      rotations,
      // The volunteer station cards: four per week, Week A then Week B.
      cards: isFinal ? { A: buildMeetCards(s, dates[0]), B: [] } : {
        A: rotations.map((r) => buildCard(s, r, 'A', dates[0])),
        B: rotations.map((r) => buildCard(s, r, 'B', dates[1])),
      },
      // Week 19 is a celebration night, not a rotation night: its timed plan,
      // passport and certificate wording live here.
      meet: isFinal ? buildMeet() : null,
    };
  });
}

/* ---------- volunteer station cards ----------
   Each station of each night gets one card. Hand-condensed cards in
   scripts/data/station-cards.json win; every other card is built mechanically
   from the Rotations board text (nothing invented) and flagged for review. */

const MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };

/** 'Thu 15 Oct 2026' -> '2026-10-15' */
function isoDate(label) {
  const m = String(label || '').match(/(\d{1,2})\s+([A-Z][a-z]{2})[a-z]*\s+(\d{4})/);
  if (!m || !MONTHS[m[2]]) return '';
  return `${m[3]}-${String(MONTHS[m[2]]).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const capital = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** 'Week A: x. Week B: y.' (or 'x. Week B: y.') -> { A: 'x.', B: 'y.' } */
function splitWeeks(text) {
  const t = clean(text);
  const i = t.search(/Week B:/i);
  if (i < 0) return { A: t.replace(/^Week A:\s*/i, ''), B: t.replace(/^Week A:\s*/i, '') };
  return { A: t.slice(0, i).replace(/^Week A:\s*/i, '').trim(), B: t.slice(i).replace(/^Week B:\s*/i, '').trim() };
}

/** 'Head up; pump arms; freeze steady.' -> ['Head up', 'Pump arms', 'Freeze steady'] */
function cueList(text) {
  return clean(text).split(';').map((c) => capital(c.trim().replace(/\.$/, ''))).filter(Boolean);
}

/** 'Name: Discover — a. Develop — b. Apply — c.' -> { discovery, developing, consolidating } */
function progression(text) {
  const t = clean(text).replace(/^[^:]{0,60}:\s*(?=Discover)/, '');
  const m = t.match(/Discover\s*[—-]\s*(.*?)\s*Develop\s*[—-]\s*(.*?)\s*Apply\s*[—-]\s*(.*)$/);
  return m ? { discovery: m[1], developing: m[2], consolidating: m[3] } : null;
}

/** Board course text -> the six circuit steps as 'Name — how'. */
function courseSteps(course) {
  return String(course || '').split('\n').slice(1)
    .map((l) => clean(l.replace(/^\d+\.\s*/, '')))
    .filter(Boolean);
}

/** A paragraph of how-to-play -> up to six short steps, merging the shortest. */
function sentenceSteps(text) {
  const parts = clean(text).split(/(?<=[.!?])\s+(?=[A-Z'‘"])/).filter(Boolean);
  while (parts.length > 6) {
    let best = 0;
    for (let i = 1; i < parts.length - 1; i++) if (parts[i].length + parts[i + 1].length < parts[best].length + parts[best + 1].length) best = i;
    parts.splice(best, 2, `${parts[best]} ${parts[best + 1]}`);
  }
  return parts;
}

const stripName = (text, name) => clean(text).replace(new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*`), '');

function hashCard(card) {
  const { hash, ...content } = card;
  return createHash('sha256').update(JSON.stringify(content)).digest('hex').slice(0, 12);
}

function derivedCard(s, r, week) {
  const w = (week === 'A' ? r.weekA : r.weekB) || {};
  const circuit = r.category === 'Fitness Circuit';
  const courseName = String(r.course || '').split('\n')[0].trim();
  const name = clean(w.challenge) || courseName || clean(s.fitnessCircuit) || r.skill;
  const review = [];
  let steps;
  let prog;
  if (circuit) {
    steps = courseSteps(r.course);
    if (!steps.length) review.push('No circuit course on the Rotations board.');
  } else if (week === 'A') {
    steps = sentenceSteps(r.how);
  } else {
    prog = progression(r.weekBProgression);
    steps = prog ? [`Discover — ${prog.discovery}`, `Develop — ${prog.developing}`, `Apply — ${prog.consolidating}`] : [];
    review.push('Week B steps come from the board’s Week B progression — the board has no separate how-to for this activity.');
    if (name !== clean(r.weekA?.challenge)) review.push(`Set-up is the Week A set-up — check it suits ${name}.`);
  }
  if (!steps.length) review.push('No steps on the Rotations board — add them before sharing.');
  const cues = cueList(w.cues);
  if (!cues.length) review.push('No coaching cues on the Rotations board.');
  if (week === 'B' && circuit) {
    prog = null;
    const extra = clean(r.weekBProgression).replace(/^Week B:\s*/i, '');
    if (extra) review.push(`Week B progression from the board: ${extra}`);
  }
  const ddc = week === 'B' && prog
    ? prog
    : { discovery: stripName(r.discovery, name), developing: clean(r.developing), consolidating: clean(r.consolidating) };
  // r is a run-sheet rotation: backup is already split into name + summary.
  const backupName = clean(r.backup);
  const backupHow = clean(r.backupSummary);
  return {
    name,
    skill: clean(r.skill),
    layout: circuit ? 'circuit' : 'steps',
    equipment: clean(r.equipment) && clean(r.equipment) !== 'None' ? clean(r.equipment).split(/,\s*/).map(capital) : ['No equipment — open space'],
    setup: clean(r.setup),
    steps,
    cues,
    younger: splitWeeks(r.adaptation)[week],
    older: splitWeeks(r.extension)[week],
    watch: clean(r.watchFor),
    safety: r.category === 'Athletics' ? curated.eventSafety[r.event] || '' : '',
    ...ddc,
    observation: splitWeeks(r.coachObservation)[week],
    alternative: backupName ? `${backupName}${backupHow ? ` — ${backupHow}` : ''}` : '',
    review: ['Built automatically from the Rotations board — check it before sharing.', ...review].join(' '),
    sources: [`Rotations board: S${s.series} · R${r.order} (auto)`],
  };
}

/** Station illustrations live in public/getsetgo/stations/. A mapped image whose file isn't there yet is skipped. */
const missingImages = new Set();
function imageFor(name) {
  const image = curated.images[name];
  if (!image) return null;
  if (existsSync(join(here, '..', 'public', image.src))) return image;
  missingImages.add(image.src);
  // An activity may borrow another activity's picture until its own is added.
  for (const other of image.fallbacks || []) {
    const fb = curated.images[other];
    if (fb && existsSync(join(here, '..', 'public', fb.src))) return { ...fb, alt: image.alt || fb.alt, note: image.note || fb.note || '' };
  }
  return null;
}

const imageOf = (name) => {
  const image = imageFor(name);
  return image ? { src: image.src, alt: image.alt, note: image.note || '' } : null;
};

function buildCard(s, r, week, dateLabel) {
  const seed = curated.series[String(s.series)]?.stations?.[String(r.order)]?.[week];
  const { boardAlternative, alternate, ...seedCard } = seed || {};
  const base = seed ? { layout: 'steps', safety: '', review: '', ...seedCard } : derivedCard(s, r, week);
  const image = imageFor(base.name);
  const card = {
    key: `s${s.series}-${week}-${r.order}`,
    series: s.series,
    week,
    station: r.order,
    category: r.category,
    ledBy: r.ledBy || '',
    minutes: 11,
    date: isoDate(dateLabel),
    dateLabel: dateLabel || '',
    auto: !seed,
    volunteers: '',
    ...base,
    image: image ? { src: image.src, alt: image.alt, note: image.note || '' } : null,
  };
  // Where two Notion sources disagree, the card keeps the other version beside
  // it so an admin can approve either one from the editor without retyping it:
  // the Rotations board's own version (boardAlternative) or a lesson-page
  // version written out in station-cards.json (alternate).
  if (boardAlternative) {
    const board = derivedCard(s, r, week);
    card.alternate = { label: 'Rotations board version', ...board, image: imageOf(board.name) };
  } else if (alternate) {
    card.alternate = { layout: 'steps', safety: '', review: '', ...alternate, image: imageOf(alternate.name) };
  }
  card.hash = hashCard(card);
  return card;
}

/* ---------- Week 19 Mini Meet ---------- */

/** Four 8-minute activity zones, shaped like station cards so the dashboard, editor and exports all work. */
function buildMeetCards(s, dateLabel) {
  const meet = curated.meet;
  if (!meet) return [];
  return meet.zones.map((zone, i) => {
    const { reuseImage, ...seedCard } = zone;
    const card = {
      key: `s${s.series}-A-${i + 1}`,
      series: s.series,
      week: 'A',
      station: i + 1,
      category: 'Zone',
      kind: 'zone',
      ledBy: 'Volunteers',
      minutes: 8,
      date: isoDate(dateLabel),
      dateLabel: dateLabel || '',
      auto: false,
      volunteers: '',
      layout: 'steps',
      safety: '',
      review: '',
      ...seedCard,
      image: imageOf(`Mini Meet Zone ${i + 1}`) || (reuseImage ? imageOf(reuseImage) : null),
    };
    card.hash = hashCard(card);
    return card;
  });
}

function buildMeet() {
  const meet = curated.meet;
  if (!meet) return null;
  const { zones, conflicts, coachNote, ...rest } = meet;
  return rest;
}

const sessions = {
  season: buildSeason(),
  series: buildSeries(),
};

const banner = `/**
 * Get Set Go run sheets — GENERATED FILE, do not edit by hand.
 * Source:  scripts/data/lessons.json  (pulled from Notion)
 *          scripts/data/season-extras.json  (hand-edited: warm-down + standing rules)
 *          scripts/data/station-cards.json  (hand-condensed volunteer station cards)
 * Rebuild: npm run build:sessions
 *
 * GATED: served only through /api/sessions behind the admin passcode.
 * Live in api/_data/ so it is never served as a static public file.
 */

`;

const outDir = join(here, '..', 'api', '_data');
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'sessions.mjs');
writeFileSync(outPath, banner + 'export default ' + JSON.stringify(sessions, null, 2) + ';\n', 'utf8');

const totalRotations = sessions.series.reduce((n, s) => n + s.rotations.length, 0);
const totalWeeks = sessions.series.reduce((n, s) => n + s.weeks.length, 0);
console.log(`Wrote ${outPath}`);
console.log(`  series:    ${sessions.series.length}`);
console.log(`  week pages:${String(totalWeeks).padStart(4)}`);
console.log(`  rotations: ${totalRotations}`);
const allCards = sessions.series.flatMap((s) => [...s.cards.A, ...s.cards.B]);
if (missingImages.size) console.log(`  images not added yet (cards show a placeholder): ${[...missingImages].join(', ')}`);
console.log(`  cards:     ${allCards.length} (${allCards.filter((c) => !c.auto).length} hand-condensed, ${allCards.filter((c) => c.auto).length} auto-built from the board)`);

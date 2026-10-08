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
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const data = (n) => JSON.parse(readFileSync(join(here, 'data', n), 'utf8'));

const lessons = data('lessons.json');
const extras = data('season-extras.json');

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
      title: lessons.programme.howEverySessionWorks?.heading || 'How every session works',
      steps: lessons.programme.howEverySessionWorks?.items || [],
      stationStructure: lessons.programme.howEverySessionWorks?.paragraph || '',
    },
    coachingPrinciples: lessons.programme.coachingPrinciples?.items || [],
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
        backup: r.backup,
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

    return {
      series: s.series,
      name: s.name,
      term: s.term,
      weeksLabel: s.weeks ? `Weeks ${s.weeks}` : '',
      dates: s.dates ? String(s.dates).split('·').map((d) => d.trim()).filter(Boolean) : [],
      athleticsEvent: s.athleticsEvent,
      manipulative: s.manipulative,
      fitnessCircuit: s.fitnessCircuit,
      coachNote: s.coachNote,
      isFinal,
      weeks,
      rotations,
    };
  });
}

const sessions = {
  season: buildSeason(),
  series: buildSeries(),
};

const banner = `/**
 * Get Set Go run sheets — GENERATED FILE, do not edit by hand.
 * Source:  scripts/data/lessons.json  (pulled from Notion)
 *          scripts/data/season-extras.json  (hand-edited: warm-down + standing rules)
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

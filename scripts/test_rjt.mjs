// Validates the Run Jump Throw timetable + activity library.
//
// Checks that every station points at a skill that exists, and — more subtly —
// that every skill's activity categories actually resolve. A typo in a category
// name would silently drop that station's activities with no visible error,
// which is exactly the kind of thing nobody notices until a coach is standing on
// a field with no games to run.
//
//   node scripts/test_rjt.mjs
import runJumpThrow from '../api/_data/runJumpThrow.mjs';
import library from '../api/_data/rjtActivities.mjs';
import { withLibrary } from '../api/rjt.mjs';

const problems = [];
let stationCount = 0;
let blankSlots = 0;
const usedSkills = new Set();

function check(cond, msg) {
  if (!cond) problems.push(msg);
}

const rjt = runJumpThrow;
check(rjt && typeof rjt === 'object', 'default export is not an object');
check(rjt.programme && rjt.programme.title, 'missing programme.title');
check(rjt.skills && Object.keys(rjt.skills).length, 'missing skills');
check(Array.isArray(rjt.terms) && rjt.terms.length, 'missing terms');

const skillKeys = new Set(Object.keys(rjt.skills || {}));

// Every skill needs the fields the UI reads.
for (const [key, sk] of Object.entries(rjt.skills || {})) {
  check(sk.name, `skill "${key}" has no name`);
  check(sk.what, `skill "${key}" has no description`);
  check(sk.category, `skill "${key}" has no category`);
  check(Array.isArray(sk.cues) && sk.cues.length, `skill "${key}" has no cues`);
}

for (const term of rjt.terms || []) {
  check(term.term, 'a term has no name');
  check(Array.isArray(term.nights) && term.nights.length, `term "${term.term}" has no nights`);
  for (const night of term.nights || []) {
    if (night.blank) continue;
    check(Array.isArray(night.stations), `night "${night.date}" has no stations array`);
    for (const st of night.stations || []) {
      if (!st.station) { blankSlots++; continue; }
      stationCount++;
      if (!st.skill) {
        problems.push(`station "${st.station}" (${night.date}) has no skill key`);
        continue;
      }
      if (!skillKeys.has(st.skill)) {
        problems.push(`station "${st.station}" (${night.date}) points at unknown skill "${st.skill}"`);
      } else {
        usedSkills.add(st.skill);
      }
    }
  }
}

/* ---- activity library ---- */

const activityCategories = new Set(Object.keys(library.activities));
const eventCategories = new Set(Object.keys(library.events));

// Every category the mapping points at must actually exist, or activities vanish.
for (const [skillId, cats] of Object.entries(library.skillCategories)) {
  check(skillKeys.has(skillId), `skillCategories references unknown skill "${skillId}"`);
  check(Array.isArray(cats) && cats.length, `skillCategories["${skillId}"] is empty`);
  for (const cat of cats || []) {
    if (!activityCategories.has(cat) && !eventCategories.has(cat)) {
      problems.push(`skillCategories["${skillId}"] references unknown category "${cat}"`);
    }
  }
}

// Any category defined but never referenced is dead weight worth knowing about.
const referenced = new Set(Object.values(library.skillCategories).flat());
const orphanActivities = [...activityCategories].filter((c) => !referenced.has(c));
const orphanEvents = [...eventCategories].filter((c) => !referenced.has(c));
// 'Warm Up' is intentionally not attached to a station — it has its own panel.
const expectedOrphans = new Set(['Warm Up']);
const unexpectedOrphans = orphanActivities.filter((c) => !expectedOrphans.has(c));
if (unexpectedOrphans.length) {
  problems.push(`activity categories attached to no station: ${unexpectedOrphans.join(', ')}`);
}
// Adaptive events live in their own group by design, so they should not be orphans.
const adaptiveCount = Object.values(library.adaptiveEvents || {}).reduce((n, a) => n + a.length, 0);
check(adaptiveCount > 0, 'adaptiveEvents is empty');

const merged = withLibrary(rjt, library);

// Skills the timetable actually uses must come out with something to run.
let skillsWithActivities = 0;
let skillsWithNothing = [];
for (const skillId of usedSkills) {
  const sk = merged.skills[skillId];
  const total = (sk.activities || []).length + (sk.events || []).length;
  if (total) skillsWithActivities++;
  else skillsWithNothing.push(`${skillId} (${sk.name})`);
}
if (skillsWithNothing.length) {
  problems.push(`stations with no activities or events attached: ${skillsWithNothing.join(', ')}`);
}

const totalActivities = Object.values(library.activities).reduce((n, a) => n + a.length, 0);
const totalEvents = Object.values(library.events).reduce((n, a) => n + a.length, 0);

console.log('Run Jump Throw data');
console.log('  terms:              ', (rjt.terms || []).length);
console.log('  nights:             ', (rjt.terms || []).reduce((n, t) => n + t.nights.length, 0));
console.log('  stations placed:    ', stationCount);
console.log('  empty slots:        ', blankSlots);
console.log('  skills defined:     ', skillKeys.size);
console.log('  skills used:        ', usedSkills.size);
const unused = [...skillKeys].filter((k) => !usedSkills.has(k));
if (unused.length) console.log('  skills not used:    ', unused.join(', '));
console.log('');
console.log('  activity categories:', activityCategories.size);
console.log('  activities:         ', totalActivities, `(+${library.uncategorised.length} unfiled)`);
console.log('  event categories:   ', eventCategories.size);
console.log('  events:             ', totalEvents);
console.log('  adaptive events:    ', adaptiveCount);
console.log('  warm-up games:      ', (library.activities['Warm Up'] || []).length);
console.log('  stations with cards:', `${skillsWithActivities}/${usedSkills.size}`);
if (orphanActivities.length) console.log('  unreferenced cats:  ', orphanActivities.join(', '));
if (orphanEvents.length) console.log('  unreferenced events:', orphanEvents.join(', '));

if (problems.length) {
  console.error('\nFAILED:');
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log('\nAll station skills and activity categories resolve.');

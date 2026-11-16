// Club Records: the historical sheet (api/_data/clubRecordsBase.mjs, as at the
// end of 2024/25) merged with club-night results that beat or equal it.
//
// Shared by /api/clubrecords (the public board) and /api/records (which tells
// the admin when a result they just saved is a new club record). Everything is
// computed live from the Club Records database, so correcting or deleting a
// mistyped result in the admin portal also takes it off the board.
import base from './_data/clubRecordsBase.mjs';

export const BASE_AS_AT = base.asAt;
export const RECORD_EVENTS = base.events.map((e) => ({ event: e.event, unit: e.unit }));
const UNIT = Object.fromEntries(RECORD_EVENTS.map((e) => [e.event, e.unit]));
/** Club records are kept for Grades 7–14. */
const GRADES = new Set(['7', '8', '9', '10', '11', '12', '13', '14']);

/**
 * A mark as a number: seconds for track events (lower is better), metres for
 * field events. Reads both the sheet's "00:10.73" / "00:09:14" / "01.14.10"
 * and club-night entries like "10.73", "1:23.4", "4.56m" or "9.9s".
 */
export function markValue(event, text) {
  // A comma typed as the decimal point ("15,1") counts as one.
  const s = String(text || '').trim().replace(/,/g, '.').replace(/[a-z\s]/gi, '');
  if (!s) return null;
  if (UNIT[event] !== 'time') {
    const v = parseFloat(s);
    return Number.isFinite(v) && v > 0 ? v : null;
  }
  const parts = s.split(/[:.]/).filter((p) => p !== '');
  if (parts.some((p) => !/^\d+$/.test(p))) return null;
  let v;
  if (/:/.test(s) || parts.length === 3) {
    // m:ss(.hh) — the sheet also writes the hundredths after a second colon.
    const [m, sec, frac = ''] = parts;
    v = Number(m) * 60 + Number(sec) + (frac ? Number(frac) / 10 ** frac.length : 0);
  } else {
    v = parseFloat(s);
  }
  return Number.isFinite(v) && v > 0 ? v : null;
}

const better = (event, a, b) => (UNIT[event] === 'time' ? a < b : a > b);
const EPS = 1e-9;
const same = (a, b) => Math.abs(a - b) < EPS;

/** "16-Mar-23" → "2023-03-16". */
const MONTHS = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
function sheetDate(d) {
  const [day, mon, yy] = String(d).split('-');
  return MONTHS[mon] ? `20${yy}-${MONTHS[mon]}-${String(day).padStart(2, '0')}` : '';
}

const normGender = (g) => {
  const c = String(g || '').trim().charAt(0).toUpperCase();
  return c === 'F' || c === 'G' ? 'F' : c === 'M' || c === 'B' ? 'M' : '';
};

/**
 * Club-night rows → candidates. `rows` are { id, memberId, name, event, grade,
 * gender, date, result }.
 */
function candidates(rows) {
  const out = [];
  for (const r of rows) {
    const grade = String(r.grade || '').trim();
    const gender = normGender(r.gender);
    if (!UNIT[r.event] || !GRADES.has(grade) || !gender || !r.name) continue;
    const value = markValue(r.event, r.result);
    if (value == null) continue;
    out.push({ ...r, grade, gender, value });
  }
  return out;
}

const key = (event, grade, gender) => `${event}|${grade}|${gender}`;

/**
 * The merged board: for every event / grade / gender, the best mark and
 * everyone who holds it (ties share a record). A club-night result that
 * equals or beats the sheet takes its place on the board.
 */
export function buildBoard(rows) {
  const slots = new Map();
  for (const e of base.events) {
    for (const r of e.rows) {
      slots.set(key(e.event, String(r.grade), r.gender), {
        event: e.event,
        grade: String(r.grade),
        gender: r.gender,
        value: markValue(e.event, r.mark),
        holders: r.names.map((name, i) => ({ name, date: sheetDate(r.dates[i] || r.dates[0]), mark: r.mark, source: 'sheet' })),
      });
    }
  }
  for (const c of candidates(rows)) {
    const k = key(c.event, c.grade, c.gender);
    const slot = slots.get(k);
    const holder = { name: c.name, date: c.date || '', mark: c.result, source: 'club-night', id: c.id };
    if (!slot || slot.value == null || better(c.event, c.value, slot.value)) {
      slots.set(k, { event: c.event, grade: c.grade, gender: c.gender, value: c.value, holders: [holder] });
    } else if (same(c.value, slot.value) && !slot.holders.some((h) => h.name === c.name)) {
      slot.holders.push(holder);
    }
  }
  return [...slots.values()];
}

/**
 * Public shape: grouped by event in the sheet's order, each record with its
 * holders (name, date, mark, whether it was set at a club night).
 */
export function publicBoard(rows) {
  const board = buildBoard(rows);
  return RECORD_EVENTS.map(({ event, unit }) => ({
    event,
    unit,
    rows: board
      .filter((s) => s.event === event)
      .sort((a, b) => Number(a.grade) - Number(b.grade) || a.gender.localeCompare(b.gender))
      .map((s) => ({
        grade: Number(s.grade),
        gender: s.gender,
        holders: s.holders.map(({ name, date, mark, source }) => ({ name, date, mark, source })),
      })),
  }));
}

/**
 * Which of the just-saved results are (or equal) a club record, and what they
 * beat. `savedIds` are Club Records row ids written by this request.
 */
export function newRecordsFor(rows, savedIds) {
  const saved = new Set(savedIds.map((id) => String(id).replace(/-/g, '')));
  const out = [];
  for (const s of buildBoard(rows)) {
    for (const h of s.holders) {
      if (h.source !== 'club-night' || !saved.has(String(h.id).replace(/-/g, ''))) continue;
      // What stood before: the board without this result.
      const before = buildBoard(rows.filter((r) => String(r.id).replace(/-/g, '') !== String(h.id).replace(/-/g, '')))
        .find((x) => x.event === s.event && x.grade === s.grade && x.gender === s.gender);
      const tie = !!before && before.value != null && same(before.value, s.value);
      out.push({
        event: s.event,
        grade: s.grade,
        gender: s.gender,
        name: h.name,
        mark: h.mark,
        tie,
        previous: before && before.value != null ? { names: before.holders.map((x) => x.name), mark: before.holders[0].mark, date: before.holders[0].date } : null,
      });
    }
  }
  return out;
}

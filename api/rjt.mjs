// Vercel serverless function — the Run Jump Throw circuit timetable, with the
// āhei activity + event card library folded in.
//
// GATED. The station content and the activity library are derived from Athletics
// New Zealand's copyrighted Run Jump Throw material, used under the club's
// resource-provider licence. They are served only to a signed-in admin, never as
// static files — the data deliberately lives in `api/_data/` (not `public/` or
// `src/`) so it cannot be fetched directly.
import { requireAdmin } from './_guard.mjs';
import runJumpThrow from './_data/runJumpThrow.mjs';
import library from './_data/rjtActivities.mjs';

export const config = { maxDuration: 60 };

/**
 * Attach the activity and event cards to each skill, so the client can render a
 * station without duplicating the category mapping. Also expose the parts of the
 * library that do not hang off a station (warm-ups, and the cards whose category
 * tag was not captured).
 */
export function withLibrary(data, lib) {
  const skills = {};
  for (const [id, skill] of Object.entries(data.skills)) {
    const activities = [];
    const events = [];
    for (const category of lib.skillCategories[id] || []) {
      if (lib.activities[category]) activities.push(...lib.activities[category]);
      if (lib.events[category]) events.push(...lib.events[category]);
    }
    skills[id] = { ...skill, activities, events };
  }
  return {
    ...data,
    skills,
    library: {
      source: lib.source,
      warmUp: lib.activities['Warm Up'] || [],
      adaptiveEvents: Object.values(lib.adaptiveEvents || {}).flat(),
      uncategorised: lib.uncategorised,
    },
  };
}

function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { error: 'method not allowed' });
  if (!requireAdmin(req, res)) return;
  return send(res, 200, withLibrary(runJumpThrow, library));
}

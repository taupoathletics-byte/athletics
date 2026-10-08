// Build api/_data/sessions.mjs from season_plan.json + games.json.
//
// The output is a module (not JSON) and lives in api/_data/ so the run sheets
// are only ever served through the gated /api/sessions endpoint — it used to be
// written to public/getsetgo/sessions.json, which was publicly downloadable.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const data = (n) => JSON.parse(readFileSync(join(here, 'data', n), 'utf8'));

const plan = data('season_plan.json');
const games = data('games.json');

function resolveGame(name) {
  const g = games[name];
  if (!g) throw new Error(`Unknown game: ${name}`);
  return { name, ...g };
}

const series = plan.series.map((s) => ({
  ...s,
  rotations: s.rotations.map((r) => {
    const out = { ...r };
    if (r.game) out.game = resolveGame(r.game);
    return out;
  }),
}));

const sessions = {
  season: plan.season,
  series,
  finalNight: plan.finalNight,
};

const banner = `/**
 * Get Set Go run sheets — GENERATED FILE, do not edit by hand.
 * Source: scripts/data/season_plan.json + scripts/data/games.json
 * Rebuild with: npm run build:sessions
 *
 * GATED: served only through /api/sessions behind the admin passcode.
 * Live in api/_data/ so it is never served as a static public file.
 */

`;

const outDir = join(here, '..', 'api', '_data');
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'sessions.mjs');
writeFileSync(outPath, banner + 'export default ' + JSON.stringify(sessions, null, 2) + ';\n', 'utf8');
console.log(`Wrote ${outPath} (${series.length} series)`);

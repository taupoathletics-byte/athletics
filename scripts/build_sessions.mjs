// Build public/getsetgo/sessions.json from season_plan.json + games.json.
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

const outPath = join(here, '..', 'public', 'getsetgo', 'sessions.json');
writeFileSync(outPath, JSON.stringify(sessions, null, 2), 'utf8');
console.log(`Wrote ${outPath} (${series.length} series)`);

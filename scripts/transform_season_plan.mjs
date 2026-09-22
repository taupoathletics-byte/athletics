// Transform season_plan.json: weekA/weekB -> game (primary) + backup (same gear).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const path = join(here, 'data', 'season_plan.json');
const plan = JSON.parse(readFileSync(path, 'utf8'));

// series -> rotation order -> { game, backup, equipment }
const M = {
  1: {
    1: { game: 'Traffic Lights', backup: 'Fast Cars — run laps, change gear on call', equipment: '20 cones' },
    2: { game: 'Circus Throws', backup: 'Bin It — near, middle and far targets', equipment: '40 beanbags, 8 hoops, 4 buckets' },
    4: { game: 'Measure Your Hop', backup: 'Frog Jump Freeze — two-foot jump, freeze the landing', equipment: '30 cones, long jump mat or sandpit' },
  },
  2: {
    1: { game: 'Frogs and Flies', backup: 'Lily Pad Dash — hop hoop-to-hoop, quick feet', equipment: '12 hoops or flat markers, 2 soft balls' },
    2: { game: 'Clever Catchers', backup: 'Scarf Pop — toss a scarf high, clap once, catch', equipment: '20 soft balls, 20 scarves' },
    4: { game: 'Scissor Jump', backup: 'Elastic Step-Over — walk in and step over the elastic', equipment: '1 low elastic, 2 cones, flat markers' },
  },
  3: {
    1: { game: 'Dodgems', backup: 'Cone Weave — weave between the cones, first to fourth gear', equipment: '30 cones, whistle' },
    2: { game: 'Knock the Witch\u2019s Hat', backup: 'Knock It Back — step back and knock them again', equipment: '40 beanbags, 20 cones' },
    4: { game: 'Step and Run', backup: 'Hurdle Hop — two-foot hop over each hurdle', equipment: '8 foam hurdles, 20 cones' },
  },
  4: {
    1: { game: 'Catch the Magpies', backup: 'Freeze Hop — hop around, freeze on the whistle', equipment: 'Bibs, 20 cones' },
    2: { game: 'Partner Kicking', backup: 'Kick and Chase — kick far, chase it, dribble back', equipment: '20 soft footballs, 30 cones' },
    4: { game: 'Half and Half Relay', backup: 'Shuttle Relay — run out, touch the cone, run back', equipment: '12 beanbags, 20 cones, bibs' },
  },
  5: {
    1: { game: 'Fruit Salad', backup: 'Skip & Freeze — skip or gallop, freeze on the call', equipment: '20 cones to mark the circle' },
    2: { game: 'Large Ball Strike', backup: 'Super Strikers — hit and run the bases', equipment: '8 soft bats, 8 tees, 20 soft balls, 30 cones' },
    4: { game: 'Measure Your Hop', backup: 'Frog Jump Freeze — two-foot jump, freeze the landing', equipment: '30 cones, long jump mat or sandpit' },
  },
  6: {
    1: { game: 'Blob', backup: 'Chain Tag — one long chain chases', equipment: '20 cones, bibs' },
    2: { game: 'Clever Catchers', backup: 'Ball Roll Catch — roll the soft ball, catch it', equipment: '20 soft balls, 20 scarves' },
    4: { game: 'Scissor Jump', backup: 'Elastic Step-Over — walk in and step over the elastic', equipment: '1 low elastic, 2 cones, flat markers' },
  },
  7: {
    1: { game: 'Jumping Beans', backup: 'Jumping Bean Challenge — jumping beans only, jump far', equipment: 'None' },
    2: { game: 'Crazy Kickers', backup: 'Kick and Chase — kick far, chase it, dribble back', equipment: '20 soft footballs, 30 cones' },
    4: { game: 'Step and Run', backup: 'Hurdle Hop — two-foot hop over each hurdle', equipment: '8 foam hurdles, 20 cones' },
  },
  8: {
    1: { game: 'Chain Tag', backup: 'Blob — tag joins the blob, splits at three', equipment: '20 cones, bibs' },
    2: { game: 'Super Strikers', backup: 'Large Ball Strike — hit and run to the cone', equipment: '8 soft bats, 8 tees, 20 soft balls, 30 cones' },
    4: { game: 'Half and Half Relay', backup: 'Shuttle Relay — run out, touch the cone, run back', equipment: '12 beanbags, 20 cones, bibs' },
  },
  9: {
    1: { game: 'Fast Cars', backup: 'Red Light Green Light — freeze on red, go on green', equipment: '20 cones' },
    2: { game: 'Circus Throws', backup: 'Bin It — near, middle and far targets', equipment: '40 beanbags, 8 hoops, 4 buckets' },
    4: { game: 'Measure Your Hop', backup: 'Frog Jump Freeze — two-foot jump, freeze the landing', equipment: '30 cones, long jump mat or sandpit' },
  },
};

let changed = 0;
for (const s of plan.series) {
  for (const r of s.rotations) {
    if (!r.weekA && !r.weekB) continue; // fitness circuit (has course/stations)
    const m = M[s.series] && M[s.series][r.order];
    if (!m) throw new Error(`No mapping for series ${s.series} rotation ${r.order}`);
    r.game = m.game;
    r.backup = m.backup;
    r.equipment = m.equipment;
    delete r.weekA;
    delete r.weekB;
    changed++;
  }
}

writeFileSync(path, JSON.stringify(plan, null, 2), 'utf8');
console.log(`Transformed ${changed} rotations (game + backup).`);

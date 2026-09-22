// Pass 2: swap in the club's real games/equipment and align games to each week's
// athletics skill. Updates games.json (add games) and season_plan.json (rotations + fitness).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const data = join(here, 'data');
const gamesPath = join(data, 'games.json');
const planPath = join(data, 'season_plan.json');

/* ---- 1. add the club's games ---- */
const games = JSON.parse(readFileSync(gamesPath, 'utf8'));
Object.assign(games, {
  Dodgeball: {
    setup: 'A marked area with a line down the middle; soft dodgeballs ready.',
    how: 'Roll or gently throw dodgeballs (underarm, below the knees) to tag the other side. Tagged children run to the sideline, do five star jumps, and rejoin. Soft balls only, nobody is out for long.',
    equipment: '6 dodgeballs, 20 cones',
  },
  'Dead Ants': {
    setup: 'Wide area with clear boundaries.',
    how: 'Two taggers chase. When tagged, lie on your back with arms and legs in the air like a dead ant. A free friend tags your hand to bring you back to life. Swap the taggers often.',
    equipment: 'Bibs, 20 cones',
  },
  Ballrush: {
    setup: 'A start line and a finish line about 20m apart.',
    how: 'Everyone lines up on one side. Two or three taggers stand in the middle. On GO everyone runs to the other side without being tagged. Tagged children join the taggers in the middle. Repeat until only a few are left, then start again.',
    equipment: '20 cones, bibs',
  },
  'Rippa Tag': {
    setup: 'Wide area. Everyone wearing a rippa belt with two tags (or a team band).',
    how: 'Everyone runs and everyone rips. When both tags are gone, put them straight back on and rejoin. No teams, no score, no sitting out — two minutes on, one minute off.',
    equipment: '20 rippa belts & tags (or team bands), 20 cones',
  },
  'Target Toys': {
    setup: 'A row of hula hoops on the ground at three distances — close, middle, far.',
    how: 'Children throw soft toys underarm into the hoops, choosing which one to aim at. Three throws each, cheer every attempt. Move the close hoop closer for anyone struggling.',
    equipment: '8 hula hoops, soft toys',
  },
  'T-ball Strike': {
    setup: 'A batting tee with a large soft ball on top; a fielding area marked with cones.',
    how: 'Strike the ball off the tee with the bat, then run to a cone and back. Set up two or three tees so several children hit at once and nobody queues. Everyone bats every round.',
    equipment: 'T-ball set (bat, tee, 8 soft balls), 20 cones',
  },
  'Cricket Hit': {
    setup: 'A cricket bat, a ball on a low tee (or a gently rolled ball), and a target area marked with cones.',
    how: 'Hit the ball off the tee with the cricket bat (or hit a gently rolled ball), then run to a cone and back. Keep it gentle and close — this is about the swing, not power.',
    equipment: 'Cricket set (bat, ball, stumps), 20 cones',
  },
});
writeFileSync(gamesPath, JSON.stringify(games, null, 2), 'utf8');
console.log(`games.json now has ${Object.keys(games).length} games`);

/* ---- 2. fitness: swap rope/balance elements for balance blocks ---- */
let text = readFileSync(planPath, 'utf8');
const repl = [
  ['Tightrope walk along a rope on the floor', 'Walk along the balance blocks'],
  ['Tightrope walk along the rope', 'Walk along the balance blocks'],
  ['Tightrope walk between the skyscrapers', 'Walk the balance blocks between the skyscrapers'],
  ['Walk the plank — tightrope walk from A to B', 'Walk the plank — balance blocks from A to B'],
  ['Tightrope walk between the asteroids (cones)', 'Walk the balance blocks between the asteroids'],
  ['Walk the fence line (rope) balancing', 'Walk the fence line (balance blocks) balancing'],
  ['Balance a beanbag on your head across the rope line', 'Balance a beanbag on your head across the balance blocks'],
  ['Tightrope walk the whole rope without stepping off', 'Walk the whole balance blocks without stepping off'],
  ['slide sideways along a rope (side steps)', 'side-step along the balance blocks'],
  ['a rope held low between two cones', 'a balance block laid across two cones'],
  ['(a rope held low)', '(a balance block laid across two cones)'],
  ['2 ropes', 'balance blocks'],
];
for (const [a, b] of repl) text = text.split(a).join(b);
const plan = JSON.parse(text);

/* ---- 3. re-map game/manip/athletics rotations ---- */
const M = {
  1: {
    1: { skill: 'Running', game: 'Traffic Lights', backup: 'Fast Cars — run laps, change gear on call', equipment: '20 cones' },
    2: { skill: 'Underarm throwing', game: 'Target Toys', backup: 'Toy Basketball — throw into the high hoop', equipment: '8 hula hoops, soft toys' },
    4: { skill: 'Jumping for distance', game: 'Measure Your Hop', backup: 'Frog Jump Freeze — two-foot jump, freeze the landing', equipment: '30 cones, long jump mat or sandpit' },
  },
  2: {
    1: { skill: 'Jumping for height', game: 'Jumping Beans', backup: 'Jump and Reach — jump up to touch a held target', equipment: 'None' },
    2: { skill: 'Catching', game: 'Clever Catchers', backup: 'Scarf Pop — toss a scarf high, clap once, catch', equipment: '20 soft balls, 20 scarves' },
    4: { skill: 'Jumping for height', game: 'Scissor Jump', backup: 'Elastic Step-Over — walk in and step over the elastic', equipment: '1 low elastic, 2 cones, flat markers' },
  },
  3: {
    1: { skill: 'Dodging', game: 'Dodgeball', backup: 'Dodgeball Roll — roll the ball to tag feet', equipment: '6 dodgeballs, 20 cones' },
    2: { skill: 'Overarm throwing', game: 'Force Back', backup: 'Knock the Witch\u2019s Hat — step back and knock them again', equipment: '40 beanbags, 20 cones' },
    4: { skill: 'Hurdling', game: 'Step and Run', backup: 'Hurdle Hop — two-foot hop over each hurdle', equipment: '8 foam hurdles, 20 cones' },
  },
  4: {
    1: { skill: 'Running', game: 'Dead Ants', backup: 'Chain Tag — one long chain chases', equipment: 'Bibs, 20 cones' },
    2: { skill: 'Kicking', game: 'Partner Kicking', backup: 'Kick and Chase — kick far, chase it, dribble back', equipment: '20 soft footballs, 30 cones' },
    4: { skill: 'Relay changeover', game: 'Half and Half Relay', backup: 'Shuttle Relay — run out, touch the cone, run back', equipment: '12 beanbags, 20 cones, bibs' },
  },
  5: {
    1: { skill: 'Jumping for distance', game: 'Frogs and Flies', backup: 'Lily Pad Dash — hop hoop-to-hoop, quick feet', equipment: '12 hoops or flat markers, 2 soft balls' },
    2: { skill: 'Striking', game: 'T-ball Strike', backup: 'T-ball Bases — hit and run to a cone', equipment: 'T-ball set (bat, tee, 8 soft balls), 20 cones' },
    4: { skill: 'Jumping for distance', game: 'Measure Your Hop', backup: 'Frog Jump Freeze — two-foot jump, freeze the landing', equipment: '30 cones, long jump mat or sandpit' },
  },
  6: {
    1: { skill: 'Jumping for height', game: 'Jumping Beans', backup: 'Jump and Reach — jump up to touch a held target', equipment: 'None' },
    2: { skill: 'Catching', game: 'Clever Catchers', backup: 'Ball Roll Catch — roll the soft ball, catch it', equipment: '20 soft balls, 20 scarves' },
    4: { skill: 'Jumping for height', game: 'Scissor Jump', backup: 'Elastic Step-Over — walk in and step over the elastic', equipment: '1 low elastic, 2 cones, flat markers' },
  },
  7: {
    1: { skill: 'Running', game: 'Ballrush', backup: 'Octopus — tagged kids become seaweed', equipment: '20 cones, bibs' },
    2: { skill: 'Kicking', game: 'Crazy Kickers', backup: 'Kick and Chase — kick far, chase it, dribble back', equipment: '20 soft footballs, 30 cones' },
    4: { skill: 'Hurdling', game: 'Step and Run', backup: 'Hurdle Hop — two-foot hop over each hurdle', equipment: '8 foam hurdles, 20 cones' },
  },
  8: {
    1: { skill: 'Running', game: 'Rippa Tag', backup: 'Rush Hour — everyone rips, everyone runs', equipment: '20 rippa belts & tags (or team bands), 20 cones' },
    2: { skill: 'Striking', game: 'Cricket Hit', backup: 'Cricket Roll and Hit — hit a gently rolled ball', equipment: 'Cricket set (bat, ball, stumps), 20 cones' },
    4: { skill: 'Relay changeover', game: 'Half and Half Relay', backup: 'Shuttle Relay — run out, touch the cone, run back', equipment: '12 beanbags, 20 cones, bibs' },
  },
  9: {
    1: { skill: 'Running', game: 'Fast Cars', backup: 'Red Light Green Light — freeze on red, go on green', equipment: '20 cones' },
    2: { skill: 'Underarm throwing', game: 'Target Toys', backup: 'Toy Basketball — throw into the high hoop', equipment: '8 hula hoops, soft toys' },
    4: { skill: 'Jumping for distance', game: 'Measure Your Hop', backup: 'Frog Jump Freeze — two-foot jump, freeze the landing', equipment: '30 cones, long jump mat or sandpit' },
  },
};

let changed = 0;
for (const s of plan.series) {
  for (const r of s.rotations) {
    if (!r.game) continue; // fitness circuit
    const m = M[s.series] && M[s.series][r.order];
    if (!m) throw new Error(`No mapping for series ${s.series} rotation ${r.order}`);
    r.skill = m.skill;
    r.game = m.game;
    r.backup = m.backup;
    r.equipment = m.equipment;
    changed++;
  }
}
writeFileSync(planPath, JSON.stringify(plan, null, 2), 'utf8');
console.log(`Re-mapped ${changed} rotations; fitness circuits swapped to balance blocks.`);

// Enrich the Game rotation with two more of the club's real games so all 18
// (9 primary + 9 backup) are distinct, matching the "no repeats" goal.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const gamesPath = join(here, 'data', 'games.json');
const planPath = join(here, 'data', 'season_plan.json');

const games = JSON.parse(readFileSync(gamesPath, 'utf8'));
Object.assign(games, {
  'Cat & Mouse': {
    setup: 'A wide area with one or two "mouse holes" (hoops or a square of cones) as safe zones.',
    how: 'The cat chases the mice. Mice are safe inside a mouse hole, but only for a slow count of five, then they must run again. When tagged, a mouse becomes a cat too. Swap the first cat often so everyone gets a turn chasing.',
    equipment: 'Bibs, 20 cones, 4 hoops',
  },
  'Tigers and Cheetahs': {
    setup: 'Two lines about 20m apart. Half the children are tigers on one line, half are cheetahs on the other.',
    how: 'On GO, one animal chases the other across to the opposite line. Tagged children swap sides and join the other animal. Swap which animal chases each round so everyone runs and everyone chases.',
    equipment: '20 cones, bibs',
  },
});
writeFileSync(gamesPath, JSON.stringify(games, null, 2), 'utf8');

const RUN = ['Run tall — head still, eyes forward', 'Arms bent at 90 degrees, swinging front to back not across', 'Knees lift forward', 'Land on the ball of the foot, light and quiet', 'Run THROUGH the finish line, not to it'];

const plan = JSON.parse(readFileSync(planPath, 'utf8'));
for (const s of plan.series) {
  const game = s.rotations.find((r) => r.order === 1);
  if (s.series === 6) {
    game.skill = 'Running';
    game.game = 'Cat & Mouse';
    game.backup = 'Chase Tag — a simple game of tag';
    game.equipment = 'Bibs, 20 cones, 4 hoops';
    game.cues = RUN;
    game.adaptation = 'Walking pace, coach as the first cat.';
    game.watchFor = 'Collisions — keep the area wide and cap the number of cats.';
  }
  if (s.series === 9) {
    game.skill = 'Running';
    game.game = 'Tigers and Cheetahs';
    game.backup = 'Farmers and Chickens — run the whole width, tagged chickens become farmers';
    game.equipment = '20 cones, bibs';
    game.cues = RUN;
    game.adaptation = 'Shorter run, walking pace to start.';
    game.watchFor = 'One side always chasing — swap which animal chases each round.';
  }
}
writeFileSync(planPath, JSON.stringify(plan, null, 2), 'utf8');

const primaries = plan.series.map((s) => s.rotations.find((r) => r.order === 1).game);
console.log('Game-rotation primaries:', primaries.join(' | '));
console.log('distinct:', new Set(primaries).size, 'of', primaries.length);

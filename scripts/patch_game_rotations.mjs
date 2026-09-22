// Patch cues/adaptation/watch-for for the Game rotations whose skill/game changed.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const path = join(here, 'data', 'season_plan.json');
const plan = JSON.parse(readFileSync(path, 'utf8'));

const RUN = ['Run tall — head still, eyes forward', 'Arms bent at 90 degrees, swinging front to back not across', 'Knees lift forward', 'Land on the ball of the foot, light and quiet', 'Run THROUGH the finish line, not to it'];
const JUMP_H = ['Bend knees into a crouch', 'Explode upwards', 'Swing arms upwards quickly', 'Stretch, reach and focus on the target', 'Land with knees bent to absorb the shock'];
const JUMP_D = ['Bend the knees into a crouch', 'Swing both arms back, then forward and up', 'Push off hard with both feet', 'Reach forward with the arms', 'Land on two feet with knees bent, and freeze'];
const DODGE = ['Small, quick steps', 'Bend the knees and stay low', 'Look where you are going, not at the ground', 'Push off the outside foot to change direction'];

const P = {
  2: { cues: JUMP_H, adaptation: 'Jump up to touch a coach\u2019s hand held just above their reach.', watchFor: 'No arm swing. Cue \u2018swing your arms up\u2019.' },
  3: { cues: DODGE, adaptation: 'Roll the dodgeball gently along the ground, underarm, below the knees.', watchFor: 'Throwing too hard. Cue \u2018below the knees, gentle\u2019.' },
  4: { cues: RUN, adaptation: 'Walking pace with a coach as the only tagger.', watchFor: 'Collisions — keep the area wide.' },
  5: { cues: JUMP_D, adaptation: 'Two-foot jumps on the spot and over flat markers only.', watchFor: 'Landing stiff-legged. Cue \u2018land quiet, bend your knees\u2019.' },
  6: { cues: JUMP_H, adaptation: 'Jump up to touch a coach\u2019s hand held just above their reach.', watchFor: 'No arm swing. Cue \u2018swing your arms up\u2019.' },
  7: { cues: RUN, adaptation: 'Shorter run, walking pace to start.', watchFor: 'Collisions in the middle. Keep the run wide.' },
  8: { cues: RUN, adaptation: 'Gentle rips — a coach demonstrates the two-hand tag.', watchFor: 'Grabbing instead of ripping. Cue \u2018rip the tag, not the shirt\u2019.' },
};

let n = 0;
for (const s of plan.series) {
  const p = P[s.series];
  if (!p) continue;
  const game = s.rotations.find((r) => r.order === 1);
  if (!game) continue;
  game.cues = p.cues;
  game.adaptation = p.adaptation;
  game.watchFor = p.watchFor;
  n++;
}
writeFileSync(path, JSON.stringify(plan, null, 2), 'utf8');
console.log(`Patched ${n} Game rotations (cues/adaptation/watch-for).`);

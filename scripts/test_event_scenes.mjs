// Checks for the "Explore the seven events" scenes (src/components/athletics/events).
//
//   node scripts/test_event_scenes.mjs
//
// Scrolling drives each scene's frame(p), so a scene must be:
// - pure: the same p always gives the same frame (scrolling back up replays it);
// - continuous: no joint or prop jumps between neighbouring scroll positions;
// - complete: every athlete in the cast is posed at every p and drawn by the art;
// - well formed: a poster inside 0–1, alt text, and the seven events in order.
import { build } from 'esbuild';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = join(root, 'tmp', '.event-scenes-test');
mkdirSync(tmp, { recursive: true });
writeFileSync(join(tmp, 'entry.tsx'), `
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { EventStage } from '../../src/components/athletics/events/Stage'
import { joints } from '../../src/components/athletics/events/rig'
import { scenes, allScenes } from '../../src/components/athletics/events/scenes'
import { ICON_CROP } from '../../src/components/athletics/EventIcon'
import { eventShowcase } from '../../src/data/eventShowcase'
export { scenes, allScenes, joints, ICON_CROP, eventShowcase }
export const markup = (scene: any, p: number) => renderToStaticMarkup(createElement(EventStage, { scene, progress: p }))
`);
await build({ entryPoints: [join(tmp, 'entry.tsx')], bundle: true, platform: 'node', format: 'esm', outfile: join(tmp, 'entry.mjs'), jsx: 'automatic', logLevel: 'error', external: ['react', 'react-dom'], alias: { '@': join(root, 'src') } });
const { scenes, allScenes, joints, ICON_CROP, eventShowcase, markup } = await import(pathToFileURL(join(tmp, 'entry.mjs')).href);
rmSync(tmp, { recursive: true, force: true });

let failed = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${!ok && detail ? ` — ${detail}` : ''}`);
};

const STEPS = 800;
/** Biggest jump allowed between neighbouring frames (1/800 of the scroll), in stage units. */
const MAX_JOINT_STEP = 18;
const MAX_PROP_STEP = 30;

const points = (pose) => {
  const j = joints(pose);
  return [j.head, j.legF.knee, j.legF.foot, j.legB.knee, j.legB.foot, j.armF.elbow, j.armF.hand, j.armB.elbow, j.armB.hand, ...j.torso];
};
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

const SEVEN = ['hurdles', 'long-jump', 'high-jump', 'shot-put', 'discus', 'relays', 'distance'];
check('the club\'s seven events each have a scene', scenes.map((s) => s.id).join() === SEVEN.join(), scenes.map((s) => s.id).join());
check('the seven scenes are in the same order as the section copy', scenes.map((s) => s.id).join() === eventShowcase.map((e) => e.id).join(),
  `${scenes.map((s) => s.id).join()} vs ${eventShowcase.map((e) => e.id).join()}`);
check('every scene has a square icon crop', allScenes.every((s) => /^-?\d+ -?\d+ 440 440$/.test(ICON_CROP[s.id] ?? '')),
  allScenes.filter((s) => !ICON_CROP[s.id]).map((s) => s.id).join());

for (const scene of allScenes) {
  const cast = Object.keys(scene.cast);
  check(`${scene.id}: poster inside 0–1 and alt text`, scene.poster >= 0 && scene.poster <= 1 && scene.alt.length > 20);

  const html = markup(scene, scene.poster);
  const drawn = [...html.matchAll(/data-actor="([^"]+)"/g)].map((m) => m[1]);
  check(`${scene.id}: art draws every athlete in the cast once`, cast.every((id) => drawn.filter((d) => d === id).length === 1) && drawn.length === cast.length,
    `cast ${cast.join()} drawn ${drawn.join()}`);
  const propIds = new Set([...html.matchAll(/data-prop="([^"]+)"/g)].map((m) => m[1]));

  let pure = true;
  let missing = '';
  let worstJoint = { d: 0, at: 0, who: '' };
  let worstProp = { d: 0, at: 0, who: '' };
  let unknownProp = '';
  let prev = null;
  for (let i = 0; i <= STEPS; i++) {
    const p = i / STEPS;
    const f = scene.frame(p);
    if (JSON.stringify(f) !== JSON.stringify(scene.frame(p))) pure = false;
    for (const id of cast) if (!f.actors[id]) missing ||= `${id} at p=${p}`;
    for (const id of Object.keys(f.props ?? {})) if (!propIds.has(id)) unknownProp ||= id;
    const turning = (scene.turns ?? []).some((t) => t > (i - 1) / STEPS && t <= p);
    if (prev && !turning) {
      for (const id of cast) {
        if (!f.actors[id] || !prev.actors[id]) continue;
        const a = points(prev.actors[id]);
        const b = points(f.actors[id]);
        for (let k = 0; k < a.length; k++) {
          const d = dist(a[k], b[k]);
          if (d > worstJoint.d) worstJoint = { d, at: p, who: id };
        }
      }
      for (const [id, s] of Object.entries(f.props ?? {})) {
        const t = prev.props?.[id];
        if (!t) continue;
        // A prop may jump while it's invisible (e.g. reset before it reappears).
        if ((s.opacity ?? 1) < 0.02 || (t.opacity ?? 1) < 0.02) continue;
        const d = Math.hypot((s.x ?? 0) - (t.x ?? 0), (s.y ?? 0) - (t.y ?? 0)) + Math.abs((s.reveal ?? 0) - (t.reveal ?? 0)) * 200;
        if (d > worstProp.d) worstProp = { d, at: p, who: id };
      }
    }
    prev = f;
  }
  check(`${scene.id}: frame(p) is pure`, pure);
  check(`${scene.id}: every athlete posed at every p`, !missing, missing);
  check(`${scene.id}: props in frames exist in the art`, !unknownProp, `no <Prop>/<Trail> for "${unknownProp}"`);
  check(`${scene.id}: athletes move smoothly (max ${worstJoint.d.toFixed(1)} units/step)`, worstJoint.d <= MAX_JOINT_STEP,
    `${worstJoint.who} jumps ${worstJoint.d.toFixed(1)} units near p=${worstJoint.at.toFixed(4)}`);
  check(`${scene.id}: props move smoothly (max ${worstProp.d.toFixed(1)} units/step)`, worstProp.d <= MAX_PROP_STEP,
    `${worstProp.who} jumps ${worstProp.d.toFixed(1)} near p=${worstProp.at.toFixed(4)}`);
}

console.log(failed ? `\n${failed} check(s) failed` : '\nAll event scene checks passed');
process.exit(failed ? 1 : 0);

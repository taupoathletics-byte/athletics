/**
 * Hurdles — sprint in, attack the hurdle with the lead leg, fold the trail leg
 * over, snap down and sprint away. The red arc draws on as the athlete flies.
 */
import { ease, keyed, onGround, seg, stride, track, type Key } from '../kit'
import { LOOKS, type Pose } from '../rig'
import { Prop, Trail, type EventScene } from '../Stage'
import { Backdrop, INK, PAPER, RED, Streaks, TRACK_BLUE } from './shared'

const FLOOR = 430
const HURDLE_X = 430
const STRIDE = 230

/** Ground position of the hips as the athlete runs in and away. */
const runX = (p: number) => track([[0, 60], [0.34, 300]], p, ease.linear)
const awayX = (p: number) => track([[0.66, 560], [1, 760]], p, ease.outCubic)

const run = (x: number, from: number): Pose => {
  const phase = (x - from) / STRIDE + 0.35
  return onGround(stride(phase, { x, y: 300 }, 1, { hair: 18 }), FLOOR)
}

const fly = (x: number, lift: number, pose: Omit<Pose, 'x' | 'y'>): Pose => onGround({ x, y: 300, ...pose }, FLOOR, lift)

function athlete(p: number): Pose {
  if (p <= 0.34) return run(runX(p), 60)
  if (p >= 0.66) return run(awayX(p), 560 - 0.1 * STRIDE)
  const keys: Key[] = [
    { at: 0.34, pose: run(300, 60) },
    // Take-off: lead knee drives up, trail leg pushes off the toes.
    { at: 0.4, pose: fly(335, 0, { lean: 26, neck: -6, legF: [82, 75], legB: [-30, 12], armB: [70, 35], armF: [-45, 80], toeB: 45, toeF: 15, hair: 22 }) },
    // Attack: lead leg reaches for the hurdle, opposite arm with it.
    { at: 0.47, pose: fly(385, 58, { lean: 40, neck: -8, legF: [96, 12], legB: [-40, 70], armB: [110, 10], armF: [-35, 85], toeF: -10, toeB: 40, hair: 32 }), ease: ease.out },
    // Over: lead leg flat, trail leg folds high and wide over the barrier.
    { at: 0.53, pose: fly(HURDLE_X, 82, { lean: 44, neck: -10, legF: [94, 4], legB: [62, 128], armB: [100, 20], armF: [-30, 90], toeF: -10, toeB: 20, hair: 36 }) },
    // Snap down: lead leg cuts to the track, trail knee pulls through.
    { at: 0.6, pose: fly(495, 18, { lean: 30, neck: -6, legF: [18, 6], legB: [78, 115], armB: [30, 80], armF: [20, 85], toeF: 8, toeB: 20, hair: 20 }) },
    { at: 0.66, pose: run(560, 560 - 0.1 * STRIDE), ease: ease.out },
  ]
  return keyed(keys, p)
}

export const hurdles: EventScene = {
  id: 'hurdles',
  cast: { athlete: LOOKS.mana },
  poster: 0.53,
  alt: 'A teenage hurdler in mid-air over a hurdle, lead leg stretched out flat and trail leg folded over the bar',
  frame(p) {
    const a = athlete(p)
    const flying = seg(p, 0.36, 0.62)
    return {
      actors: { athlete: a },
      props: {
        arc: { reveal: ease.inOut(flying), opacity: 1 - seg(p, 0.78, 0.95) },
        streaks: { x: a.x, y: a.y - 40, opacity: p < 0.34 ? seg(p, 0.05, 0.2) : 1 - seg(p, 0.66, 0.8) },
      },
    }
  },
  Art({ Actor, uid }) {
    return (
      <>
        <Backdrop uid={uid} ring={[HURDLE_X, 250, 175]} floor={FLOOR} />
        {/* Track lane */}
        <path d={`M0 ${FLOOR + 2} H800 V500 H0Z`} fill={TRACK_BLUE} opacity={0.6} />
        <path d={`M0 ${FLOOR + 40} H800`} stroke={PAPER} strokeWidth={3} opacity={0.35} />
        <Trail id="arc" d={`M300 ${FLOOR - 70} Q ${HURDLE_X} ${FLOOR - 245} 560 ${FLOOR - 70}`} width={6} opacity={0.9} />
        <Prop id="streaks">
          <Streaks />
        </Prop>
        {/* The hurdle: white frame, red-and-white top board */}
        <g>
          <path d={`M${HURDLE_X - 52} ${FLOOR - 92} V${FLOOR}`} stroke={PAPER} strokeWidth={8} strokeLinecap="round" />
          <path d={`M${HURDLE_X - 52} ${FLOOR} h-22`} stroke={PAPER} strokeWidth={7} strokeLinecap="round" />
        </g>
        <Actor id="athlete" />
        <g>
          <path d={`M${HURDLE_X + 52} ${FLOOR - 92} V${FLOOR}`} stroke={PAPER} strokeWidth={8} strokeLinecap="round" />
          <path d={`M${HURDLE_X + 52} ${FLOOR} h-22`} stroke={PAPER} strokeWidth={7} strokeLinecap="round" />
          <rect x={HURDLE_X - 64} y={FLOOR - 104} width={128} height={18} rx={4} fill={PAPER} stroke={INK} strokeWidth={3} />
          <rect x={HURDLE_X - 40} y={FLOOR - 104} width={26} height={18} fill={RED} />
          <rect x={HURDLE_X + 14} y={FLOOR - 104} width={26} height={18} fill={RED} />
        </g>
      </>
    )
  },
}

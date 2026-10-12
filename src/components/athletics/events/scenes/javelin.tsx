/**
 * Javelin — the thrower in the home page header. Run in with the javelin
 * carried high, draw it back on the cross-over steps, plant and block, then
 * whip the arm through over the shoulder and let go at about 35°.
 *
 * The javelin is drawn here only while it is in the hand. At the release it
 * hands over to <JavelinFlight>, which carries it out of the icon and down the
 * page — RELEASE_POINT and RELEASE_ANGLE say exactly where and how it left.
 */
import { ease, keyed, lerp, onGround, seg, stride, track, type Key } from '../kit'
import { handPosition, joints, LOOKS, reach, type Pose } from '../rig'
import { Prop, type EventScene } from '../Stage'
import { Backdrop, INK, PAPER, RED, TRACK_BLUE } from './shared'

const FLOOR = 430
const STRIDE = 210
/** Scroll progress at which the javelin leaves the hand. */
export const RELEASE = 0.62
/** Length of the javelin, in scene units (it is longer than the athlete is tall). */
export const JAVELIN_LENGTH = 240

// --- the body ---------------------------------------------------------------

const runX = (p: number) => track([[0, 170], [0.3, 300]], p, ease.linear)
const run = (p: number): Pose => {
  const x = runX(p)
  return onGround(stride((x - 170) / STRIDE + 0.2, { x, y: 300 }, 0.7, { hair: 12 }), FLOOR)
}
const body = (x: number, pose: Omit<Pose, 'x' | 'y' | 'armF'>): Pose => onGround({ x, y: 300, armF: [0, 0], ...pose }, FLOOR)

const BODY: Key[] = [
  { at: 0.3, pose: run(0.3) },
  // Cross-over: hips turn side-on, shoulders lean back.
  { at: 0.42, pose: body(338, { lean: -12, neck: -4, armB: [70, 40], legF: [-20, 40], legB: [40, 60], toeF: 20 }) },
  // Plant: the front leg braces long, the rear leg drives.
  { at: 0.52, pose: body(356, { lean: -24, neck: -8, armB: [100, 20], legF: [38, 2], legB: [-28, 44], toeB: 30 }) },
  // Release: the trunk whips forward over the braced leg.
  { at: RELEASE, pose: body(372, { lean: 18, neck: -10, armB: [-20, 60], legF: [24, 4], legB: [-36, 12], toeB: 50 }), ease: ease.out },
  // Follow-through: step through and stop before the line.
  { at: 0.78, pose: body(392, { lean: 34, neck: -6, armB: [-30, 50], legF: [-14, 16], legB: [42, 56] }) },
  { at: 1, pose: body(396, { lean: 6, neck: -4, armB: [-10, 20], legF: [6, 4], legB: [-8, 6] }) },
]

const torso = (p: number): Pose => (p < 0.3 ? run(p) : keyed(BODY, p))

// --- the throwing arm (placed by IK so the javelin travels where we want) ---

/** Where the throwing hand is, relative to the shoulder, through the throw. */
const HAND: [number, number, number][] = [
  // [p, dx, dy] — carried high behind the head, drawn back long, elbow high, released.
  // (Behind the head, not over it: the arm would otherwise cover the face.)
  [0, -42, -62],
  [0.3, -42, -62],
  [0.42, -70, -4],
  [0.52, -72, 2],
  [0.57, -38, -62],
  [RELEASE, 54, -46],
  [0.78, 40, 40],
  [1, 14, 60],
]

function athlete(p: number): Pose {
  const b = torso(p)
  const root = joints(b).armF.root
  const dx = track(HAND.map(([at, x]) => [at, x]), p, ease.inOut)
  const dy = track(HAND.map(([at, , y]) => [at, y]), p, ease.inOut)
  return reach(b, 'F', [root[0] + dx, root[1] + dy])
}

/** The javelin's angle in the hand: nearly level when carried, tilting up to ~35° at release. */
const javelinAngle = (p: number) => track([[0, -12], [0.3, -12], [0.45, -20], [RELEASE, -35]], p, ease.inOut)

const release = athlete(RELEASE)
/** Where the javelin's grip is, in scene units, at the moment it leaves the hand. */
export const RELEASE_POINT = handPosition(release, 'F')
/** Its direction at that moment (degrees; 0 = pointing right, negative = up). */
export const RELEASE_ANGLE = javelinAngle(RELEASE)

export const javelin: EventScene = {
  id: 'javelin',
  cast: { athlete: LOOKS.mana },
  poster: 0.57,
  alt: 'A teenage javelin thrower drawing the javelin back over the shoulder to throw',
  frame(p) {
    const a = athlete(p)
    const [x, y] = handPosition(a, 'F')
    return {
      actors: { athlete: a },
      props: {
        // Held until the release; from then on <JavelinFlight> carries it.
        javelin: { x, y, rot: javelinAngle(p), opacity: p < RELEASE ? 1 : 0 },
        board: { opacity: lerp(0.5, 1, seg(p, 0.4, 0.6)) },
      },
    }
  },
  Art({ Actor, uid }) {
    return (
      <>
        <Backdrop uid={uid} ring={[360, 250, 170]} floor={FLOOR} />
        {/* Runway and the curved throwing arc at its end */}
        <path d={`M0 ${FLOOR + 2} H800 V500 H0Z`} fill={TRACK_BLUE} opacity={0.6} />
        <Prop id="board">
          <path d={`M408 ${FLOOR - 4} q18 20 0 44`} stroke={PAPER} strokeWidth={7} fill="none" strokeLinecap="round" />
        </Prop>
        <Actor id="athlete" />
        <Prop id="javelin">
          <JavelinShape length={JAVELIN_LENGTH} />
        </Prop>
      </>
    )
  },
}

/** A javelin centred on its grip, pointing right: steel tip, white shaft, red cord grip. */
export function JavelinShape({ length, stroke = 6 }: { length: number; stroke?: number }) {
  const h = length / 2
  return (
    <g strokeLinecap="round">
      <path d={`M${-h} 0 H${h - 18}`} stroke={INK} strokeWidth={stroke + 4} />
      <path d={`M${-h} 0 H${h - 18}`} stroke={PAPER} strokeWidth={stroke} />
      <path d={`M${h - 20} 0 L${h} 0`} stroke="#9FB3C8" strokeWidth={stroke} />
      <path d={`M-14 0 H14`} stroke={RED} strokeWidth={stroke + 3} />
    </g>
  )
}

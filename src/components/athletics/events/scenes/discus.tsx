/**
 * Discus — swing the discus back flat in the hand, turn across the circle
 * with the throwing arm long and trailing, then sling it out at shoulder
 * height. The discus spins away on its own curved path into the open sector
 * (the safety cage sits behind the circle), while the athlete reverses at the
 * front of the circle.
 *
 * The 2D trick for the spin: the discus rides an ellipse around the shoulders
 * (the circle the hand really traces, seen side-on), the arm reaches for it
 * with IK, and the athlete turns round while the hand is out of sight on the
 * far side — so the turn reads as a spin rather than a mirror.
 */
import { clamp, ease, keyed, lerp, onGround, quad, seg, type Key } from '../kit'
import { handPosition, joints, LOOKS, reach, type Pose } from '../rig'
import { Prop, Trail, type EventScene, type PropState } from '../Stage'
import { Backdrop, CLUB_BLUE, INK, PAPER, RED } from './shared'

const FLOOR = 430
const CIRCLE_X = 240
// The beats, in scroll progress.
const TURN_FROM = 0.16
const RELEASE = 0.5
/** The hand's angle round the shoulders: 180° = trailing behind (left), 270° = far side. */
const HAND_START = 40
const HAND_WOUND = 180
const HAND_RELEASE = 720
/** The athlete faces left while the hand is between these two far-side passes. */
const TURN_AWAY = 270
const TURN_BACK = 630

/** Hand angle at p: wind back, then one and a half laps to the release. */
function handAngle(p: number): number {
  if (p <= TURN_FROM) return lerp(HAND_START, HAND_WOUND, ease.inOut(seg(p, 0, TURN_FROM)))
  if (p <= RELEASE) return lerp(HAND_WOUND, HAND_RELEASE, ease.in(seg(p, TURN_FROM, RELEASE)) * 0.35 + seg(p, TURN_FROM, RELEASE) * 0.65)
  return HAND_RELEASE + 70 * ease.outCubic(seg(p, RELEASE, 0.66))
}

/** The p where the hand passes a given angle (solved numerically; the path only goes forward). */
function whenHandAt(angle: number): number {
  let lo = TURN_FROM
  let hi = RELEASE
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (handAngle(mid) < angle) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}
const TURNS = [whenHandAt(TURN_AWAY), whenHandAt(TURN_BACK)]

const pose = (x: number, p: Omit<Pose, 'x' | 'y'>): Pose => onGround({ x, y: 300, ...p }, FLOOR)

/** The body, without the throwing arm (that's placed by IK). */
const BODY: Key[] = [
  { at: 0, pose: pose(196, { lean: 6, neck: -4, armF: [0, 0], armB: [70, 30], legF: [24, 14], legB: [-18, 14] }) },
  { at: TURN_FROM, pose: pose(194, { lean: 14, neck: -6, armF: [0, 0], armB: [96, 20], legF: [30, 40], legB: [-24, 34] }) },
  { at: 0.27, pose: pose(214, { lean: 10, neck: -4, armF: [0, 0], armB: [90, 24], legF: [6, 50], legB: [30, 70], toeB: 30 }) },
  { at: 0.38, pose: pose(242, { lean: 8, neck: -4, armF: [0, 0], armB: [86, 24], legF: [34, 44], legB: [-26, 30] }) },
  { at: 0.45, pose: pose(258, { lean: 2, neck: -6, armF: [0, 0], armB: [60, 40], legF: [26, 20], legB: [-30, 16], toeB: 30 }) },
  // Release: tall, hips through, free arm tucks in to block.
  { at: RELEASE, pose: pose(266, { lean: -4, neck: -10, armF: [0, 0], armB: [-20, 70], legF: [12, 4], legB: [-30, 6], toeF: 20, toeB: 50 }) },
  // Reverse at the front of the circle.
  { at: 0.64, pose: pose(282, { lean: 26, neck: -14, armF: [0, 0], armB: [-40, 40], legF: [-30, 20], legB: [40, 44] }) },
  { at: 0.84, pose: pose(276, { lean: 4, neck: -6, armF: [0, 0], armB: [-10, 20], legF: [10, 6], legB: [-10, 6] }) },
  { at: 1, pose: pose(274, { lean: 2, neck: -4, armF: [0, 0], armB: [-8, 18], legF: [8, 4], legB: [-8, 4] }) },
]

const facingLeft = (p: number) => p >= TURNS[0] && p < TURNS[1]

/**
 * Where the discus rides round the shoulders: the hand's circle seen side-on,
 * dipping a little behind the athlete. It stays at least ~28 units from the
 * shoulder all the way round — any closer and the arm has to fold flat, and
 * the upper arm whips round between frames.
 */
function handTarget(body: Pose, angle: number): [number, number] {
  const { armF } = joints(body)
  const [cx, cy] = armF.root
  const r = (angle * Math.PI) / 180
  const drop = 12 * (0.5 - 0.5 * Math.cos(r))
  return [cx + 68 * Math.cos(r), cy + 34 * Math.sin(r) + drop]
}

function athlete(p: number): Pose {
  const body = { ...keyed(BODY, p), flip: facingLeft(p) }
  if (p > 0.66) {
    // After the release the arm just follows through and settles.
    const after = keyed(
      [
        { at: 0.66, pose: { ...body, armF: [64, 10] } },
        { at: 0.84, pose: { ...body, armF: [20, 20] } },
        { at: 1, pose: { ...body, armF: [14, 16] } },
      ],
      p,
    )
    return { ...body, armF: after.armF }
  }
  const held = reach(body, 'F', handTarget(body, handAngle(p)))
  if (p <= RELEASE) return held
  // Past the release the hand carries on along the same arc as it follows through.
  const k = seg(p, RELEASE, 0.66)
  return { ...held, armF: [lerp(held.armF[0], 64, ease.inOut(k)), lerp(held.armF[1], 10, ease.inOut(k))] }
}

// The flight: out of the hand at release, a long gentle curve off the right edge.
const FROM = handPosition(athlete(RELEASE), 'F')
const TO: [number, number] = [880, 210]
const CTRL: [number, number] = [600, FROM[1] - 150]
const FLIGHT = `M${FROM[0].toFixed(1)} ${FROM[1].toFixed(1)} Q${CTRL[0]} ${CTRL[1].toFixed(1)} ${TO[0]} ${TO[1]}`

export const discus: EventScene = {
  id: 'discus',
  cast: { athlete: LOOKS.maia },
  poster: 0.53,
  alt: 'A teenage discus thrower at the front of the circle, arm swinging through, as the spinning discus flies away on a red arc',
  turns: TURNS,
  frame(p) {
    const a = athlete(p)
    const held = p <= RELEASE
    const t = ease.out(seg(p, RELEASE, 0.82))
    const [dx, dy] = held ? handPosition(a, 'F') : quad(t, FROM, CTRL, TO)
    const angle = handAngle(clamp(p, 0, RELEASE))
    // On the far side of the turn the discus is hidden behind the body.
    const behind = held && Math.sin((angle * Math.PI) / 180) < -0.25
    const spin = held ? 0 : 900 * t
    const disc: PropState = { x: dx, y: dy, rot: held ? -8 : -14 + spin, scale: held ? 1 : 1 - 0.25 * t }
    return {
      actors: { athlete: a },
      props: {
        discFront: { ...disc, opacity: behind ? 0 : 1 },
        discBack: { ...disc, opacity: behind ? 1 : 0 },
        swirl: { reveal: ease.inOut(seg(p, TURN_FROM, RELEASE)), opacity: 1 - seg(p, 0.6, 0.78) },
        arc: { reveal: t, opacity: 1 - 0.6 * seg(p, 0.9, 1) },
      },
    }
  },
  Art({ Actor, uid }) {
    const disc = (
      <>
        <ellipse rx={20} ry={8} fill={PAPER} stroke={INK} strokeWidth={4} />
        <ellipse rx={13} ry={4.5} fill="none" stroke={RED} strokeWidth={3} />
      </>
    )
    return (
      <>
        <Backdrop uid={uid} ring={[CIRCLE_X + 20, 240, 175]} floor={FLOOR} />
        {/* The safety cage behind the circle: posts and soft netting */}
        <g stroke={CLUB_BLUE} fill="none" opacity={0.45}>
          {[70, 118, 166].map((x) => (
            <path key={x} d={`M${x} ${FLOOR + 6} V${FLOOR - 250}`} strokeWidth={4} strokeLinecap="round" />
          ))}
          {[0, 1, 2, 3, 4].map((i) => (
            <path key={i} d={`M70 ${FLOOR - 230 + i * 52} Q118 ${FLOOR - 212 + i * 52} 166 ${FLOOR - 230 + i * 52}`} strokeWidth={1.5} />
          ))}
        </g>
        {/* Sector lines into the open field, and the circle */}
        <path d={`M${CIRCLE_X + 40} ${FLOOR + 6} L800 ${FLOOR - 30} M${CIRCLE_X + 40} ${FLOOR + 14} L800 ${FLOOR + 52}`} stroke={PAPER} strokeWidth={3} opacity={0.4} />
        <ellipse cx={CIRCLE_X} cy={FLOOR + 8} rx={118} ry={25} fill="#16365C" stroke={PAPER} strokeWidth={5} opacity={0.9} />
        <Trail id="swirl" d={`M${CIRCLE_X - 70} ${FLOOR - 150} C ${CIRCLE_X - 110} ${FLOOR - 110}, ${CIRCLE_X + 120} ${FLOOR - 100}, ${CIRCLE_X + 100} ${FLOOR - 150} S ${CIRCLE_X - 40} ${FLOOR - 200}, ${CIRCLE_X - 60} ${FLOOR - 160}`} width={4} opacity={0.55} />
        <Trail id="arc" d={FLIGHT} width={6} />
        <Prop id="discBack">{disc}</Prop>
        <Actor id="athlete" />
        <Prop id="discFront">{disc}</Prop>
      </>
    )
  },
}

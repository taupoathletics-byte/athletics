/**
 * Long jump — accelerate down the runway, plant on the white board, drive the
 * free knee and the opposite arm up, hang in the air chest-up, then swing both
 * legs through and cut the sand heels first, hips dropping forward over the
 * feet. The dashed red flight path draws on behind the jumper, sand sprays
 * where she lands and her heel mark stays in the pit.
 *
 * The hips are driven three ways so nothing skates or stalls: a speed profile
 * on the runway and in the air (speed is continuous across every beat), a
 * parabola for height in the air, and a pinned spike while a foot is down
 * (the take-off foot on the board, the heels in the sand).
 */
import { clamp, ease, keyed, lerp, onGround, seg, stride, type Key } from '../kit'
import { joints, LOOKS, type Pair, type Pose } from '../rig'
import { Prop, Trail, usePropInit, type EventScene, type PropState } from '../Stage'
import { Backdrop, INK, PAPER, RED, SAND, Streaks, TRACK_BLUE } from './shared'

const FLOOR = 430
/** The sand sits a little proud of the runway. */
const SAND_TOP = FLOOR - 7
const PIT_FROM = 384
const PIT_TO = 765
const BOARD_X = 300
/** Where the near heel first cuts the sand. */
const HEEL_X = 690
/** How far the heels cut into the sand. */
const CUT = 4
const STRIDE = 220
/** Hip height at the top of the flight. */
const PEAK_Y = 238

// The beats, in scroll progress.
const PLANT = 0.22 // take-off spike lands on the board
const TOE_OFF = 0.31 // leaves the board
const LAND = 0.7 // heels cut the sand

/** A pose with its hips at the origin — the scene positions it later. */
const at0 = (pose: Omit<Pose, 'x' | 'y'>): Pose => ({ x: 0, y: 0, ...pose })

// --- planting a foot --------------------------------------------------------

/**
 * Where a foot is relative to the hips: x at the ball of the take-off (far)
 * spike, or at both heels on landing (the near heel); y at the lowest point.
 */
function spike(pose: Pose, part: 'ball' | 'heels'): Pair {
  const j = joints({ ...pose, x: 0, y: 0 })
  const low = (l: typeof j.legF) => Math.max(l.foot[1], l.toe[1]) + 7 * j.scale
  return part === 'ball' ? [j.legB.toe[0], low(j.legB)] : [j.legF.foot[0], Math.max(low(j.legF), low(j.legB))]
}

/** Moves a pose so its planted foot sits on `at` — a planted foot never skates. */
function pin(pose: Pose, part: 'ball' | 'heels', at: Pair): Pose {
  const [sx, sy] = spike(pose, part)
  return { ...pose, x: at[0] - sx, y: at[1] - sy }
}

/** Distance covered by `p` under a piecewise-linear speed profile `[[p, speed], …]`. */
function travel(knots: [number, number][], p: number): number {
  let d = 0
  for (let i = 1; i < knots.length; i++) {
    const [p0, v0] = knots[i - 1]
    const [p1, v1] = knots[i]
    if (p <= p0) break
    const q = Math.min(p, p1)
    d += ((q - p0) * (v0 + lerp(v0, v1, (q - p0) / (p1 - p0)))) / 2
  }
  return d
}

/** Hip speed (units per unit of p) at the start or end of a pinned stretch. */
const speedOf = (hipX: (p: number) => number, p: number, dir: 1 | -1) => ((hipX(p + dir * 1e-4) - hipX(p)) / 1e-4) * dir

// --- run-up -----------------------------------------------------------------

/** Arms pump against the legs: near arm back as the near knee drives. */
function pump(phase: number, drive: number): Pick<Pose, 'armF' | 'armB'> {
  const s = Math.sin(phase * Math.PI * 2)
  const swing = lerp(40, 62, drive)
  const elbow = lerp(82, 95, drive)
  return { armF: [-s * swing + 10, elbow], armB: [s * swing + 10, elbow] }
}

/** The far (take-off) leg reaches furthest forward at phase 0.75 and strikes as it sweeps back. */
const STRIKE_PHASE = 0.85
const runPose = (phase: number, drive: number): Pose => stride(phase, { x: 0, y: 0 }, drive, { hair: 16, ...pump(phase, drive) })

// --- take-off ---------------------------------------------------------------

const STRIKE = runPose(STRIKE_PHASE, 1)
/** Toe-off: free knee high, take-off leg long behind with the toes pointed, opposite (far) arm punching up. */
const TAKE_OFF = at0({ lean: 4, neck: -12, legF: [98, 108], legB: [-30, 3], armF: [-40, 72], armB: [150, 30], toeF: 25, toeB: 62, hair: 30 })
const PUSH: Key[] = [
  { at: PLANT, pose: STRIKE },
  // Hips run over a firm take-off leg; the free knee whips through; torso comes tall.
  { at: 0.265, pose: at0({ lean: 8, neck: -8, legF: [52, 100], legB: [4, 16], armF: [-10, 85], armB: [80, 70], toeF: 20, toeB: 22, hair: 22 }), ease: ease.linear },
  { at: TOE_OFF, pose: TAKE_OFF, ease: ease.linear },
]
const BOARD: Pair = [BOARD_X, FLOOR]
const pushPose = (p: number) => pin(keyed(PUSH, p), 'ball', BOARD)
const AT_PLANT = pushPose(PLANT)
const AT_TOE_OFF = pushPose(TOE_OFF)

/** Run-up speed: jogging at p = 0, fastest at the board. */
const RUN: [number, number][] = [
  [0, 320],
  [PLANT, speedOf((p) => pushPose(p).x, PLANT, 1)],
]
const runX = (p: number) => AT_PLANT.x - (travel(RUN, PLANT) - travel(RUN, p))

function runUp(p: number): Pose {
  const x = runX(p)
  const drive = lerp(0.55, 1, ease.out(seg(p, 0, PLANT - 0.02)))
  const phase = STRIKE_PHASE + (x - AT_PLANT.x) / STRIDE
  return onGround({ ...runPose(phase, drive), x }, FLOOR)
}

// --- flight -----------------------------------------------------------------

/** Heels first: legs long and together, toes up, arms reaching past the knees. */
const CONTACT = at0({ lean: 34, neck: 4, legF: [72, 6], legB: [70, 10], armF: [104, 8], armB: [92, 12], toeF: -20, toeB: -18, hair: 12 })

const FLIGHT: Key[] = [
  { at: TOE_OFF, pose: TAKE_OFF },
  // Stride in the air: free knee forward, take-off leg trailing, far arm reaching.
  { at: 0.4, pose: at0({ lean: 0, neck: -10, legF: [88, 86], legB: [-24, 58], armF: [-30, 40], armB: [128, 12], toeF: 25, toeB: 40, hair: 38 }), ease: ease.out },
  // Gather at the top: take-off leg swings through, chest up, arms climb.
  { at: 0.5, pose: at0({ lean: -10, neck: -8, legF: [92, 58], legB: [62, 98], armF: [118, 12], armB: [176, 10], toeF: 15, toeB: 25, hair: 44 }) },
  // Sail: both legs out in front, chest up, arms spread high.
  { at: 0.58, pose: at0({ lean: -16, neck: -6, legF: [92, 18], legB: [82, 30], armF: [148, 10], armB: [205, 8], toeF: 0, toeB: 5, hair: 40 }), ease: ease.linear },
  // Jack-knife: fold forward over the legs, arms sweep down past the knees.
  { at: 0.65, pose: at0({ lean: 22, neck: 0, legF: [84, 8], legB: [80, 12], armF: [122, 8], armB: [128, 10], toeF: -12, toeB: -10, hair: 28 }) },
  { at: LAND, pose: CONTACT },
]

// --- landing ----------------------------------------------------------------

const LANDING: Key[] = [
  { at: LAND, pose: CONTACT },
  // Absorb: knees give, hips keep travelling.
  { at: 0.75, pose: at0({ lean: 44, neck: 6, legF: [100, 86], legB: [98, 90], armF: [112, 18], armB: [96, 24], toeF: -6, toeB: -6, hair: 4 }), ease: ease.out },
  // Hips over the feet: low crouch, chest and arms forward — never falling back.
  { at: 0.82, pose: at0({ rot: 6, lean: 42, neck: 4, legF: [118, 140], legB: [116, 142], armF: [104, 30], armB: [90, 36], hair: 0 }) },
  { at: 0.92, pose: at0({ lean: 20, neck: -2, legF: [44, 72], legB: [40, 70], armF: [40, 40], armB: [28, 40], hair: -4 }) },
  // Up and proud: near fist raised.
  { at: 1, pose: at0({ lean: 4, neck: -6, legF: [6, 10], legB: [0, 8], armF: [168, 30], armB: [14, 20], hair: -2 }), ease: ease.out },
]
/** Heels slide forward a touch as they cut in. */
const heelSlide = (p: number) => 16 * ease.out(seg(p, LAND, 0.77))
const landPose = (p: number) => pin(keyed(LANDING, p), 'heels', [HEEL_X + heelSlide(p), SAND_TOP + CUT])

const X_TO = AT_TOE_OFF.x
const Y_TO = AT_TOE_OFF.y
const X_LAND = landPose(LAND).x
const Y_LAND = landPose(LAND).y

/**
 * Flight speed: carry the board speed off the ground, slow-mo through the
 * hang (scroll users linger here), quicken into the sand. The hang speed is
 * solved so the flight ends exactly where the heels meet the sand.
 */
const flyShape = (hang: number): [number, number][] => [
  [TOE_OFF, speedOf((p) => pushPose(p).x, TOE_OFF, -1)],
  [0.38, hang * 2.2],
  [0.46, hang],
  [0.58, hang * 0.9],
  [0.65, hang * 1.8],
  [LAND, speedOf((p) => landPose(p).x, LAND, 1)],
]
const flyBase = travel(flyShape(0), LAND)
const HANG = (X_LAND - X_TO - flyBase) / (travel(flyShape(1), LAND) - flyBase)
const FLY = flyShape(HANG)

// Hip height in the air: one parabola from the board to the sand through PEAK_Y.
const rootA = Math.sqrt(Y_TO - PEAK_Y)
const rootB = Math.sqrt(Y_LAND - PEAK_Y)
const X_PEAK = X_TO + (rootA / (rootA + rootB)) * (X_LAND - X_TO)
const K = (Y_TO - PEAK_Y) / (X_PEAK - X_TO) ** 2
const flightY = (x: number) => PEAK_Y + K * (x - X_PEAK) ** 2

/** The same parabola as one quadratic Bézier, for the trail. */
const TRAIL_LIFT = -18
const ctrlX = (X_TO + X_LAND) / 2
const ctrlY = Y_TO + 2 * K * (X_TO - X_PEAK) * (ctrlX - X_TO)
const TRAIL_D = `M${X_TO.toFixed(1)} ${(Y_TO + TRAIL_LIFT).toFixed(1)} Q${ctrlX.toFixed(1)} ${(ctrlY + TRAIL_LIFT).toFixed(1)} ${X_LAND.toFixed(1)} ${(Y_LAND + TRAIL_LIFT).toFixed(1)}`

/** Arc length along the flight, so the trail's tip stays at the hips. */
const ARC = (() => {
  const n = 64
  const out = [0]
  for (let i = 1; i <= n; i++) {
    const x0 = lerp(X_TO, X_LAND, (i - 1) / n)
    const x1 = lerp(X_TO, X_LAND, i / n)
    out.push(out[i - 1] + Math.hypot(x1 - x0, flightY(x1) - flightY(x0)))
  }
  return out
})()
function trailReveal(x: number): number {
  const f = clamp((x - X_TO) / (X_LAND - X_TO)) * (ARC.length - 1)
  const i = Math.min(Math.floor(f), ARC.length - 2)
  return lerp(ARC[i], ARC[i + 1], f - i) / ARC[ARC.length - 1]
}

const flightX = (p: number) => X_TO + travel(FLY, p)

// --- the athlete ------------------------------------------------------------

function athlete(p: number): Pose {
  if (p <= PLANT) return runUp(p)
  if (p <= TOE_OFF) return pushPose(p)
  if (p <= LAND) {
    const x = flightX(p)
    return { ...keyed(FLIGHT, p), x, y: flightY(x) }
  }
  return landPose(p)
}

// --- sand -------------------------------------------------------------------

/** Deterministic 0 → 1 noise from an index. */
const hash = (i: number, k: number) => {
  const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453
  return s - Math.floor(s)
}
const SAND_LIGHT = '#EBDCC8'
const SAND_DARK = '#B99B7E'
const GRAINS = Array.from({ length: 16 }, (_, i) => ({
  // Mostly kicked forward and up; a few fly back towards the board.
  dx: lerp(-70, 150, hash(i, 1)) * (i % 5 === 0 ? -0.6 : 1),
  h: lerp(26, 96, hash(i, 2)),
  r: lerp(2.2, 5, hash(i, 3)),
  delay: hash(i, 4) * 0.02,
  dur: lerp(0.08, 0.14, hash(i, 5)),
  fill: i % 3 === 0 ? SAND_LIGHT : i % 3 === 1 ? SAND : SAND_DARK,
  front: i % 2 === 0,
}))

function grain(i: number, p: number) {
  const g = GRAINS[i]
  const t = seg(p, LAND + g.delay, LAND + g.delay + g.dur)
  const x = HEEL_X + 4 + g.dx * ease.out(t)
  const y = SAND_TOP - 2 - g.h * 4 * t * (1 - t)
  return { x, y, opacity: seg(p, LAND + g.delay, LAND + g.delay + 0.008) * (1 - seg(t, 0.8, 1)) }
}

export const longJump: EventScene = {
  id: 'long-jump',
  cast: { athlete: LOOKS.aria },
  poster: 0.6,
  alt: 'A teenage long jumper sailing through the air above the sandpit, legs swinging forward and arms reaching, a dashed red arc tracing her flight from the take-off board',
  frame(p) {
    const a = athlete(p)
    const props: Record<string, PropState> = {
      flight: {
        reveal: p <= TOE_OFF ? 0 : p >= LAND ? 1 : trailReveal(a.x),
        opacity: seg(p, TOE_OFF, TOE_OFF + 0.01) * (1 - 0.45 * seg(p, 0.86, 1)),
      },
      streaks: { x: a.x, y: a.y - 46, opacity: seg(p, 0.04, 0.16) * (1 - seg(p, 0.36, 0.46)) },
      groove: { reveal: seg(p, LAND, 0.77), opacity: seg(p, LAND, LAND + 0.01) },
      spray: {
        x: HEEL_X + 6,
        y: SAND_TOP,
        scale: lerp(0.35, 1.15, ease.outCubic(seg(p, LAND, 0.8))),
        opacity: seg(p, LAND, LAND + 0.012) * (1 - seg(p, 0.74, 0.84)),
      },
    }
    GRAINS.forEach((_, i) => (props[`grain${i}`] = grain(i, p)))
    return { actors: { athlete: a }, props }
  },
  Art({ Actor, uid }) {
    const grains = (front: boolean) =>
      GRAINS.map((g, i) =>
        g.front === front ? (
          <Prop key={i} id={`grain${i}`}>
            <circle r={g.r} fill={g.fill} stroke={INK} strokeWidth={1} strokeOpacity={0.35} />
          </Prop>
        ) : null,
      )
    return (
      <>
        <Backdrop uid={uid} ring={[560, 230, 180]} floor={FLOOR} />
        {/* Runway */}
        <path d={`M0 ${FLOOR + 2} H${PIT_FROM} V500 H0Z`} fill={TRACK_BLUE} opacity={0.6} />
        <path d={`M0 ${FLOOR + 40} H${PIT_FROM - 20}`} stroke={PAPER} strokeWidth={3} opacity={0.35} />
        {/* Take-off board, flush with the runway */}
        <rect x={BOARD_X - 16} y={FLOOR - 1} width={30} height={9} rx={1.5} fill={PAPER} stroke={INK} strokeWidth={2} />
        {/* The pit: sand slightly raised, a lighter rim, rake lines */}
        <path d={`M${PIT_FROM - 12} ${FLOOR + 12} L${PIT_FROM + 6} ${SAND_TOP} H${PIT_TO - 14} L${PIT_TO + 8} ${FLOOR + 12}Z`} fill={SAND} />
        <path d={`M${PIT_FROM + 10} ${SAND_TOP + 2.5} H${PIT_TO - 18}`} stroke={SAND_LIGHT} strokeWidth={5} strokeLinecap="round" />
        <path d={`M${PIT_FROM + 8} ${FLOOR + 6} H${PIT_TO - 8}`} stroke={INK} strokeWidth={3} strokeDasharray="7 12" opacity={0.22} />
        <DashedTrail id="flight" d={TRAIL_D} uid={uid} />
        <Prop id="streaks">
          <Streaks />
        </Prop>
        {grains(false)}
        <Actor id="athlete" />
        {/* Sand in front of the heels, so they cut in rather than float */}
        <path d={`M${PIT_FROM + 2} ${SAND_TOP + 3} H${PIT_TO - 10} L${PIT_TO + 8} ${FLOOR + 12} H${PIT_FROM - 12}Z`} fill={SAND} />
        <Trail id="groove" d={`M${(HEEL_X - 8).toFixed(1)} ${SAND_TOP + 1} H${(HEEL_X + 22).toFixed(1)}`} stroke={SAND_DARK} width={5} />
        <Prop id="spray">
          <g fill="none" stroke={SAND_LIGHT} strokeLinecap="round">
            <path d="M0 0 Q 18 -40 52 -62" strokeWidth={5} opacity={0.75} />
            <path d="M6 0 Q 40 -24 84 -34" strokeWidth={4} opacity={0.6} />
            <path d="M-4 0 Q -10 -30 -26 -46" strokeWidth={4} opacity={0.5} />
            <path d="M10 0 Q 54 -8 100 -8" strokeWidth={3} opacity={0.45} />
          </g>
        </Prop>
        {grains(true)}
      </>
    )
  },
}

/** A dashed red line that draws on: the dashes are masked by a path driven like a Trail. */
function DashedTrail({ id, d, uid }: { id: string; d: string; uid: string }) {
  const init = usePropInit(id)
  const mask = `${uid}-${id}-mask`
  return (
    <>
      <mask id={mask} maskUnits="userSpaceOnUse" x={0} y={0} width={800} height={500}>
        <path
          data-prop={id}
          d={d}
          pathLength={1}
          fill="none"
          stroke="#fff"
          strokeWidth={16}
          strokeDasharray="1 1"
          strokeDashoffset={init['stroke-dashoffset'] ?? 1}
          opacity={init.opacity}
        />
      </mask>
      <path d={d} fill="none" stroke={RED} strokeWidth={5} strokeLinecap="round" strokeDasharray="14 13" mask={`url(#${mask})`} />
    </>
  )
}

export const __debug = { AT_PLANT, AT_TOE_OFF, X_LAND, Y_LAND, HANG, FLY, RUN, X_PEAK, flyBase }

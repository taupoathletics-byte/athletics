/**
 * High jump — a Fosbury flop over a red elastic (the club uses an elastic,
 * never a rigid pole). Run in, plant and drive the knee up, turn the back to
 * the bar at the top of the take-off, arch over with the hips highest, flick
 * the legs up and over, and land on the upper back on the thick mat, which
 * gives under the athlete.
 *
 * The turn is a real change of facing: the rig mirrors the athlete at the top
 * of the take-off, when arms are up and legs together so it reads as a
 * twist rather than a jump-cut.
 */
import { ease, keyed, lerp, onGround, quad, seg, stride, type Key } from '../kit'
import { LOOKS, type Pose } from '../rig'
import { Prop, Trail, type EventScene } from '../Stage'
import { Backdrop, INK, MAT as MAT_BLUE, PAPER, RED } from './shared'

const FLOOR = 430
const STRIDE = 200
const MAT_TOP = FLOOR - 58
const MAT = [330, 700] as const
const POSTS = [372, 600] as const
const BAR_Y = FLOOR - 172
// The beats, in scroll progress.
const PLANT = 0.3
const TURN = 0.4
const OVER = 0.52
const TOUCH = 0.66

const RUN_FROM = -20
const runX = (p: number) => lerp(RUN_FROM, 300, ease.linear(seg(p, 0, PLANT)))
const run = (p: number): Pose => {
  const x = runX(p)
  return onGround(stride((x - RUN_FROM) / STRIDE, { x, y: 300 }, 0.8, { lean: 4, hair: 16 }), FLOOR)
}

/** Hip path through the air: take-off → over the bar → onto the mat. */
const TAKEOFF: [number, number] = [312, FLOOR - 128]
const CREST: [number, number] = [480, BAR_Y - 60]
const LANDING: [number, number] = [572, MAT_TOP - 50]
const CTRL: [number, number] = [CREST[0] - 10, 2 * CREST[1] - (TAKEOFF[1] + LANDING[1]) / 2]
const flightHips = (t: number) => quad(t, TAKEOFF, CTRL, LANDING)

const air = (t: number, pose: Omit<Pose, 'x' | 'y'>): Pose => {
  const [x, y] = flightHips(t)
  return { x, y, ...pose }
}

const KEYS: Key[] = [
  { at: PLANT, pose: run(PLANT) },
  // Plant: lean back slightly away from the bar, take-off leg long.
  { at: 0.34, pose: onGround({ x: 306, y: 300, lean: -10, neck: -6, legF: [70, 96], legB: [-16, 6], armF: [60, 70], armB: [50, 70], toeB: 20, hair: 10 }, FLOOR) },
  // Drive: knee and both arms up, rising off the foot.
  { at: TURN - 0.002, pose: { x: 316, y: FLOOR - 150, lean: 0, neck: 0, legF: [8, 20], legB: [-4, 10], armF: [172, 4], armB: [168, 4], toeF: 40, toeB: 50, hair: 30 } },
  // Turned: back to the bar now (flipped), the same tall shape.
  { at: TURN, pose: { x: 316, y: FLOOR - 150, lean: 0, neck: 0, legF: [8, 20], legB: [-4, 10], armF: [172, 4], armB: [168, 4], toeF: 40, toeB: 50, hair: 30, flip: true } },
  // Lay back: head and shoulders go over first.
  { at: 0.46, pose: { ...air(0.42, { rot: -62, lean: -18, neck: -20, legF: [10, 70], legB: [4, 80], armF: [40, 40], armB: [30, 40], toeF: 30, toeB: 30, hair: 50 }), flip: true } },
  // Over: hips highest above the bar, back arched, shins hanging.
  { at: OVER, pose: { ...air(0.62, { rot: -96, lean: -36, neck: -26, legF: [24, 104], legB: [18, 112], armF: [20, 20], armB: [12, 24], toeF: 20, toeB: 20, hair: 70 }), flip: true } },
  // Flick: chin to chest, legs kick up and over.
  { at: 0.59, pose: { ...air(0.84, { rot: -118, lean: 0, neck: 30, legF: [70, 8], legB: [62, 12], armF: [30, 20], armB: [24, 20], toeF: 10, toeB: 10, hair: 30 }), flip: true } },
  // Land on the upper back, legs still up.
  { at: TOUCH, pose: { ...air(1, { rot: -124, lean: 10, neck: 30, legF: [80, 20], legB: [74, 26], armF: [60, 30], armB: [50, 30], hair: 10 }), flip: true }, ease: ease.out },
  // Roll back down flat on the mat.
  { at: 0.8, pose: { x: 590, y: MAT_TOP - 22, rot: -100, lean: 0, neck: 20, legF: [50, 60], legB: [44, 66], armF: [80, 20], armB: [70, 20], hair: 0, flip: true } },
  { at: 1, pose: { x: 592, y: MAT_TOP - 21, rot: -92, lean: 0, neck: 14, legF: [40, 70], legB: [36, 74], armF: [90, 30], armB: [80, 30], hair: 0, flip: true } },
]

const athlete = (p: number): Pose => (p < PLANT ? run(p) : keyed(KEYS, p))

const FLIGHT = (() => {
  const pts = Array.from({ length: 13 }, (_, i) => flightHips(i / 12).map((v) => v.toFixed(1)).join(' '))
  return `M${pts[0]} L${pts.slice(1).join(' L')}`
})()

export const highJump: EventScene = {
  id: 'high-jump',
  cast: { athlete: LOOKS.lily },
  poster: 0.48,
  alt: 'A teenage high jumper arched backwards over a red elastic bar, hips highest, above a blue landing mat',
  turns: [TURN],
  frame(p) {
    const squash = Math.sin(Math.PI * seg(p, TOUCH - 0.01, TOUCH + 0.12))
    return {
      actors: { athlete: athlete(p) },
      props: {
        arc: { reveal: ease.inOut(seg(p, 0.36, TOUCH)), opacity: 1 - 0.7 * seg(p, 0.8, 1) },
        // The mat gives under the landing and springs back.
        matTop: { x: 0, y: 7 * squash, scale: 1 },
        // The elastic flexes a touch as the athlete passes over it.
        bar: { x: 0, y: 4 * Math.sin(Math.PI * seg(p, 0.48, 0.6)) },
      },
    }
  },
  Art({ Actor, uid }) {
    const sag = (y: number) => `M${POSTS[0]} ${y} Q${(POSTS[0] + POSTS[1]) / 2} ${y + 12} ${POSTS[1]} ${y}`
    return (
      <>
        <Backdrop uid={uid} ring={[470, 230, 185]} floor={FLOOR} />
        {/* The far upright */}
        <path d={`M${POSTS[1]} ${FLOOR} V${BAR_Y - 40}`} stroke={PAPER} strokeWidth={7} strokeLinecap="round" opacity={0.9} />
        {/* The landing mat: a thick blue block with a lighter top face */}
        <rect x={MAT[0]} y={MAT_TOP + 8} width={MAT[1] - MAT[0]} height={FLOOR - MAT_TOP - 8} rx={8} fill={MAT_BLUE} />
        <Prop id="matTop">
          <rect x={MAT[0] - 6} y={MAT_TOP} width={MAT[1] - MAT[0] + 12} height={18} rx={9} fill="#8FA9C6" />
        </Prop>
        <path d={`M${MAT[0]} ${FLOOR - 26} H${MAT[1]}`} stroke={PAPER} strokeWidth={3} opacity={0.35} />
        <Trail id="arc" d={FLIGHT} width={4} opacity={0.75} />
        {/* The elastic: a red cord with a little sag, never a rigid pole */}
        <Prop id="bar">
          <path d={sag(BAR_Y)} stroke={RED} strokeWidth={6} fill="none" strokeLinecap="round" />
        </Prop>
        <Actor id="athlete" />
        {/* The near upright stands in front of everything */}
        <path d={`M${POSTS[0]} ${FLOOR} V${BAR_Y - 40}`} stroke={PAPER} strokeWidth={8} strokeLinecap="round" />
        <circle cx={POSTS[0]} cy={BAR_Y} r={6} fill={PAPER} stroke={INK} strokeWidth={2} />
      </>
    )
  },
}

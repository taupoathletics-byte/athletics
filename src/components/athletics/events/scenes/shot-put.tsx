/**
 * Shot put — settle at the back of the circle with the shot tucked under the
 * jaw, shift low across the circle, then drive up through the legs and punch
 * the shot away at about 40°. It's a push, not a throw: the elbow stays high
 * behind the shot until the arm straightens. The shot then flies on its own
 * parabola into the empty sector, thuds down with a puff of dust and a red
 * marker, while the athlete reverses on the stop-board and stays in the circle.
 */
import { ease, keyed, lerp, onGround, quad, seg, type Key } from '../kit'
import { handPosition, joints, LOOKS, reach, type Pose } from '../rig'
import { Prop, Trail, type EventScene, type PropState } from '../Stage'
import { Backdrop, INK, PAPER, RED } from './shared'

const FLOOR = 430
const CIRCLE_X = 255
/** Where the shot lands, out in the sector. */
const LAND: [number, number] = [722, FLOOR - 8]
// The beats, in scroll progress.
const RELEASE = 0.5
const TOUCHDOWN = 0.8

const pose = (x: number, p: Omit<Pose, 'x' | 'y'>): Pose => onGround({ x, y: 300, ...p }, FLOOR)

/** The putting hand tucked under the jaw, elbow lifted high behind the shot. */
function atNeck(x: number, p: Omit<Pose, 'x' | 'y' | 'armF'>): Pose {
  const body = pose(x, { ...p, armF: [0, 0] })
  const { head, headAngle } = joints(body)
  const a = (headAngle * Math.PI) / 180
  // A point under the jaw, in the head's own frame (it tilts with the head).
  const jaw: [number, number] = [head[0] + 12 * Math.cos(a) - 24 * Math.sin(a), head[1] + 12 * Math.sin(a) + 24 * Math.cos(a)]
  const held = reach(body, 'F', jaw, 'high')
  // Keep the shoulder angle in the 'behind and up' range (e.g. 220°, not -140°)
  // so the punch to the release angle (~142°) goes up over the shoulder.
  const [a0, e0] = held.armF
  return { ...held, armF: [a0 < 0 ? a0 + 360 : a0, e0] }
}

const KEYS: Key[] = [
  // Set: tall at the back of the circle, shot at the neck, free arm up for balance.
  { at: 0, pose: atNeck(175, { lean: -4, neck: 0, armB: [150, 20], legF: [22, 4], legB: [-14, 4] }) },
  // Load: sit back over the rear leg, front leg reaching for the stop-board.
  { at: 0.14, pose: atNeck(178, { lean: -22, neck: -6, armB: [120, 30], legF: [56, 6], legB: [46, 104], toeF: 20 }) },
  // Shift: stay low and move across the circle.
  { at: 0.3, pose: atNeck(232, { lean: -24, neck: -6, armB: [112, 34], legF: [58, 6], legB: [50, 108], toeF: 20 }) },
  // Drive: legs extend, hips come through, elbow lifts behind the shot.
  { at: 0.43, pose: atNeck(258, { lean: -6, neck: -4, armB: [70, 40], legF: [36, 2], legB: [6, 40], toeB: 30 }), ease: ease.in },
  // Release: tall on the toes, putting arm long at ~40°, free arm blocks low.
  { at: RELEASE, pose: pose(282, { lean: 12, neck: -12, armF: [142, 2], armB: [-28, 50], legF: [16, 0], legB: [-24, 4], toeF: 30, toeB: 50 }), ease: ease.out },
  // Reverse: feet switch on the stop-board, weight low so nothing crosses the circle.
  { at: 0.64, pose: pose(300, { lean: 32, neck: -16, armF: [74, 12], armB: [-46, 36], legF: [-34, 22], legB: [44, 46], toeF: 30 }) },
  // Recover tall in the circle and watch the shot land.
  { at: 0.86, pose: pose(292, { lean: 2, neck: -6, armF: [22, 18], armB: [-12, 20], legF: [10, 4], legB: [-10, 4] }) },
  { at: 1, pose: pose(290, { lean: 0, neck: -4, armF: [16, 16], armB: [-8, 18], legF: [8, 4], legB: [-8, 4] }) },
]

const athlete = (p: number) => keyed(KEYS, p)

// The flight: a parabola from the hand at release, launched at about 40°.
const FROM = handPosition(athlete(RELEASE), 'F')
const RISE = (LAND[0] - FROM[0]) / 2 * Math.tan((40 * Math.PI) / 180)
const CTRL: [number, number] = [(FROM[0] + LAND[0]) / 2, FROM[1] - RISE]
const FLIGHT = `M${FROM[0].toFixed(1)} ${FROM[1].toFixed(1)} Q${CTRL[0].toFixed(1)} ${CTRL[1].toFixed(1)} ${LAND[0]} ${LAND[1]}`

/** Dust kicked up where the shot lands: small puffs drifting out and fading. */
const DUST = [-34, -18, 0, 16, 30].map((dx, i) => ({ dx, dy: -10 - ((i * 7) % 12), r: 5 + (i % 3) * 2 }))

export const shotPut: EventScene = {
  id: 'shot-put',
  cast: { athlete: LOOKS.tama },
  poster: 0.55,
  alt: 'A teenage shot putter at the front of the circle, putting arm fully extended, as the shot flies away on a red arc',
  frame(p) {
    const a = athlete(p)
    const t = seg(p, RELEASE, TOUCHDOWN)
    const [sx, sy] = p < RELEASE ? handPosition(a, 'F') : quad(t, FROM, CTRL, LAND)
    const settle = seg(p, TOUCHDOWN, 0.92)
    const props: Record<string, PropState> = {
      shot: { x: sx, y: sy + (p >= TOUCHDOWN ? 3 * ease.out(settle) : 0) },
      arc: { reveal: t, opacity: 1 - 0.65 * seg(p, 0.9, 1) },
      marker: { x: LAND[0], y: FLOOR + 6, scale: ease.outCubic(seg(p, 0.84, 0.94)), opacity: seg(p, 0.84, 0.9) },
    }
    DUST.forEach((d, i) => {
      const k = seg(p, TOUCHDOWN, TOUCHDOWN + 0.12)
      props[`dust${i}`] = {
        x: LAND[0] + d.dx * ease.out(k),
        y: LAND[1] + 4 + d.dy * ease.out(k),
        scale: lerp(0.4, 1.3, k),
        opacity: p < TOUCHDOWN ? 0 : 0.7 * (1 - k),
      }
    })
    return { actors: { athlete: a }, props }
  },
  Art({ Actor, uid }) {
    return (
      <>
        <Backdrop uid={uid} ring={[CIRCLE_X + 10, 250, 175]} floor={FLOOR} />
        {/* The landing sector fanning out to the right, with distance arcs */}
        <path d={`M${CIRCLE_X + 40} ${FLOOR + 6} L800 ${FLOOR - 26} M${CIRCLE_X + 40} ${FLOOR + 14} L800 ${FLOOR + 48}`} stroke={PAPER} strokeWidth={3} opacity={0.4} />
        {[520, 610, 700].map((x) => (
          <path key={x} d={`M${x} ${FLOOR - 12} q12 18 0 40`} stroke={PAPER} strokeWidth={2} fill="none" opacity={0.25} />
        ))}
        {/* The circle, in perspective, and the curved stop-board at its front */}
        <ellipse cx={CIRCLE_X} cy={FLOOR + 8} rx={112} ry={24} fill="#16365C" stroke={PAPER} strokeWidth={5} opacity={0.9} />
        <path d={`M${CIRCLE_X + 98} ${FLOOR - 6} q22 14 0 30`} stroke={PAPER} strokeWidth={10} fill="none" strokeLinecap="round" />
        <Trail id="arc" d={FLIGHT} width={6} />
        <Prop id="marker">
          <path d="M0 0 V-34" stroke={PAPER} strokeWidth={3} strokeLinecap="round" />
          <path d="M0 -34 L18 -28 L0 -22Z" fill={RED} />
        </Prop>
        {DUST.map((d, i) => (
          <Prop key={i} id={`dust${i}`}>
            <circle r={d.r} fill="#C9B79C" />
          </Prop>
        ))}
        <Actor id="athlete" />
        <Prop id="shot">
          <circle r={14} fill={PAPER} stroke={INK} strokeWidth={4} />
          <circle cx={-4} cy={-4} r={4} fill="#6683A3" />
        </Prop>
      </>
    )
  },
}

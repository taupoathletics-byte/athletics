/**
 * Distance — two runners at a strong, even distance pace on the bend. They
 * follow the curve of their lane away into the distance, getting smaller as
 * they go, and the second runner moves up onto the leader's shoulder. Stride
 * phase comes from the ground each runner covers (allowing for perspective),
 * so feet never skate; lane dashes drift by to keep the sense of pace.
 */
import { clamp, ease, lerp, onGround, seg, stride } from '../kit'
import { LOOKS, type Pose } from '../rig'
import { Prop, Trail, type EventScene } from '../Stage'
import { Backdrop, CLUB_BLUE, PAPER, RED, Streaks } from './shared'

/** A lane edge round the bend: a quadratic curve from the near left to the far right. */
type Curve = [[number, number], [number, number], [number, number]]
const lane = (k: number): Curve => [[-60, 520 - k * 30], [330, 312 - k * 22], [860, 300 - k * 14]]
const at = ([a, c, b]: Curve, t: number): [number, number] => {
  const u = 1 - t
  return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]
}
const d = (c: Curve) => `M${c[0].join(' ')} Q${c[1].join(' ')} ${c[2].join(' ')}`

/** The runners' lines: the leader on the inside, the chaser one lane out (nearer the camera). */
const INSIDE = lane(0.55)
const OUTSIDE = lane(-1.05)
/** Size with depth: full size near the camera, smaller round the bend. */
const depth = (t: number) => lerp(1.0, 0.6, ease.inOut(clamp(t)))
/** Stride length in stage units at full size. */
const STRIDE = 210

/** Ground covered along a line up to t, measured at full size (so phase ignores perspective). */
function groundCovered(line: Curve, t: number): number {
  let s = 0
  const n = 60
  let prev = at(line, 0)
  for (let i = 1; i <= n; i++) {
    const ti = (t * i) / n
    const cur = at(line, ti)
    s += Math.hypot(cur[0] - prev[0], cur[1] - prev[1]) / depth(ti)
    prev = cur
  }
  return s
}

function runner(line: Curve, t: number, phaseOffset: number, near = 0): Pose {
  const [x, y] = at(line, t)
  const scale = depth(t) + near
  const pose = stride(groundCovered(line, t) / STRIDE + phaseOffset, { x, y: y - 120 }, 0.25, { scale, lean: 9, neck: -2 })
  return onGround(pose, y)
}

// Where each runner is along their line (0 = near left, 1 = far right). The
// chaser starts a few strides down and finishes on the leader's shoulder.
const frontT = (p: number) => lerp(0.18, 0.62, p)
const backT = (p: number) => lerp(0.04, 0.58, ease.inOut(p) * 0.55 + p * 0.45)

export const distance: EventScene = {
  id: 'distance',
  cast: { front: LOOKS.aria, back: LOOKS.mana },
  poster: 0.42,
  alt: 'Two teenage distance runners side by side on the bend of the track, one moving up on the other’s shoulder',
  frame(p) {
    const front = runner(INSIDE, frontT(p), 0.15)
    const back = runner(OUTSIDE, backT(p), 0.62, 0.05)
    return {
      actors: { front, back },
      props: {
        dashes: { x: -60 * p },
        streaks: { x: front.x, y: front.y - 30 * (front.scale ?? 1), scale: front.scale, opacity: 0.85 * seg(p, 0.05, 0.2) },
        pace: { reveal: ease.inOut(seg(p, 0, 0.9)), opacity: 0.7 },
      },
    }
  },
  Art({ Actor, uid }) {
    const edges = [-1, 0, 1, 2, 3].map(lane)
    return (
      <>
        <Backdrop uid={uid} ring={[470, 220, 180]} floor={600} />
        {/* The track surface round the bend, with lane lines and a red inside kerb */}
        <path d={`${d(edges[0])} L860 560 L-60 560Z`} fill="#16365C" opacity={0.75} />
        <path d={`${d(edges[4])} L${edges[0][2].join(' ')} Q${edges[0][1].join(' ')} ${edges[0][0].join(' ')}Z`} fill="#1E4572" opacity={0.85} />
        {edges.map((c, i) => (
          <path key={i} d={d(c)} stroke={i === 4 ? RED : PAPER} strokeWidth={i === 4 ? 5 : 2.5} fill="none" opacity={i === 4 ? 0.9 : 0.45} />
        ))}
        {/* Lane dashes that drift by */}
        <Prop id="dashes">
          {Array.from({ length: 9 }, (_, i) => {
            const t = 0.08 + i * 0.11
            const [x, y] = at(lane(1.5), t)
            return <rect key={i} x={x - 10} y={y - 1.5} width={20 * depth(t)} height={3} rx={1.5} fill={CLUB_BLUE} opacity={0.7} />
          })}
        </Prop>
        <Trail id="pace" d={d(lane(0.5))} stroke={RED} width={3} />
        <Prop id="streaks">
          <Streaks />
        </Prop>
        {/* The chaser is one lane nearer the camera, so drawn in front */}
        <Actor id="front" />
        <Actor id="back" />
      </>
    )
  },
}

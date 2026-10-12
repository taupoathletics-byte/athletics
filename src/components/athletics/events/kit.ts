/**
 * Small helpers for writing a scene's `frame(p)` — the function that says
 * where everything is at scroll progress `p` (0 → 1). Everything here is pure,
 * so the same `p` always draws the same picture and scrolling back up plays
 * the event in reverse.
 */
import { footLowest, type Pair, type Pose } from './rig'

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
/** Where `p` sits inside [a, b], as 0 → 1 (clamped). */
export const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a))

export const ease = {
  linear: (t: number) => t,
  in: (t: number) => t * t,
  out: (t: number) => 1 - (1 - t) * (1 - t),
  inOut: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  /** Fast start, soft landing — runs and throws. */
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inCubic: (t: number) => t * t * t,
}

const mixPair = (a: Pair, b: Pair, t: number): Pair => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]

/** Blend two poses. Angles and positions interpolate, so limbs never stretch. */
export function mix(a: Pose, b: Pose, t: number): Pose {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    rot: lerp(a.rot ?? 0, b.rot ?? 0, t),
    lean: lerp(a.lean, b.lean, t),
    neck: lerp(a.neck ?? 0, b.neck ?? 0, t),
    armF: mixPair(a.armF, b.armF, t),
    armB: mixPair(a.armB, b.armB, t),
    legF: mixPair(a.legF, b.legF, t),
    legB: mixPair(a.legB, b.legB, t),
    toeF: lerp(a.toeF ?? 0, b.toeF ?? 0, t),
    toeB: lerp(a.toeB ?? 0, b.toeB ?? 0, t),
    hair: lerp(a.hair ?? 0, b.hair ?? 0, t),
    scale: lerp(a.scale ?? 1, b.scale ?? 1, t),
    flip: t < 0.5 ? a.flip : b.flip,
  }
}

export type Key = { at: number; pose: Pose; ease?: (t: number) => number }

/** Pose at `p` from a list of keyframes (sorted by `at`). */
export function keyed(keys: Key[], p: number): Pose {
  if (p <= keys[0].at) return keys[0].pose
  for (let i = 1; i < keys.length; i++) {
    if (p <= keys[i].at) {
      const k = keys[i]
      const t = (k.ease ?? ease.inOut)(seg(p, keys[i - 1].at, k.at))
      return mix(keys[i - 1].pose, k.pose, t)
    }
  }
  return keys[keys.length - 1].pose
}

/** A number track: `[[at, value], …]`, eased between stops. */
export function track(stops: [number, number][], p: number, e: (t: number) => number = ease.inOut): number {
  if (p <= stops[0][0]) return stops[0][1]
  for (let i = 1; i < stops.length; i++) {
    if (p <= stops[i][0]) return lerp(stops[i - 1][1], stops[i][1], e(seg(p, stops[i - 1][0], stops[i][0])))
  }
  return stops[stops.length - 1][1]
}

/** Hip lift through a stride: 0 at each foot strike, highest mid-flight. */
export const bob = (phase: number, drive = 1) => Math.abs(Math.sin(phase * Math.PI * 2)) * lerp(3, 8, drive)

/**
 * A running stride at `phase` (one full stride = 1, two steps). `drive` goes
 * from a relaxed distance jog (0) to a full sprint (1). Position is left to
 * the scene — pass the hips in `at`.
 */
export function stride(phase: number, at: { x: number; y: number }, drive = 1, extra: Partial<Pose> = {}): Pose {
  const a = phase * Math.PI * 2
  const s = Math.sin(a)
  const c = Math.cos(a)
  const reach = lerp(32, 58, drive)
  const lift = lerp(55, 105, drive)
  // Thigh swings ±reach; the knee folds most as the leg recovers forward.
  const leg = (sn: number, cs: number): Pair => [sn * reach + 8, clamp(lerp(25, 40, drive) + Math.max(0, cs) * lift, 0, 150)]
  const arm = (sn: number): Pair => [-sn * lerp(38, 62, drive) + 10, lerp(80, 95, drive)]
  return {
    x: at.x,
    y: at.y,
    lean: lerp(8, 16, drive),
    neck: -4,
    legF: leg(s, c),
    legB: leg(-s, -c),
    armF: arm(-s),
    armB: arm(s),
    toeF: 10,
    toeB: 10,
    hair: 10 + s * 8,
    ...extra,
  }
}

/** Point on a quadratic Bézier (for flight arcs and throws). */
export function quad(t: number, p0: [number, number], c: [number, number], p1: [number, number]): [number, number] {
  const u = 1 - t
  return [u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]]
}

/** Drops (or lifts) a pose so its lowest spike sits on `floorY`, then raises it by `lift`. */
export function onGround(p: Pose, floorY: number, lift = 0): Pose {
  return { ...p, y: p.y + (floorY - footLowest(p)) - lift }
}

/**
 * Distance covered by `p` under a piecewise-linear speed profile
 * `[[p, speed], …]` (speed in stage units per whole p). Driving position and
 * stride phase from the same distance keeps feet from skating as runners
 * speed up or ease off.
 */
export function travel(knots: [number, number][], p: number): number {
  let d = 0
  for (let i = 1; i < knots.length; i++) {
    const [p0, v0] = knots[i - 1]
    const [p1, v1] = knots[i]
    if (p <= p0) break
    const q = Math.min(p, p1)
    const vq = v0 + ((v1 - v0) * (q - p0)) / (p1 - p0)
    d += ((v0 + vq) / 2) * (q - p0)
  }
  const [lp, lv] = knots[knots.length - 1]
  if (p > lp) d += lv * (p - lp)
  return d
}

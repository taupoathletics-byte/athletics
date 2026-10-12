/**
 * The athlete rig behind "Explore the seven events".
 *
 * Every athlete is drawn the way the club's event icons are (svg/*.svg in the
 * icon package): limbs are three-point strokes (a navy outline under a skin
 * fill), the singlet is a four-sided torso, the head an outlined ellipse with
 * a hair cap, and the spikes are small ellipses. Instead of fixed coordinates
 * the rig works from joint ANGLES, so a scene can pose and move an athlete
 * from any scroll position — forwards or backwards — and limbs keep their
 * length. `figureAttrs()` turns a pose into SVG attributes; the stage applies
 * them straight to the DOM, so scrolling never re-renders React.
 *
 * Angles are in degrees, for an athlete facing right (+x):
 * - `lean`  torso from upright; + leans forward.
 * - legs    [hip, knee]: hip 0 = thigh straight down, + swings the knee
 *           forward/up; knee 0 = straight, + folds the shin back.
 * - arms    [shoulder, elbow], measured from the torso hanging line:
 *           0 = along the body, + swings forward/up, 180 = overhead;
 *           elbow + folds the forearm forward/up.
 * - `rot`   turns the whole body about the hips (+ = clockwise, i.e. pitching
 *           forward) — for the high-jump arch and long-jump landing.
 */

export type Pair = readonly [number, number]

export interface Pose {
  /** Hip centre, in stage units. */
  x: number
  y: number
  rot?: number
  lean: number
  /** Head tilt relative to the torso (+ = chin down/forward). */
  neck?: number
  /** Front (near-side) and back limbs. */
  armF: Pair
  armB: Pair
  legF: Pair
  legB: Pair
  /** Toe point for each foot (+ = toes pointed down/back). */
  toeF?: number
  toeB?: number
  /** Ponytail swing (+ = flicks up/back). */
  hair?: number
  /** Overall size (1 = icon size, about 230 units tall standing). */
  scale?: number
  /** Face left instead of right. */
  flip?: boolean
}

export interface Look {
  skin: string
  /** Back limbs are drawn a shade darker for depth. */
  skinBack: string
  singlet: string
  /** Side panel on the singlet (the concept art's white/navy stripe). */
  panel: string
  shorts: string
  hair: string
  hairStyle: 'ponytail' | 'short' | 'bun'
  shoe: string
}

export const INK = '#0A2342'
/** The club's track red. */
export const RED = '#b04f49'
export const CLUB_BLUE = '#6683A3'
export const PAPER = '#F8F5F0'

/** A small cast, so the seven scenes show a range of teenagers. */
export const LOOKS = {
  aria: { skin: '#C98E64', skinBack: '#AE7650', singlet: RED, panel: PAPER, shorts: '#16365C', hair: '#2A1A12', hairStyle: 'ponytail', shoe: PAPER },
  mana: { skin: '#9A603E', skinBack: '#7F4C30', singlet: '#1F4C7A', panel: PAPER, shorts: INK, hair: '#140D0A', hairStyle: 'short', shoe: RED },
  lily: { skin: '#F1D0B4', skinBack: '#D9B497', singlet: PAPER, panel: CLUB_BLUE, shorts: '#16365C', hair: '#6B3F1F', hairStyle: 'ponytail', shoe: RED },
  tama: { skin: '#B57A52', skinBack: '#986340', singlet: RED, panel: INK, shorts: '#16365C', hair: '#1A110C', hairStyle: 'short', shoe: PAPER },
  sione: { skin: '#7C4A2E', skinBack: '#653B24', singlet: CLUB_BLUE, panel: PAPER, shorts: INK, hair: '#0F0A08', hairStyle: 'short', shoe: RED },
  maia: { skin: '#E2B48E', skinBack: '#C79A75', singlet: '#1F4C7A', panel: RED, shorts: INK, hair: '#3B2416', hairStyle: 'bun', shoe: PAPER },
} satisfies Record<string, Look>

// Segment lengths, measured off the icon artwork.
const THIGH = 62
const SHIN = 58
const UPPER_ARM = 40
const FOREARM = 33
const TORSO = 61
const NECK = 50
const SHOULDER_HALF = 19
const HIP_HALF = 15

type Pt = [number, number]
const rad = (d: number) => (d * Math.PI) / 180
/** Unit vector `a` degrees forward of straight down (facing +x). */
const down = (a: number): Pt => [Math.sin(rad(a)), Math.cos(rad(a))]
const add = (p: Pt, v: Pt, k = 1): Pt => [p[0] + v[0] * k, p[1] + v[1] * k]
const f1 = (n: number) => Math.round(n * 10) / 10

export interface FigureAttrs {
  legB: string
  legF: string
  armB: string
  armF: string
  shortsB: string
  shortsF: string
  torso: string
  panel: string
  head: string
  pony: string
  shoeB: string
  shoeF: string
}

/** Every joint of a pose, in stage units. */
export function joints(p: Pose) {
  const s = p.scale ?? 1
  const r = rad(p.rot ?? 0)
  const cos = Math.cos(r)
  const sin = Math.sin(r)
  const dir = p.flip ? -1 : 1
  // Body frame → stage: rotate about the hip, scale, mirror, translate.
  const T = ([x, y]: Pt): Pt => [p.x + dir * (x * cos - y * sin) * s, p.y + (x * sin + y * cos) * s]
  const L = p.lean
  const up: Pt = [Math.sin(rad(L)), -Math.cos(rad(L))]
  const perp: Pt = [Math.cos(rad(L)), Math.sin(rad(L))]
  const hip: Pt = [0, 0]
  const sh = add(hip, up, TORSO)

  const leg = ([h, k]: Pair, side: number, toe = 0) => {
    const root: Pt = [side * (HIP_HALF - 5), 2]
    const knee = add(root, down(h), THIGH)
    const foot = add(knee, down(h - k), SHIN)
    // Toe points 90° forward of the shin, less any pointing.
    const toeDir = down(h - k + 90 - toe)
    const toeAt = add(foot, toeDir, 6)
    return { root: T(root), knee: T(knee), foot: T(foot), shorts: T(add(root, down(h), 22)), toe: T(toeAt), toeTip: T(add(toeAt, toeDir, 10)) }
  }
  const arm = ([a, e]: Pair, side: number) => {
    const root = add(add(sh, perp, side * (SHOULDER_HALF - 6)), up, -6)
    const elbow = add(root, down(a - L), UPPER_ARM)
    const hand = add(elbow, down(a + e - L), FOREARM)
    const grip = add(elbow, down(a + e - L), FOREARM + 4)
    return { root: T(root), elbow: T(elbow), hand: T(hand), grip: T(grip) }
  }
  const neckA = L + (p.neck ?? 0)
  return {
    T,
    scale: s,
    dir,
    legF: leg(p.legF, 1, p.toeF),
    legB: leg(p.legB, -1, p.toeB),
    armF: arm(p.armF, 1),
    armB: arm(p.armB, -1),
    torso: [add(sh, perp, -SHOULDER_HALF), add(sh, perp, SHOULDER_HALF), add(hip, perp, HIP_HALF + 1), add(hip, perp, -(HIP_HALF + 1))].map(T),
    // The side panel: a narrow stripe down the front edge of the singlet.
    panel: [add(sh, perp, SHOULDER_HALF - 9), add(sh, perp, SHOULDER_HALF - 1), add(hip, perp, HIP_HALF - 1), add(hip, perp, HIP_HALF - 8)].map(T),
    head: T(add(sh, [Math.sin(rad(neckA)), -Math.cos(rad(neckA))], NECK)),
    headAngle: (p.rot ?? 0) + neckA,
  }
}

const pt = ([x, y]: Pt) => `${f1(x)},${f1(y)}`

/** Pose → SVG attribute strings for every part of one athlete. */
export function figureAttrs(p: Pose): FigureAttrs {
  const j = joints(p)
  const limb = (l: { root: Pt; knee?: Pt; elbow?: Pt; foot?: Pt; hand?: Pt }) =>
    `M${pt(l.root)} L${pt((l.knee ?? l.elbow)!)} L${pt((l.foot ?? l.hand)!)}`
  const sc = f1(j.scale * 100) / 100
  const shoe = (l: ReturnType<typeof joints>['legF']) => {
    const ang = (Math.atan2(l.toeTip[1] - l.toe[1], l.toeTip[0] - l.toe[0]) * 180) / Math.PI
    return `translate(${pt(l.toe).replace(',', ' ')}) rotate(${f1(ang)}) scale(${sc})`
  }
  const mirror = p.flip ? ' scale(-1 1)' : ''
  return {
    legB: limb(j.legB),
    legF: limb(j.legF),
    armB: limb(j.armB),
    armF: limb(j.armF),
    shortsB: `M${pt(j.legB.root)} L${pt(j.legB.shorts)}`,
    shortsF: `M${pt(j.legF.root)} L${pt(j.legF.shorts)}`,
    torso: j.torso.map(pt).join(' '),
    panel: j.panel.map(pt).join(' '),
    // Mirror first, then rotate: a flipped head turns the other way on screen.
    head: `translate(${pt(j.head).replace(',', ' ')})${mirror} rotate(${f1(j.headAngle)}) scale(${sc})`,
    pony: `rotate(${f1(-(p.hair ?? 0))} -16 -12)`,
    shoeB: shoe(j.legB),
    shoeF: shoe(j.legF),
  }
}

/** Where a hand grips (a baton, shot or discus), in stage units. */
export function handPosition(p: Pose, which: 'F' | 'B' = 'F'): [number, number] {
  return joints(p)[which === 'F' ? 'armF' : 'armB'].grip
}

/** The lowest point of either spike, in stage units — keeps runners on the ground. */
export function footLowest(p: Pose): number {
  const j = joints(p)
  return Math.max(j.legF.foot[1], j.legB.foot[1], j.legF.toe[1], j.legB.toe[1]) + 7 * j.scale
}

/**
 * Bends one arm so its grip lands on `target` (stage units): a hand meeting a
 * baton, or carrying a discus round a path. Two-joint IK. Of the two ways the
 * elbow could bend it takes the everyday one (forearm folding forwards)
 * unless `elbow: 'high'` asks for the elbow lifted back above the hand — the
 * shot-put hold. A target out of reach gets a straight arm pointing at it.
 */
export function reach(p: Pose, which: 'F' | 'B', target: [number, number], elbow: 'natural' | 'high' = 'natural'): Pose {
  const j = joints(p)
  const root = j[which === 'F' ? 'armF' : 'armB'].root
  const r = rad(p.rot ?? 0)
  // Shoulder → target, back in the body frame (undo scale, mirror, then turn).
  const vx = (target[0] - root[0]) / (j.scale * j.dir)
  const vy = (target[1] - root[1]) / j.scale
  const bx = vx * Math.cos(r) + vy * Math.sin(r)
  const by = -vx * Math.sin(r) + vy * Math.cos(r)
  const A = UPPER_ARM
  const B = FOREARM + 4
  const d = Math.min(A + B - 0.01, Math.max(Math.abs(A - B) + 0.01, Math.hypot(bx, by)))
  const base = Math.atan2(bx, by)
  const alpha = Math.acos(Math.min(1, Math.max(-1, (A * A + d * d - B * B) / (2 * A * d))))
  const deg = (x: number) => (x * 180) / Math.PI
  const wrap = (x: number) => ((((x + 180) % 360) + 360) % 360) - 180
  const options = [base + alpha, base - alpha].map((upper) => {
    const elbow: Pt = [Math.sin(upper) * A, Math.cos(upper) * A]
    const tx = Math.sin(base) * d
    const ty = Math.cos(base) * d
    const fore = Math.atan2(tx - elbow[0], ty - elbow[1])
    return { a: deg(upper) + p.lean, e: wrap(deg(fore - upper)) }
  })
  const pick = options.find((o) => (elbow === 'high' ? o.e < 0 : o.e >= 0)) ?? options[0]
  const arm: Pair = [pick.a, pick.e]
  return which === 'F' ? { ...p, armF: arm } : { ...p, armB: arm }
}

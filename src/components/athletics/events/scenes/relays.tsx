/**
 * Relays — the changeover. The incoming runner sprints in with the baton;
 * when they hit the check mark the outgoing runner, waiting in the zone,
 * pushes off so both are moving fast at the pass. The outgoing runner
 * reaches back, the incoming runner pushes the baton into the open hand, and
 * the baton travels hand to hand before the new runner accelerates away and
 * the old one eases up in the lane.
 */
import { clamp, ease, lerp, mix, onGround, seg, stride, travel } from '../kit'
import { joints, handPosition, LOOKS, reach, type Pose } from '../rig'
import { Prop, type EventScene } from '../Stage'
import { Backdrop, INK, PAPER, RED, Streaks, TRACK_BLUE } from './shared'

const FLOOR = 430
const STRIDE = 220
const CHECK_MARK = 160
const ZONE = [300, 640] as const
// The beats, in scroll progress.
const GO = 0.2 // incoming runner reaches the check mark; outgoing pushes off
const REACH = 0.42 // outgoing arm goes back
const HANDOVER = [0.46, 0.5] as const // baton moves from one hand to the other
const LET_GO = 0.56 // both arms back into the running action

// Speed profiles (stage units per whole p), integrated for position and stride.
const IN_SPEED: [number, number][] = [[0, 900], [0.52, 900], [0.64, 620], [1, 120]]
const OUT_SPEED: [number, number][] = [[0, 0], [GO, 0], [0.46, 860], [0.6, 980], [1, 1050]]
const IN_START = -50
const OUT_START = 400

const inX = (p: number) => IN_START + travel(IN_SPEED, p)
const outX = (p: number) => OUT_START + travel(OUT_SPEED, p)

/** Crouched in the zone, weight forward, looking back down the track. */
const READY: Omit<Pose, 'x' | 'y'> = { lean: 44, neck: -40, legF: [62, 104], legB: [-30, 36], armF: [-44, 40], armB: [64, 80], toeB: 34, hair: 4 }

function incoming(p: number): Pose {
  const x = inX(p)
  const drive = lerp(1, 0.2, seg(p, 0.52, 0.9))
  return onGround(stride((x - IN_START) / STRIDE + 0.1, { x, y: 300 }, drive), FLOOR)
}

function outgoing(p: number): Pose {
  const x = outX(p)
  const run = onGround(stride((x - OUT_START) / STRIDE, { x, y: 300 }, lerp(0.55, 1, seg(p, GO, 0.6))), FLOOR)
  return mix(onGround({ x: OUT_START, y: 300, ...READY }, FLOOR), run, ease.inOut(seg(p, GO, GO + 0.08)))
}

/** How far the two arms are into the pass: 0 = running action, 1 = locked onto the baton. */
const passWeight = (p: number) => Math.min(ease.inOut(seg(p, REACH - 0.04, REACH + 0.02)), 1 - ease.inOut(seg(p, LET_GO - 0.03, LET_GO + 0.03)))

/**
 * Where the hands meet: halfway between the two shoulders, as low as both
 * arms can reach (near straight arms is how a good pass looks — the runners
 * stay apart and both keep running).
 */
function meeting(a: Pose, b: Pose): [number, number] {
  const sa = joints(a).armF.root
  const sb = joints(b).armB.root
  const half = Math.hypot(sb[0] - sa[0], sb[1] - sa[1]) / 2
  const drop = Math.sqrt(Math.max(0, 74 * 74 - half * half))
  return [(sa[0] + sb[0]) / 2, (sa[1] + sb[1]) / 2 + Math.min(52, drop)]
}

function runners(p: number) {
  let a = incoming(p)
  let b = outgoing(p)
  const w = passWeight(p)
  if (w > 0) {
    const m = meeting(a, b)
    a = mix(a, reach(a, 'F', m), w)
    // The receiving hand: arm long behind, hand open at hip height.
    b = mix(b, reach(b, 'B', m), w)
  }
  return { incoming: a, outgoing: b }
}

/** The baton lies across the fist, square to the forearm. */
function inHand(pose: Pose, which: 'F' | 'B'): { x: number; y: number; rot: number } {
  const arm = joints(pose)[which === 'F' ? 'armF' : 'armB']
  const [x, y] = handPosition(pose, which)
  const rot = (Math.atan2(arm.hand[1] - arm.elbow[1], arm.hand[0] - arm.elbow[0]) * 180) / Math.PI + 90
  return { x, y, rot }
}

export const relays: EventScene = {
  id: 'relays',
  cast: { incoming: LOOKS.sione, outgoing: LOOKS.lily },
  poster: 0.48,
  alt: 'Two teenage relay runners at full speed, the baton passing from the back runner’s hand into the front runner’s outstretched hand',
  frame(p) {
    const r = runners(p)
    const from = inHand(r.incoming, 'F')
    const to = inHand(r.outgoing, 'B')
    const k = ease.inOut(seg(p, HANDOVER[0], HANDOVER[1]))
    const baton = { x: lerp(from.x, to.x, k), y: lerp(from.y, to.y, k), rot: lerp(from.rot, to.rot, k) }
    const leader = p < HANDOVER[1] ? r.incoming : r.outgoing
    return {
      actors: r,
      props: {
        baton,
        // The streaks hop from one runner to the other while faded out at the handover.
        streaks: { x: leader.x, y: leader.y - 40, opacity: clamp(Math.abs(p - HANDOVER[1]) * 7 - 0.05) * 0.9 },
        zoneGlow: { opacity: 0.25 + 0.5 * Math.sin(Math.PI * seg(p, GO, LET_GO)) },
      },
    }
  },
  Art({ Actor, uid }) {
    return (
      <>
        <Backdrop uid={uid} ring={[460, 250, 180]} floor={FLOOR} />
        {/* Lane, with the changeover zone marked on the track */}
        <path d={`M0 ${FLOOR + 2} H800 V500 H0Z`} fill={TRACK_BLUE} opacity={0.6} />
        <path d={`M0 ${FLOOR + 40} H800`} stroke={PAPER} strokeWidth={3} opacity={0.35} />
        <Prop id="zoneGlow">
          <rect x={ZONE[0]} y={FLOOR + 3} width={ZONE[1] - ZONE[0]} height={36} fill={RED} opacity={0.35} />
        </Prop>
        {ZONE.map((x) => (
          <path key={x} d={`M${x} ${FLOOR + 4} l-12 18 h24z`} fill={x === ZONE[0] ? RED : PAPER} />
        ))}
        {/* The outgoing runner's check mark */}
        <rect x={CHECK_MARK - 10} y={FLOOR + 8} width={20} height={6} rx={2} fill={PAPER} opacity={0.85} />
        <Prop id="streaks">
          <Streaks />
        </Prop>
        <Actor id="outgoing" />
        <Prop id="baton">
          <rect x={-23} y={-7} width={46} height={14} rx={7} fill={RED} stroke={INK} strokeWidth={3} />
          <rect x={-5} y={-5.5} width={10} height={11} fill={PAPER} />
        </Prop>
        <Actor id="incoming" />
      </>
    )
  },
}

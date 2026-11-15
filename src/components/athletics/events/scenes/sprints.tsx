/**
 * Sprints — a still, crouched "set" position, drive out low, rise into a full
 * sprint and dip through the finish tape. Position and stride both come from
 * the distance run, so the feet never skate as the athlete speeds up.
 */
import { clamp, ease, lerp, mix, onGround, seg, stride, travel } from '../kit'
import { LOOKS, type Pose } from '../rig'
import { Prop, type EventScene } from '../Stage'
import { Backdrop, PAPER, RED, Streaks, TRACK_BLUE } from './shared'

const FLOOR = 430
const STRIDE = 210
const START_X = 90
const FINISH_X = 640

/** Speed profile (stage units per whole p): still, then a hard acceleration, then flat out. */
const SPEED: [number, number][] = [[0, 0], [0.1, 0], [0.4, 900], [1, 900]]
const dist = (p: number) => travel(SPEED, p)

function athlete(p: number): Pose {
  const d = dist(p)
  const x = START_X + d
  // Drive out low, then rise to an upright sprint.
  const drive = lerp(0.55, 1, seg(p, 0.1, 0.45))
  const rise = seg(p, 0.1, 0.5)
  const runner = stride(d / STRIDE + 0.25, { x, y: 300 }, drive, { hair: lerp(8, 20, seg(p, 0.1, 0.4)) })
  // Extra forward lean out of the start, fading as they come up.
  const lean = runner.lean + lerp(22, 0, ease.out(rise))
  // Dip: chest forward and arms back as the tape is reached.
  const dip = ease.inOut(clamp((x - (FINISH_X - 70)) / 70)) * (1 - seg(p, 0.93, 1))
  const moving: Pose = {
    ...runner,
    lean: lean + dip * 22,
    neck: (runner.neck ?? 0) - dip * 6,
    armF: [lerp(runner.armF[0], -40, dip), lerp(runner.armF[1], 40, dip)],
    armB: [lerp(runner.armB[0], -55, dip), lerp(runner.armB[1], 30, dip)],
  }
  // The set position: crouched, weight forward, ready to go.
  const set: Pose = onGround({
    x: START_X, y: 300, lean: 46, neck: -12,
    legF: [70, 95], legB: [-12, 55], armF: [-20, 40], armB: [55, 60], toeF: 20, toeB: 35, hair: 8,
  }, FLOOR)
  const t = ease.inOut(seg(p, 0.06, 0.16))
  return t >= 1 ? onGround(moving, FLOOR) : mix(set, onGround(moving, FLOOR), t)
}


export const sprints: EventScene = {
  id: 'sprints',
  cast: { athlete: LOOKS.sione },
  poster: 0.62,
  alt: 'A sprinter at full speed down the track, driving the knees and arms, heading for the finish tape',
  frame(p) {
    const a = athlete(p)
    const atTape = a.x >= FINISH_X - 12
    return {
      actors: { athlete: a },
      props: {
        streaks: { x: a.x, y: a.y - 40, opacity: seg(p, 0.2, 0.35) * (1 - seg(p, 0.94, 1)) },
        tape: { opacity: atTape ? 1 - seg(a.x, FINISH_X - 12, FINISH_X + 40) : 1 },
        tapeBroken: { opacity: atTape ? seg(a.x, FINISH_X - 12, FINISH_X + 10) : 0 },
      },
    }
  },
  Art({ Actor, uid }) {
    return (
      <>
        <Backdrop uid={uid} ring={[400, 250, 175]} floor={FLOOR} />
        <path d={`M0 ${FLOOR + 2} H800 V500 H0Z`} fill={TRACK_BLUE} opacity={0.6} />
        <path d={`M0 ${FLOOR + 40} H800`} stroke={PAPER} strokeWidth={3} opacity={0.35} />
        {/* Start line and finish line */}
        <path d={`M${START_X + 40} ${FLOOR + 2} V500`} stroke={PAPER} strokeWidth={5} opacity={0.7} />
        <path d={`M${FINISH_X} ${FLOOR + 2} V500`} stroke={PAPER} strokeWidth={6} />
        <Prop id="streaks">
          <Streaks />
        </Prop>
        <Actor id="athlete" />
        {/* Finish posts and tape */}
        <path d={`M${FINISH_X} ${FLOOR - 150} V${FLOOR}`} stroke={PAPER} strokeWidth={5} opacity={0.5} />
        <Prop id="tape">
          <path d={`M${FINISH_X - 6} ${FLOOR - 120} L${FINISH_X + 6} ${FLOOR - 118}`} stroke={RED} strokeWidth={6} strokeLinecap="round" />
          <path d={`M${FINISH_X - 160} ${FLOOR - 122} L${FINISH_X} ${FLOOR - 120}`} stroke={RED} strokeWidth={5} strokeLinecap="round" opacity={0.8} />
        </Prop>
        <Prop id="tapeBroken">
          <path d={`M${FINISH_X} ${FLOOR - 120} q 40 30 70 70`} stroke={RED} strokeWidth={5} strokeLinecap="round" fill="none" />
          <path d={`M${FINISH_X - 150} ${FLOOR - 122} q 60 40 110 110`} stroke={RED} strokeWidth={5} strokeLinecap="round" fill="none" opacity={0.8} />
        </Prop>
      </>
    )
  },
}

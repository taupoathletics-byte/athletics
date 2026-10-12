/**
 * The backdrop every event stage shares, in the language of the club's event
 * icons: a deep navy panel, soft club-blue arcs, a big halo ring behind the
 * action (from the concept art) and faint floor lines. Scenes draw their venue
 * on top of this.
 */
import { CLUB_BLUE, INK, PAPER, RED } from '../rig'

export { CLUB_BLUE, INK, PAPER, RED }
export const NAVY_LINE = '#365674'
export const TRACK_BLUE = '#1A3B60'
export const SAND = '#D9BFA5'
export const MAT = '#6683A3'

export function Backdrop({ uid, ring = [400, 230, 190], floor = 430 }: { uid: string; ring?: [number, number, number]; floor?: number }) {
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#153858" />
          <stop offset="1" stopColor="#06182C" />
        </linearGradient>
        <radialGradient id={`${uid}-glow`} cx="0.5" cy="0.5" r="0.5">
          <stop stopColor="#2A5A88" stopOpacity="0.55" />
          <stop offset="1" stopColor="#2A5A88" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="500" fill={`url(#${uid}-bg)`} />
      <circle cx={ring[0]} cy={ring[1]} r={ring[2] * 1.25} fill={`url(#${uid}-glow)`} />
      <circle cx={ring[0]} cy={ring[1]} r={ring[2]} fill="none" stroke="#24507D" strokeWidth={26} opacity={0.45} />
      <circle cx={ring[0]} cy={ring[1]} r={ring[2] - 30} fill="none" stroke={CLUB_BLUE} strokeWidth={2} opacity={0.25} />
      <path d="M30 90 C 130 20 250 20 340 70" fill="none" stroke={CLUB_BLUE} strokeWidth={4} opacity={0.3} />
      <path d="M470 470 C 600 480 720 420 780 330" fill="none" stroke={CLUB_BLUE} strokeWidth={4} opacity={0.28} />
      <path d={`M0 ${floor} H800`} stroke={NAVY_LINE} strokeWidth={4} opacity={0.7} />
      <path d={`M0 ${floor + 22} H800`} stroke={NAVY_LINE} strokeWidth={2} opacity={0.35} />
      <rect x={36} y={470} width={90} height={8} rx={4} fill={RED} />
    </>
  )
}

/** Red speed streaks trailing a runner; `Prop` them to follow the athlete. */
export function Streaks({ color = RED }: { color?: string }) {
  return (
    <g stroke={color} strokeLinecap="round" fill="none">
      <path d="M-70 -30 L-120 -26" strokeWidth={6} />
      <path d="M-62 -6 L-132 -2" strokeWidth={4} opacity={0.8} />
      <path d="M-74 20 L-112 24" strokeWidth={5} opacity={0.6} />
    </g>
  )
}

export { INK as OUTLINE, PAPER as WHITE }

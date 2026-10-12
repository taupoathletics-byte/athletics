/**
 * Flat athletics illustrations — the club's answer to the striped cricket balls
 * on Sixes. Each one is a self-contained SVG in the brand palette, decorative
 * by default (aria-hidden). Size them with a width/height class.
 */
import { useId, type SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = (props: IconProps) => ({
  viewBox: '0 0 100 100',
  'aria-hidden': true as const,
  focusable: false as const,
  ...props,
})

/** Shot put: a heavy iron ball with a highlight. */
export function ShotPut(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="50" cy="50" r="46" fill="#1b4466" />
      <path d="M50 4a46 46 0 0 1 0 92 34 34 0 0 0 0-92Z" fill="#12304b" />
      <circle cx="35" cy="33" r="13" fill="#7fa6cc" opacity=".55" />
      <circle cx="31" cy="29" r="5" fill="#F6F3EC" opacity=".9" />
      <path d="M8 58c14 6 70 6 84 0" stroke="#b04f49" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M10 67c14 6 66 6 80 0" stroke="#F6F3EC" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  )
}

/** Discus seen from above: rim, plate and hub. */
export function Discus(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="50" cy="50" r="46" fill="#b04f49" />
      <circle cx="50" cy="50" r="38" fill="#F6F3EC" />
      <circle cx="50" cy="50" r="30" fill="#0c2033" />
      <circle cx="50" cy="50" r="13" fill="#a9c6de" />
      <circle cx="50" cy="50" r="5" fill="#0c2033" />
      <path d="M26 30a33 33 0 0 1 22-11" stroke="#F6F3EC" strokeWidth="4" strokeLinecap="round" fill="none" opacity=".6" />
    </svg>
  )
}

/** Relay baton with lane-coloured bands. */
export function Baton(props: IconProps) {
  return (
    <svg {...base(props)}>
      <g transform="rotate(-38 50 50)">
        <rect x="8" y="38" width="84" height="24" rx="12" fill="#F6F3EC" />
        <rect x="26" y="38" width="10" height="24" fill="#b04f49" />
        <rect x="45" y="38" width="10" height="24" fill="#0c2033" />
        <rect x="64" y="38" width="10" height="24" fill="#b04f49" />
        <rect x="8" y="38" width="84" height="24" rx="12" fill="none" stroke="#0c2033" strokeWidth="3" />
        <rect x="14" y="42" width="70" height="4" rx="2" fill="#fff" opacity=".45" />
      </g>
    </svg>
  )
}

/** Hurdle: striped board on two legs with feet. */
export function Hurdle(props: IconProps) {
  // Unique clip id per instance — several hurdles can share a page.
  const clip = `hurdle-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <svg {...base(props)}>
      <rect x="18" y="30" width="7" height="58" rx="2" fill="#0c2033" />
      <rect x="75" y="30" width="7" height="58" rx="2" fill="#0c2033" />
      <rect x="8" y="84" width="28" height="7" rx="3" fill="#0c2033" />
      <rect x="64" y="84" width="28" height="7" rx="3" fill="#0c2033" />
      <clipPath id={clip}>
        <rect x="8" y="22" width="84" height="18" rx="3" />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        <rect x="8" y="22" width="84" height="18" fill="#F6F3EC" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <path key={i} d={`M${2 + i * 18} 40 l14 -18 h9 l-14 18Z`} fill="#b04f49" />
        ))}
      </g>
      <rect x="8" y="22" width="84" height="18" rx="3" fill="none" stroke="#0c2033" strokeWidth="3" />
    </svg>
  )
}

/** Stopwatch with a red hand. */
export function Stopwatch(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="43" y="4" width="14" height="10" rx="3" fill="#0c2033" />
      <rect x="70" y="16" width="10" height="8" rx="2" fill="#0c2033" transform="rotate(40 75 20)" />
      <circle cx="50" cy="57" r="39" fill="#0c2033" />
      <circle cx="50" cy="57" r="32" fill="#F6F3EC" />
      {Array.from({ length: 12 }, (_, i) => (
        <rect
          key={i}
          x="48.5"
          y="28"
          width="3"
          height={i % 3 === 0 ? 8 : 5}
          rx="1.5"
          fill="#1b4466"
          transform={`rotate(${i * 30} 50 57)`}
        />
      ))}
      <path d="M50 57 L66 38" stroke="#b04f49" strokeWidth="5" strokeLinecap="round" />
      <circle cx="50" cy="57" r="5" fill="#0c2033" />
    </svg>
  )
}

/** Ribbon Day rosette. */
export function Rosette(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M34 56 22 96l14-8 8 12 8-38Z" fill="#1f8f84" />
      <path d="M66 56l12 40-14-8-8 12-8-38Z" fill="#0d4f4a" />
      {Array.from({ length: 14 }, (_, i) => (
        <ellipse key={i} cx="50" cy="20" rx="8" ry="14" fill={i % 2 ? '#ffd700' : '#f2c200'} transform={`rotate(${i * (360 / 14)} 50 44)`} />
      ))}
      <circle cx="50" cy="44" r="20" fill="#b04f49" />
      <circle cx="50" cy="44" r="14" fill="#F6F3EC" />
      <text x="50" y="51" textAnchor="middle" fontFamily="'Barlow Condensed', sans-serif" fontWeight="900" fontSize="20" fill="#0c2033">
        1
      </text>
    </svg>
  )
}

/** Medal on a V ribbon. */
export function Medal(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M22 4h20l14 40H36Z" fill="#b04f49" />
      <path d="M78 4H58L44 44h20Z" fill="#1b4466" />
      <circle cx="50" cy="66" r="30" fill="#e9b400" />
      <circle cx="50" cy="66" r="23" fill="#ffd700" />
      <path d="M50 52l4.4 9 9.6 1.3-7 6.8 1.7 9.6L50 74l-8.7 4.7 1.7-9.6-7-6.8 9.6-1.3Z" fill="#F6F3EC" />
    </svg>
  )
}

/** Race bib with safety pins. */
export function Bib({ number = '27', ...props }: IconProps & { number?: string }) {
  return (
    <svg {...base(props)}>
      <g transform="rotate(-6 50 50)">
        <rect x="10" y="18" width="80" height="64" rx="6" fill="#F6F3EC" stroke="#0c2033" strokeWidth="3" />
        <rect x="10" y="18" width="80" height="14" rx="6" fill="#b04f49" />
        <rect x="10" y="26" width="80" height="6" fill="#b04f49" />
        <text x="50" y="72" textAnchor="middle" fontFamily="'Barlow Condensed', sans-serif" fontWeight="900" fontSize="40" fill="#0c2033">
          {number}
        </text>
        {[
          [18, 40],
          [82, 40],
          [18, 74],
          [82, 74],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="3" fill="#7fa6cc" stroke="#0c2033" strokeWidth="1.5" />
        ))}
      </g>
    </svg>
  )
}

/** Small lane-tick divider used inside section labels: -ıı TITLE ıı- */
export function LaneTicks({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 12" aria-hidden className={className}>
      <rect x="0" y="5" width="10" height="2" rx="1" fill="currentColor" />
      <rect x="14" y="1" width="3" height="10" rx="1.5" fill="currentColor" />
      <rect x="21" y="1" width="3" height="10" rx="1.5" fill="currentColor" />
    </svg>
  )
}

export const athleticsIcons = { ShotPut, Discus, Baton, Hurdle, Stopwatch, Rosette, Medal, Bib }
export type AthleticsIconName = keyof typeof athleticsIcons

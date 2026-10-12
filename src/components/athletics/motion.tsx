/**
 * Scroll-motion building blocks for the glow-up. Every effect checks
 * prefers-reduced-motion and falls back to a still layout.
 */
import { useId, useRef, type ReactNode } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { cn } from '@/lib/utils'
import { athleticsIcons, LaneTicks, type AthleticsIconName } from './icons'

/** Fade-and-rise once, when scrolled into view. */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 28,
}: {
  children: ReactNode
  className?: string
  delay?: number
  y?: number
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

/**
 * A floating athletics illustration that drifts and spins as the page scrolls
 * past — the shot puts and batons that stand in for Sixes' cricket balls.
 * Position it with absolute utility classes on `className`.
 */
export function Floater({
  icon,
  className,
  speed = 120,
  spin = 40,
}: {
  icon: AthleticsIconName
  className?: string
  /** px of vertical drift across the element's pass through the viewport. */
  speed?: number
  /** degrees of rotation across the same pass. */
  spin?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [speed, -speed])
  const rotate = useTransform(scrollYProgress, [0, 1], [-spin / 2, spin / 2])
  const Icon = athleticsIcons[icon]
  return (
    <motion.div
      ref={ref}
      aria-hidden
      className={cn('pointer-events-none absolute z-10 drop-shadow-[0_14px_18px_rgba(12,32,51,0.25)]', className)}
      style={reduce ? undefined : { y, rotate }}
    >
      <Icon className="h-full w-full" />
    </motion.div>
  )
}

/** "-ıı TITLE ıı-" section label, as on Sixes, drawn with lane ticks. */
export function SectionLabel({ children, className, tone = 'ink' }: { children: ReactNode; className?: string; tone?: 'ink' | 'cream' }) {
  return (
    <p
      className={cn(
        'flex items-center justify-center gap-3 font-display text-xl font-extrabold uppercase tracking-[0.04em] md:text-2xl',
        tone === 'cream' ? 'text-cream' : 'text-ink',
        className,
      )}
    >
      <LaneTicks className="h-3 w-7" />
      {children}
      <LaneTicks className="h-3 w-7 -scale-x-100" />
    </p>
  )
}

/** Infinite CSS marquee. Content is duplicated once; the strip loops at -50%. */
export function Marquee({
  items,
  className,
  itemClassName,
  separator,
  fast = false,
  reverse = false,
}: {
  items: ReactNode[]
  className?: string
  itemClassName?: string
  separator?: ReactNode
  fast?: boolean
  reverse?: boolean
}) {
  const row = (hidden: boolean) =>
    items.map((it, i) => (
      <span key={`${hidden ? 'b' : 'a'}-${i}`} aria-hidden={hidden || undefined} className={cn('flex shrink-0 items-center gap-8 pr-8', itemClassName)}>
        {it}
        {separator}
      </span>
    ))
  return (
    // Pauses on hover/focus so moving text can always be stopped and read.
    <div className={cn('overflow-hidden [&:focus-within>div]:[animation-play-state:paused] [&:hover>div]:[animation-play-state:paused]', className)}>
      <div
        className={cn('flex w-max', fast ? 'animate-marquee-fast' : 'animate-marquee')}
        style={reverse ? { animationDirection: 'reverse' } : undefined}
      >
        {row(false)}
        {row(true)}
      </div>
    </div>
  )
}

/** Horizontal running-track bands that sit behind photos and run off both edges. */
export function TrackBands({ className, lanes = 3 }: { className?: string; lanes?: number }) {
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-x-0 flex flex-col justify-center gap-[6%]', className)}>
      {Array.from({ length: lanes }, (_, i) => (
        <div key={i} className="track-lanes h-[16%] min-h-6 w-full" style={{ ['--lane' as string]: '18px' }} />
      ))}
    </div>
  )
}

/** Rotating circular sticker, e.g. "REGISTER NOW · 2026/27 ·". */
export function Sticker({ text, href, className, center }: { text: string; href?: string; className?: string; center?: ReactNode }) {
  const pathId = `sticker-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const inner = (
    <span className={cn('relative grid size-28 place-items-center rounded-full bg-signal text-signal-ink shadow-floating md:size-32', className)}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full animate-spin-slow" aria-hidden>
        <defs>
          <path id={pathId} d="M50,50 m-37,0 a37,37 0 1,1 74,0 a37,37 0 1,1 -74,0" />
        </defs>
        <text fontFamily="'Barlow Condensed', sans-serif" fontWeight="800" fontSize="12.5" letterSpacing="2.2" fill="currentColor">
          {/* textLength = the circle's circumference, so the words meet without overlapping */}
          <textPath href={`#${pathId}`} textLength="230" lengthAdjust="spacing">
            {text}
          </textPath>
        </text>
      </svg>
      <span className="relative font-display text-2xl font-black uppercase leading-none">{center}</span>
    </span>
  )
  return href ? (
    <a href={href} target="_blank" rel="noopener" className="inline-block rounded-full transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cream" aria-label={text.replace(/·/g, ' ').trim()}>
      {inner}
    </a>
  ) : (
    inner
  )
}

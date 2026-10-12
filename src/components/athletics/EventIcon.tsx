import { useRef } from 'react'
import { motion, useMotionValue, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react'
import { cn } from '@/lib/utils'
import { EventStage, type EventId } from './events/Stage'
import { sceneById } from './events/scenes'

/**
 * The club's event icons, alive: each tile is one of the event scenes
 * (src/components/athletics/events) cropped square and framed like the icon
 * artwork — rounded navy tile, club-blue edge. As the page scrolls the
 * athlete performs the event, and scrolling back up plays it in reverse.
 */

/** A square window onto each 800 × 500 scene, framing its key moment. */
export const ICON_CROP: Record<EventId, string> = {
  hurdles: '210 60 440 440',
  'long-jump': '320 60 440 440',
  'high-jump': '270 50 440 440',
  'shot-put': '120 40 440 440',
  discus: '80 40 440 440',
  relays: '250 60 440 440',
  distance: '230 40 440 440',
  javelin: '70 60 440 440',
}
/** Side of the crop, in scene units — to convert scene points to tile pixels. */
export const ICON_CROP_SIZE = 440

/**
 * The part of each scene an icon plays, so the athlete is already in the tile
 * when it first appears (the full scenes start with the athlete off to the
 * left). The javelin plays all of it: its release timing drives JavelinFlight.
 */
export const ICON_RANGE: Record<EventId, [number, number]> = {
  hurdles: [0.28, 0.76],
  'long-jump': [0.26, 1],
  'high-jump': [0.3, 1],
  'shot-put': [0, 0.86],
  discus: [0, 0.8],
  relays: [0.22, 0.8],
  distance: [0.2, 1],
  javelin: [0, 1],
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/** The framed tile itself, following any progress value (0 → 1 across its ICON_RANGE). */
export function EventTile({ event, progress, className, still }: { event: EventId; progress: number | MotionValue<number>; className?: string; still?: boolean }) {
  const [from, to] = ICON_RANGE[event]
  const map = (v: number) => from + (to - from) * clamp01(v)
  const fallback = useMotionValue(0)
  const mapped = useTransform(typeof progress === 'number' ? fallback : progress, map)
  const scene = sceneById[event]
  const shown = still ? scene.poster : typeof progress === 'number' ? map(progress) : mapped
  return (
    <div
      className={cn(
        'aspect-square overflow-hidden rounded-[22%] border-[3px] border-[#6683A3]/80 bg-[#0e2a47] shadow-[0_14px_28px_rgba(6,24,44,0.35)]',
        className,
      )}
    >
      <EventStage scene={scene} progress={shown} viewBox={ICON_CROP[event]} decorative className="block h-full w-full" />
    </div>
  )
}

export interface EventFloaterProps {
  event: EventId
  /** Position and size, as absolute utility classes. */
  className?: string
  /**
   * What drives the animation:
   * - 'pass' (default): the tile's own trip through the viewport;
   * - 'page': page scroll from the top, over `span` viewport heights — for
   *   tiles near the top of a page, which are on screen before any scrolling.
   */
  drive?: 'pass' | 'page'
  span?: number
  /** px of vertical drift across the tile's pass through the viewport (parallax). */
  speed?: number
  /** Marks the tile for <JavelinFlight> to find. */
  dataJavelin?: boolean
}

/** A decorative event tile floating beside the content (replaces the old round badges). */
export function EventFloater({ event, className, drive = 'pass', span = 0.7, speed = 80, dataJavelin }: EventFloaterProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const { scrollY } = useScroll()
  const pass = useTransform(scrollYProgress, (v) => clamp01((v - 0.12) / 0.66))
  const page = useTransform(scrollY, (y) => clamp01(y / (span * (typeof window === 'undefined' ? 800 : window.innerHeight))))
  const y = useTransform(scrollYProgress, [0, 1], [speed, -speed])
  return (
    <motion.div
      ref={ref}
      aria-hidden
      data-javelin-tile={dataJavelin || undefined}
      className={cn('pointer-events-none absolute z-10', className)}
      style={reduce || speed === 0 ? undefined : { y }}
    >
      <EventTile event={event} progress={drive === 'page' ? page : pass} still={!!reduce} className="h-full w-full" />
    </motion.div>
  )
}

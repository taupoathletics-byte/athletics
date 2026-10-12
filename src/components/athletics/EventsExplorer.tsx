import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type AnimationPlaybackControls,
  type MotionValue,
} from 'motion/react'
import { ArrowRight, ChevronsDown, MapPin, RotateCcw, Users } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { eventShowcase, type EventShowcase } from '@/data/eventShowcase'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { cn } from '@/lib/utils'
import { EventStage } from './events/Stage'
import { sceneById } from './events/scenes'

/**
 * "Explore the seven events" — each event is a little animated scene of a
 * teenage athlete (src/components/athletics/events).
 *
 * - Desktop: the section pins a stage while you scroll. Each event gets one
 *   scroll "beat"; the athlete's movement follows scroll position exactly, so
 *   scrolling back up plays it in reverse. The index underneath jumps to an
 *   event, and hovering or focusing a tile plays a short preview in it.
 * - Phones and tablets: no pinning. Swipeable cards, each playing its event
 *   once when it comes into view (tap to replay).
 * - Reduced motion: the same cards as still pictures, nothing moves.
 *
 * All the words are HTML (src/data/eventShowcase.ts); the pictures are
 * decorative.
 */

const COUNT = eventShowcase.length
/** The sticky site header (72px) plus its three 2px stripes, on md and up. */
const HEADER_PX = 78
/** Scroll distance per event, in viewport heights. */
const BEAT_VH = 65
const pad = (n: number) => String(n).padStart(2, '0')
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
/** One event's progress from the pinned section's progress, with a short hold at each end. */
const beatProgress = (s: number, i: number) => clamp01((s * COUNT - i - 0.06) / 0.88)

export function EventsExplorer() {
  const reduce = useReducedMotion()
  const wide = useMediaQuery('(min-width: 1024px)')
  return (
    <section aria-labelledby="explore-heading" className="relative bg-ink pt-20 text-cream md:pt-28">
      <Intro pinned={wide && !reduce} />
      {wide && !reduce ? <Pinned /> : <Cards still={!!reduce} />}
    </section>
  )
}

function Intro({ pinned }: { pinned: boolean }) {
  return (
    <div className="container-page">
      <p className="flex items-center gap-3 font-display text-lg font-extrabold uppercase tracking-[0.2em] text-signal-light">
        <span className="h-1 w-10 rounded-full bg-signal" aria-hidden />
        The events
      </p>
      <h2 id="explore-heading" className="display-xl mt-4 max-w-5xl text-[clamp(3.25rem,9vw,8rem)]">
        Explore the <span className="text-signal">seven</span> events
      </h2>
      <p className="mt-5 max-w-2xl text-lg text-cream/75 md:text-xl">
        From 7 years up, athletes rotate through the track and field events at club night. Our 3–6 year olds learn the
        same skills through games in Get Set Go.{' '}
        {pinned ? 'Scroll to see each event in action.' : 'Swipe through to see each event in action.'}
      </p>
    </div>
  )
}

// --- desktop: pinned, scroll-driven -----------------------------------------

function Pinned() {
  const trackRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: trackRef, offset: [`start ${HEADER_PX}px`, 'end end'] })
  const [active, setActive] = useState(0)
  useMotionValueEvent(scrollYProgress, 'change', (s) => {
    const i = Math.min(COUNT - 1, Math.max(0, Math.floor(s * COUNT)))
    setActive((prev) => (prev === i ? prev : i))
  })

  // Jump to an event: glide the page to the middle of its beat, where its
  // key moment is. Any wheel, touch or key press takes control back.
  const glide = useRef<AnimationPlaybackControls | null>(null)
  useEffect(() => {
    const stop = () => glide.current?.stop()
    const opts = { passive: true } as const
    window.addEventListener('wheel', stop, opts)
    window.addEventListener('touchstart', stop, opts)
    window.addEventListener('keydown', stop)
    return () => {
      stop()
      window.removeEventListener('wheel', stop)
      window.removeEventListener('touchstart', stop)
      window.removeEventListener('keydown', stop)
    }
  }, [])
  const jumpTo = useCallback((i: number) => {
    const el = trackRef.current
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY
    const start = top - HEADER_PX
    const end = top + el.offsetHeight - window.innerHeight
    const target = start + ((i + 0.5) / COUNT) * (end - start)
    glide.current?.stop()
    glide.current = animate(window.scrollY, target, {
      duration: Math.min(1.1, 0.45 + Math.abs(target - window.scrollY) / 4000),
      ease: [0.65, 0, 0.35, 1],
      onUpdate: (v) => window.scrollTo({ top: v, behavior: 'instant' as ScrollBehavior }),
    })
  }, [])

  const event = eventShowcase[active]
  return (
    <div ref={trackRef} className="relative mt-10" style={{ height: `calc(100svh + ${COUNT * BEAT_VH}vh)` }}>
      <div className="sticky flex flex-col justify-center gap-6 overflow-hidden py-6" style={{ top: HEADER_PX, height: `calc(100svh - ${HEADER_PX}px)` }}>
        <div className="container-page grid w-full grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-center gap-10 xl:gap-16">
          <div className="min-w-0">
            <Counter index={active} />
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                <EventCopy event={event} size="lg" />
              </motion.div>
            </AnimatePresence>
            <p className="sr-only" aria-live="polite">
              {event.name}, event {active + 1} of {COUNT}
            </p>
          </div>
          <div className="relative mx-auto aspect-[8/5] w-full max-w-[min(100%,calc((100svh-78px-220px)*1.6))]">
            {eventShowcase.map((e, i) => (
              <PinnedStage key={e.id} index={i} active={i === active} s={scrollYProgress} />
            ))}
            <ScrollCue s={scrollYProgress} />
          </div>
        </div>
        <nav aria-label="Events" className="container-page">
          <ol className="grid grid-cols-7 gap-3">
            {eventShowcase.map((e, i) => (
              <li key={e.id}>
                <IndexTile event={e} index={i} active={i === active} s={scrollYProgress} onPick={jumpTo} />
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </div>
  )
}

function PinnedStage({ index, active, s }: { index: number; active: boolean; s: MotionValue<number> }) {
  const p = useTransform(s, (v) => beatProgress(v, index))
  const scene = sceneById[eventShowcase[index].id]
  return (
    <motion.div
      className="absolute inset-0"
      initial={false}
      animate={{ opacity: active ? 1 : 0, scale: active ? 1 : 0.965, x: active ? 0 : 24 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      style={{ pointerEvents: 'none' }}
    >
      <StageFrame>
        <EventStage scene={scene} progress={p} decorative className="h-full w-full" />
      </StageFrame>
    </motion.div>
  )
}

/** "Scroll" hint over the first event, gone as soon as the page moves. */
function ScrollCue({ s }: { s: MotionValue<number> }) {
  const opacity = useTransform(s, [0, 0.02], [1, 0])
  return (
    <motion.div
      style={{ opacity }}
      aria-hidden
      className="pointer-events-none absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink/70 px-4 py-2 font-display text-sm font-extrabold uppercase tracking-[0.18em] text-cream ring-1 ring-cream/15 backdrop-blur"
    >
      <ChevronsDown className="h-4 w-4 animate-bounce text-signal-light" /> Scroll to play
    </motion.div>
  )
}

function Counter({ index }: { index: number }) {
  return (
    <p className="mb-5 flex items-baseline gap-2 font-display font-black leading-none" aria-hidden>
      <span className="relative block h-[1em] overflow-hidden text-6xl text-signal xl:text-7xl">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={index}
            className="block"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {pad(index + 1)}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="text-2xl text-cream/45">/ {pad(COUNT)}</span>
    </p>
  )
}

/** A tile in the event index: mini stage, number, name and how far through it you are. */
function IndexTile({
  event,
  index,
  active,
  s,
  onPick,
}: {
  event: EventShowcase
  index: number
  active: boolean
  s: MotionValue<number>
  onPick: (i: number) => void
}) {
  const scene = sceneById[event.id]
  const fill = useTransform(s, (v) => clamp01(v * COUNT - index))
  const preview = usePreview(scene.poster)
  return (
    <button
      type="button"
      onClick={() => onPick(index)}
      onPointerEnter={preview.play}
      onFocus={preview.play}
      aria-current={active ? 'step' : undefined}
      aria-label={`${pad(index + 1)} ${event.name}`}
      className={cn(
        'group block w-full rounded-2xl p-1.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal',
        active ? 'bg-cream/10' : 'hover:bg-cream/5',
      )}
    >
      <span
        className={cn(
          'block overflow-hidden rounded-xl ring-1 transition-all',
          active ? 'ring-2 ring-signal' : 'opacity-70 ring-cream/10 group-hover:opacity-100',
        )}
      >
        <EventStage scene={scene} progress={preview.p} decorative className="block aspect-[8/5] w-full" />
      </span>
      <span className="mt-2 flex items-baseline gap-1.5 px-0.5 font-display font-extrabold uppercase leading-tight">
        <span className={cn('text-sm', active ? 'text-signal-light' : 'text-cream/50')}>{pad(index + 1)}</span>
        <span className={cn('truncate text-base tracking-wide', active ? 'text-cream' : 'text-cream/70')}>{event.name}</span>
      </span>
      <span className="mx-0.5 mt-1.5 block h-1 overflow-hidden rounded-full bg-cream/15" aria-hidden>
        <motion.span className="block h-full origin-left rounded-full bg-signal" style={{ scaleX: fill }} />
      </span>
    </button>
  )
}

/** Plays a short 0 → 1 preview of a scene, then settles back on its poster frame. */
function usePreview(poster: number, seconds = 1.1) {
  const p = useMotionValue(poster)
  const reduce = useReducedMotion()
  const ctl = useRef<AnimationPlaybackControls | null>(null)
  const play = useCallback(() => {
    if (reduce || ctl.current) return
    p.set(0)
    ctl.current = animate(p, 1, { duration: seconds, ease: 'linear' })
    ctl.current.finished.then(() => {
      p.set(poster)
      ctl.current = null
    })
  }, [p, poster, reduce, seconds])
  useEffect(() => () => ctl.current?.stop(), [])
  return { p, play }
}

// --- phones, tablets and reduced motion: cards ------------------------------

function Cards({ still }: { still: boolean }) {
  const [active, setActive] = useState(0)
  const railRef = useRef<HTMLOListElement>(null)

  useEffect(() => {
    const rail = railRef.current
    if (!rail) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) if (en.isIntersecting) setActive(Number((en.target as HTMLElement).dataset.index))
      },
      { root: rail, threshold: 0.6 },
    )
    rail.querySelectorAll('[data-index]').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  const go = (i: number) => {
    const rail = railRef.current
    const card = rail?.querySelector<HTMLElement>(`[data-index="${i}"]`)
    if (!rail || !card) return
    rail.scrollTo({ left: card.offsetLeft - (rail.clientWidth - card.offsetWidth) / 2, behavior: still ? 'auto' : 'smooth' })
  }

  return (
    <div className="pb-20 md:pb-28">
      <div className={cn('container-page mt-8', still && 'lg:hidden')}>
        <ul className="relative -mx-1 flex gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none]" aria-label="Jump to an event">
          {eventShowcase.map((e, i) => (
            <li key={e.id} className="shrink-0">
              <button
                type="button"
                onClick={() => go(i)}
                aria-current={i === active ? 'true' : undefined}
                aria-controls={`event-card-${e.id}`}
                className={cn(
                  'min-h-11 rounded-full px-4 py-2 font-display text-base font-extrabold uppercase tracking-wide transition-colors',
                  i === active ? 'bg-signal text-signal-ink' : 'bg-cream/10 text-cream/80 hover:bg-cream/15',
                )}
              >
                {e.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <ol
        ref={railRef}
        className={cn(
          'relative mt-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto scroll-smooth px-4 pb-4 [scrollbar-width:none] motion-reduce:scroll-auto md:scroll-px-12 md:px-12',
          still && 'lg:container-page lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible lg:px-12',
        )}
      >
        {eventShowcase.map((e, i) => (
          <li
            key={e.id}
            id={`event-card-${e.id}`}
            data-index={i}
            className={cn('w-[86%] shrink-0 snap-center sm:w-[62%] md:w-[48%]', still && 'lg:w-auto')}
          >
            <EventCard event={e} index={i} still={still} />
          </li>
        ))}
      </ol>
    </div>
  )
}

function EventCard({ event, index, still }: { event: EventShowcase; index: number; still: boolean }) {
  const scene = sceneById[event.id]
  const stageRef = useRef<HTMLDivElement>(null)
  const inView = useInView(stageRef, { amount: 0.6 })
  const p = useMotionValue(scene.poster)
  const fade = useMotionValue(1)
  const ctl = useRef<AnimationPlaybackControls | null>(null)

  const play = useCallback(async () => {
    if (still) return
    ctl.current?.stop()
    p.set(0)
    fade.set(1)
    ctl.current = animate(p, 1, { duration: 2.6, ease: 'linear' })
    await ctl.current.finished
    if (p.get() < 1) return // interrupted
    // Settle on the key moment: fade out, swap to the poster, fade in.
    await animate(fade, 0, { duration: 0.2 })
    p.set(scene.poster)
    await animate(fade, 1, { duration: 0.35 })
  }, [fade, p, scene.poster, still])

  useEffect(() => {
    if (inView) play()
    else {
      ctl.current?.stop()
      p.set(scene.poster)
      fade.set(1)
    }
  }, [inView, play, p, fade, scene.poster])

  return (
    <article className="flex h-full flex-col">
      <div ref={stageRef} className="relative">
        <motion.div style={{ opacity: fade }}>
          <StageFrame>
            <EventStage scene={scene} progress={p} decorative className="block aspect-[8/5] w-full" />
          </StageFrame>
        </motion.div>
        {!still && (
          <button
            type="button"
            onClick={play}
            className="absolute bottom-3 right-3 grid h-11 w-11 place-items-center rounded-full bg-ink/70 text-cream ring-1 ring-cream/20 backdrop-blur transition-colors hover:bg-ink"
            aria-label={`Play the ${event.name.toLowerCase()} animation again`}
          >
            <RotateCcw className="h-5 w-5" aria-hidden />
          </button>
        )}
      </div>
      <p className="mt-5 font-display text-base font-extrabold uppercase tracking-[0.18em] text-cream/50">
        <span className="text-signal-light">{pad(index + 1)}</span> / {pad(COUNT)}
      </p>
      <EventCopy event={event} size="sm" />
    </article>
  )
}

// --- shared -----------------------------------------------------------------

/** The rounded navy panel every stage sits in. */
function StageFrame({ children }: { children: ReactNode }) {
  return (
    <div className="h-full overflow-hidden rounded-[1.75rem] bg-[#0b2341] shadow-[0_30px_80px_-24px_rgba(0,0,0,0.65)] ring-1 ring-cream/10">
      {children}
    </div>
  )
}

function EventCopy({ event, size }: { event: EventShowcase; size: 'lg' | 'sm' }) {
  const lg = size === 'lg'
  return (
    <div>
      <h3 className={cn('display-xl', lg ? 'text-[clamp(3.5rem,6.2vw,6.25rem)]' : 'mt-1 text-5xl')}>{event.name}</h3>
      <p className={cn('mt-2 font-display font-extrabold uppercase tracking-wide text-sky-soft', lg ? 'text-2xl' : 'text-xl')}>
        {event.tagline}
      </p>
      <p className={cn('mt-4 max-w-xl text-cream/80', lg ? 'text-lg' : 'text-base')}>{event.description}</p>
      <dl className="mt-5 space-y-2 text-sm text-cream/75">
        <div className="flex items-start gap-2.5">
          <dt className="mt-0.5">
            <Users className="h-4 w-4 text-signal-light" aria-hidden />
            <span className="sr-only">Who</span>
          </dt>
          <dd>{event.who}</dd>
        </div>
        <div className="flex items-start gap-2.5">
          <dt className="mt-0.5">
            <MapPin className="h-4 w-4 text-signal-light" aria-hidden />
            <span className="sr-only">Where</span>
          </dt>
          <dd>{event.where}</dd>
        </div>
      </dl>
      <Link to={event.cta.to} className={cn(buttonVariants({ size: lg ? 'lg' : 'default' }), 'mt-6')}>
        {event.cta.label} <ArrowRight aria-hidden />
      </Link>
    </div>
  )
}

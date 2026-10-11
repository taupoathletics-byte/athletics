import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { athleticsIcons, type AthleticsIconName } from './icons'
import { Reveal, SectionLabel } from './motion'

const EVENTS: { name: string; icon: AthleticsIconName; bg: string; lane: string }[] = [
  { name: 'Sprints', icon: 'Stopwatch', bg: '#c8553d', lane: '#fbf5ea' },
  { name: 'Hurdles', icon: 'Hurdle', bg: '#0d4f4a', lane: '#ff7f50' },
  { name: 'Long jump', icon: 'Bib', bg: '#ff7f50', lane: '#0c2033' },
  { name: 'High jump', icon: 'Medal', bg: '#1b4466', lane: '#ffd700' },
  { name: 'Shot put', icon: 'ShotPut', bg: '#c8553d', lane: '#0c2033' },
  { name: 'Discus', icon: 'Discus', bg: '#0d4f4a', lane: '#fbf5ea' },
  { name: 'Relays', icon: 'Baton', bg: '#7fa6cc', lane: '#0c2033' },
  { name: 'Distance', icon: 'Rosette', bg: '#1b4466', lane: '#ff7f50' },
]

/** Round "venue ball" badges from Sixes, as event badges striped like lanes. */
function Badge({ e }: { e: (typeof EVENTS)[number] }) {
  const Icon = athleticsIcons[e.icon]
  return (
    <div
      className="relative grid size-44 shrink-0 place-items-center overflow-hidden rounded-full shadow-floating md:size-56"
      style={{
        background: `repeating-linear-gradient(90deg, ${e.bg} 0 22%, ${e.lane} 22% 25%, ${e.bg} 25% 47%, ${e.lane} 47% 50%)`,
      }}
    >
      <span className="absolute inset-[18%] rounded-full" style={{ background: e.bg }} aria-hidden />
      <Icon className="absolute left-1/2 top-[14%] h-14 w-14 -translate-x-1/2 md:h-16 md:w-16" />
      <span className="relative mt-12 px-4 text-center font-display text-3xl font-black uppercase leading-none text-cream md:text-4xl">
        {e.name}
      </span>
    </div>
  )
}

export function EventBadges() {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const x = useTransform(scrollYProgress, [0, 1], ['6%', '-38%'])

  return (
    <section ref={ref} className="relative overflow-hidden bg-cream py-20 md:py-28" aria-labelledby="events-heading">
      <Reveal className="container-page text-center">
        <SectionLabel>
          <span id="events-heading">Every kid tries every event</span>
        </SectionLabel>
        <p className="mx-auto mt-3 max-w-xl text-on-surface-variant">
          Grades 7–14 rotate through sprints, distance, jumps, throws and relays each night. Our 3–6 year olds learn the
          same skills through games in Get Set Go.
        </p>
        <Link
          to="/club-nights"
          className="mt-5 inline-flex rounded-full bg-coral-active px-6 py-2.5 font-display text-lg font-extrabold uppercase tracking-wide text-coral-ink shadow-coral-sm transition-transform hover:-translate-y-0.5"
        >
          See how a night runs
        </Link>
      </Reveal>
      <motion.ul style={reduce ? undefined : { x }} className={`mt-12 flex w-max gap-5 px-6 ${reduce ? 'overflow-x-auto' : ''}`}>
        {EVENTS.map((e) => (
          <li key={e.name}>
            <Badge e={e} />
          </li>
        ))}
      </motion.ul>
    </section>
  )
}

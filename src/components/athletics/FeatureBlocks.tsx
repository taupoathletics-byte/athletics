import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Photo } from '@/components/Photo'
import { developmentSquad } from '@/data/clubNights'
import { cn } from '@/lib/utils'
import { EventFloater } from './EventIcon'
import { Reveal } from './motion'

interface Block {
  photo: number
  eyebrow: string
  title: string
  body: string
  cta: { label: string; to?: string; href?: string }
  band: string
}

const BLOCKS: Block[] = [
  {
    photo: 35,
    eyebrow: 'For families',
    title: 'Your results, your PBs',
    body: 'Every result recorded on club nights lands in your family’s own record. Ask the sign-in desk for your family access code, then open My Results to see every jump, throw and time — and watch the PBs roll in.',
    cta: { label: 'View my results', to: '/my-results' },
    band: 'bg-sky',
  },
  {
    photo: 26,
    eyebrow: `${developmentSquad.day} · ${developmentSquad.start}–${developmentSquad.finish}`,
    title: 'Development Squad',
    body: `${developmentSquad.detail} ${developmentSquad.who} No extra fee.`,
    cta: { label: 'Club nights & squad', to: '/club-nights' },
    band: 'bg-ink-3',
  },
  {
    photo: 41,
    eyebrow: 'Powered by volunteers',
    title: 'Lend a hand on the night',
    body: 'Timing, measuring, moving groups and packing down — no athletics experience needed. The Get Set Go sessions are planned for you, with equipment ready and plenty of support. More helpers means more places for kids.',
    cta: { label: 'See volunteer roles', to: '/volunteer' },
    band: 'bg-primary',
  },
]

/** Alternating photo + copy rows with lane-coloured blocks running off the edge (Sixes events page). */
export function FeatureBlocks() {
  return (
    <section className="relative overflow-hidden bg-cream py-16 md:py-24" aria-label="More from the club">
      <EventFloater event="high-jump" className="right-[3%] top-[30%] hidden h-28 w-28 lg:block" speed={120} />
      <EventFloater event="relays" className="left-[2%] top-[64%] hidden h-28 w-28 lg:block" speed={100} />
      <div className="space-y-20 md:space-y-28">
        {BLOCKS.map((b, i) => {
          const flip = i % 2 === 1
          return (
            <div key={b.title} className="container-page grid items-center gap-10 md:grid-cols-2 md:gap-16">
              <Reveal className={cn('relative', flip && 'md:order-2')}>
                {/* stripe blocks that run off the page edge behind the photo */}
                <span
                  aria-hidden
                  className={cn('absolute top-[14%] h-[22%] w-[150%]', b.band, flip ? 'left-[20%]' : 'right-[20%]')}
                />
                <span
                  aria-hidden
                  className={cn('absolute top-[58%] h-[22%] w-[150%]', b.band, flip ? 'left-[20%]' : 'right-[20%]')}
                />
                <Photo id={b.photo} sizes="(min-width: 768px) 45vw, 100vw" className="relative aspect-[4/3] w-full rounded-2xl shadow-floating" />
              </Reveal>
              <Reveal delay={0.1} className={cn(flip && 'md:order-1')}>
                <p className="font-display text-lg font-extrabold uppercase tracking-[0.14em] text-on-signal">{b.eyebrow}</p>
                <h2 className="display-xl mt-2 text-5xl text-ink md:text-6xl">{b.title}</h2>
                <p className="mt-4 max-w-lg text-lg text-on-surface-variant">{b.body}</p>
                <Link
                  to={b.cta.to!}
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-signal px-6 py-2.5 font-display text-lg font-extrabold uppercase tracking-wide text-signal-ink shadow-signal-sm transition-transform hover:-translate-y-0.5"
                >
                  {b.cta.label} <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Reveal>
            </div>
          )
        })}
      </div>
    </section>
  )
}

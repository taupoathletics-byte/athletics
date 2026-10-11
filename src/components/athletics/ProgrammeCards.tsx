import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Photo } from '@/components/Photo'
import { Reveal, TrackBands } from './motion'

const CARDS = [
  { photo: 46, title: 'Little legs, big starts', cta: 'Get Set Go', to: '/club-nights', note: 'Grades 3–6 · 5:30–6:30pm' },
  { photo: 37, title: 'Run, jump & throw', cta: 'Club nights', to: '/club-nights', note: 'Grades 7–14 · 5:30–7:00pm' },
  { photo: 38, title: 'Ribbon days & big meets', cta: 'Events', to: '/events', note: 'Across the Waikato & BOP' },
]

/** Three tall photo cards with heavy headlines over a band of running-track lanes. */
export function ProgrammeCards() {
  return (
    <section className="relative overflow-hidden bg-teal-deep py-16 md:py-24" aria-labelledby="programmes-heading">
      <h2 id="programmes-heading" className="sr-only">
        Programmes
      </h2>
      <TrackBands className="top-[18%] h-[64%]" lanes={3} />
      <div className="container-page relative grid gap-5 md:grid-cols-3">
        {CARDS.map((c, i) => (
          <Reveal key={c.title} delay={i * 0.08}>
            <Link
              to={c.to}
              className="group relative block aspect-[3/4] overflow-hidden rounded-2xl bg-ink ring-4 ring-teal-deep focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-coral-active md:aspect-[4/5.4]"
            >
              <Photo id={c.photo} sizes="(min-width: 768px) 33vw, 100vw" className="absolute inset-0 h-full w-full transition-transform duration-700 group-hover:scale-105" />
              <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
              <span className="absolute inset-x-0 bottom-0 flex flex-col items-center p-6 text-center">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-sky-soft">{c.note}</span>
                <span className="display-xl mt-2 text-5xl text-cream md:text-[3.4rem]">{c.title}</span>
                <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-coral-active px-5 py-2 font-display text-lg font-extrabold uppercase tracking-wide text-coral-ink transition-transform group-hover:-translate-y-0.5">
                  {c.cta} <ArrowRight className="h-4 w-4" aria-hidden />
                </span>
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

import { Link } from 'react-router-dom'
import { committee } from '@/data/committee'
import { athleticsIcons, type AthleticsIconName } from './icons'
import { Marquee, SectionLabel } from './motion'

function iconFor(favourite: string): AthleticsIconName {
  const f = favourite.toLowerCase()
  if (/discus/.test(f)) return 'Discus'
  if (/shot/.test(f)) return 'ShotPut'
  if (/high jump/.test(f)) return 'Medal'
  if (/long jump/.test(f)) return 'Bib'
  if (/relay/.test(f)) return 'Baton'
  if (/hurdle/.test(f)) return 'Hurdle'
  if (/100m|sprint|track|gun/.test(f)) return 'Stopwatch'
  return 'Rosette'
}

/** Real answers from the committee's own profile cards — no invented testimonials. */
const CREW = committee
  .flatMap((g) => g.people)
  .filter((p) => p.qa && p.qa.length)
  .map((p) => {
    const proud = p.qa!.find((q) => /moving|proudest/i.test(q.q)) ?? p.qa![0]
    const fav = p.qa!.find((q) => /favourite event/i.test(q.q))
    return { name: p.name, role: p.role, quote: proud.a, q: proud.q, fav: fav?.a ?? '' }
  })

export function CrewQuotes() {
  const cards = CREW.map((c) => {
    const Icon = athleticsIcons[iconFor(c.fav)]
    return (
      <figure key={c.name} className="relative w-[300px] shrink-0 rounded-xl bg-cream p-5 pt-6 text-left shadow-floating md:w-[340px]">
        <Icon className="absolute -right-3 -top-5 h-14 w-14" />
        <figcaption className="font-display text-xl font-black uppercase leading-tight text-ink">{c.q.replace('?', '')}</figcaption>
        <blockquote className="mt-2 text-[15px] leading-snug text-on-surface">&ldquo;{c.quote}&rdquo;</blockquote>
        <p className="mt-4 text-sm font-bold text-ink">
          {c.name}
          <span className="block font-normal text-on-surface-variant">{c.role}</span>
        </p>
        {c.fav && (
          <span className="mt-3 inline-block rounded-full bg-coral-active/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-on-coral">
            Fave: {c.fav.split(/\s[—–-]\s|[!.:]/)[0].trim()}
          </span>
        )}
      </figure>
    )
  })
  return (
    <section className="relative overflow-hidden bg-ink py-16 md:py-24" aria-labelledby="crew-heading">
      <div className="container-page text-center">
        <SectionLabel tone="cream">
          <span id="crew-heading">Meet the crew</span>
        </SectionLabel>
        <p className="mx-auto mt-3 max-w-xl text-cream/75">
          Volunteers run everything — from the sign-in desk to the start line. In their own words:
        </p>
      </div>
      <Marquee className="mask-fade-x mt-10 py-4" items={cards} itemClassName="gap-6 pr-6" />
      <div className="mt-8 text-center">
        <Link to="/team" className="inline-flex rounded-full border-2 border-cream/80 px-6 py-2.5 font-display text-lg font-extrabold uppercase tracking-wide text-cream transition-colors hover:bg-cream hover:text-ink">
          Meet the whole team
        </Link>
      </div>
    </section>
  )
}

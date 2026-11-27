import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, Facebook, MessagesSquare, ShieldCheck, Sparkles, Timer, Users } from 'lucide-react'
import { PageHero } from '@/components/PageHero'
import { Photo } from '@/components/Photo'
import { buttonVariants } from '@/components/ui/button'
import { developmentSquad, developmentSquadTimeLabel } from '@/data/clubNights'
import { clubName, contactEmail, seasonDates } from '@/data/site'

const FACTS = [
  {
    icon: Users,
    title: 'Grades 10+',
    body: 'For our older athletes — and masters athletes are welcome too.',
  },
  {
    icon: ShieldCheck,
    title: 'Self-selected',
    body: 'Choose to come. There is no trial and no selection process.',
  },
  {
    icon: Sparkles,
    title: 'No extra fee',
    body: 'It is part of your club night membership, at no additional cost.',
  },
]

const FOCUS = [
  'The more technical components of your events — run-ups, take-off, release and landing.',
  'Strength, agility and power that carry across every event.',
  'Confidence to step up at Ribbon Days, Colgate Games and championship meets.',
]

/**
 * Development Squad — the Monday extension of club nights for Grades 10+.
 * Everything here comes from `developmentSquad` in src/data/clubNights.ts.
 */
export default function DevelopmentSquad() {
  return (
    <>
      <PageHero
        eyebrow={`${developmentSquad.day} · ${developmentSquadTimeLabel}`}
        title="Development Squad"
        subtitle="An extension of club nights for athletes who want to work on the technical side of their events."
        photo={35}
        event="long-jump"
      />

      <section className="container-page section-pad">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <div>
            <p className="max-w-2xl text-lg text-on-surface-variant">
              Development Squad is an extension of club nights for athletes in{' '}
              <strong className="text-on-surface">Grades 10 and above</strong>. It is self-selected and carries{' '}
              <strong className="text-on-surface">no extra fee</strong> — you simply choose to come along.
            </p>
            <p className="mt-4 max-w-2xl text-lg text-on-surface-variant">
              The sessions are for those interested in working on the more technical components of their events, and
              in building the strength, agility and power that improve performance and confidence.
            </p>

            <h2 className="mt-10 font-display text-2xl font-bold text-on-surface">What we work on</h2>
            <ul className="mt-4 space-y-3">
              {FOCUS.map((f) => (
                <li key={f} className="flex gap-3 text-on-surface-variant">
                  <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-signal" aria-hidden />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <div className="mt-10 rounded-xl border-l-4 border-l-signal bg-white p-gutter-sm shadow-soft">
              <div className="flex items-center gap-2 text-on-signal">
                <MessagesSquare className="h-5 w-5" aria-hidden />
                <h2 className="font-display text-xl font-bold text-on-surface">Talk to coach Leah</h2>
              </div>
              <p className="mt-2 text-on-surface-variant">
                For more details, talk to coach Leah at club night, email{' '}
                <a className="font-semibold text-primary underline" href={`mailto:${contactEmail}`}>
                  {contactEmail}
                </a>
                , or search for the closed Facebook group &lsquo;{developmentSquad.facebookGroup}&rsquo;.
              </p>
              <a
                href={developmentSquad.facebookGroupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${buttonVariants({ variant: 'mint' })} mt-4`}
              >
                <Facebook className="mr-2 h-4 w-4" aria-hidden />
                Join the Facebook group
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <Photo id={35} sizes="(min-width: 1024px) 40vw, 100vw" className="aspect-[4/3] w-full rounded-xl shadow-soft" />

            <div className="rounded-xl bg-white p-gutter-sm shadow-soft">
              <div className="mb-3 flex items-center gap-2 text-sky-info">
                <CalendarDays className="h-5 w-5" aria-hidden />
                <h2 className="font-bold text-on-surface">Squad dates</h2>
              </div>
              <p className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                <Timer className="h-4 w-4 text-signal" aria-hidden />
                {developmentSquad.day}s, {developmentSquadTimeLabel}
              </p>
              <ul className="mt-2 space-y-2 text-on-surface-variant">
                {seasonDates.developmentSquad.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {FACTS.map((f) => (
                <div key={f.title} className="rounded-xl bg-white p-4 shadow-soft">
                  <p className="flex items-center gap-2 font-bold text-on-surface">
                    <f.icon className="h-5 w-5 text-signal" aria-hidden />
                    {f.title}
                  </p>
                  <p className="mt-1 text-sm text-on-surface-variant">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-12 text-on-surface-variant">
          Development Squad is a training add-on — club night stays the first priority.{' '}
          <Link to="/club-nights" className="font-semibold text-primary underline">
            How club nights run
          </Link>
          .
        </p>

        <hr className="mt-10 border-outline-variant" />
        <p className="mt-6 text-sm text-on-surface-variant">
          {clubName} · Development Squad runs alongside the club-night season.
        </p>
      </section>
    </>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Car, Clock, CloudRain, Facebook, HandHeart, MapPin, QrCode, Timer, X } from 'lucide-react'
import { PageHero } from '@/components/PageHero'
import { Photo } from '@/components/Photo'
import { FacebookFeed } from '@/components/FacebookFeed'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { clubName, links, seasonDates, venue } from '@/data/site'
import { GSG, RJT, developmentSquad, developmentSquadTimeLabel, eveningTimeline } from '@/data/clubNights'

export default function ClubNights() {
  const [timelineOpen, setTimelineOpen] = useState(false)

  useEffect(() => {
    if (!timelineOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTimelineOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [timelineOpen])

  return (
    <>
      <PageHero
        eyebrow="Every Thursday"
        title="Club Nights"
        subtitle={`Club nights take place every Thursday (weather permitting) beginning at 5:30pm.`}
        photo={41}
      />

      {/* Arriving: where, when and what to do first. */}
      <section className="container-page pt-gutter-md">
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <li>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.mapsQuery)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-full items-start gap-3 rounded-xl bg-white p-gutter-sm shadow-soft transition-shadow hover:shadow-floating"
            >
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-signal" aria-hidden />
              <span>
                <span className="block font-bold text-on-surface">{venue.name}</span>
                <span className="text-on-surface-variant">{venue.address} · open in Maps</span>
              </span>
            </a>
          </li>
          <li className="flex items-start gap-3 rounded-xl bg-white p-gutter-sm shadow-soft">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-signal" aria-hidden />
            <span>
              <span className="block font-bold text-on-surface">Thursdays from 5:30pm</span>
              <span className="text-on-surface-variant">
                {GSG} until 6:30pm
                <br />
                {RJT} until 7:00pm
              </span>
            </span>
          </li>
          <li className="flex items-start gap-3 rounded-xl bg-white p-gutter-sm shadow-soft">
            <Car className="mt-0.5 h-5 w-5 shrink-0 text-signal" aria-hidden />
            <span>
              <span className="block font-bold text-on-surface">Parking</span>
              <span className="text-on-surface-variant">Park opposite the netball courts and walk down to the field.</span>
            </span>
          </li>
          <li>
            <Link to="/check-in" className="flex h-full items-start gap-3 rounded-xl bg-white p-gutter-sm shadow-soft transition-shadow hover:shadow-floating">
              <QrCode className="mt-0.5 h-5 w-5 shrink-0 text-signal" aria-hidden />
              <span>
                <span className="block font-bold text-on-surface">Check in when you arrive</span>
                <span className="text-on-surface-variant">At the check-in desk, or on your phone.</span>
              </span>
            </Link>
          </li>
        </ul>
      </section>

      {/* Weather call — prominent, because this is the thing families need. */}
      <section className="mt-gutter-md bg-signal/10">
        <div className="container-page flex flex-wrap items-center gap-4 py-4">
          <CloudRain className="h-6 w-6 shrink-0 text-signal" aria-hidden />
          <p className="font-semibold text-on-surface">
            Weather call by 4pm Thursday on Facebook.
          </p>
          <a
            href={links.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className={`${buttonVariants({ variant: 'outline' })} ml-auto`}
          >
            <Facebook className="mr-2 h-4 w-4" aria-hidden />
            Check Facebook
          </a>
        </div>
      </section>

      {/* The feed itself, so a family never has to leave the page to check. */}
      <section className="container-page pt-gutter-md">
        <FacebookFeed />
      </section>

      <section className="container-page section-pad">
        <p className="max-w-3xl text-lg text-on-surface-variant">
          All ages start with a jog and some stretches to warm up, then split into their age groups.
        </p>

        {/* Two groups, side by side */}
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <article id="get-set-go" className="scroll-mt-24 overflow-hidden rounded-xl border-l-4 border-l-tertiary bg-white shadow-soft">
            <Photo id={39} sizes="(min-width: 768px) 50vw, 100vw" className="aspect-[16/9] w-full" />
            <div className="p-gutter-sm">
              <Badge className="bg-tertiary text-white">{GSG}</Badge>
              <h2 className="mt-3 font-display text-2xl font-bold text-on-surface">Grades 3–6</h2>
              <p className="mt-1 font-semibold text-tertiary">Thursdays 5:30–6:30pm</p>
              <p className="mt-3 text-on-surface-variant">
                Running races and other game-based activities in small groups, run by our coaches with parents helping
                at every station. Parents stay for the whole session.
              </p>
              <button
                type="button"
                onClick={() => setTimelineOpen(true)}
                className={`${buttonVariants({ variant: 'outline' })} mt-4`}
              >
                How the Night runs →
              </button>
            </div>
          </article>

          <article id="run-jump-throw" className="scroll-mt-24 overflow-hidden rounded-xl border-l-4 border-l-signal bg-white shadow-soft">
            <Photo id={35} sizes="(min-width: 768px) 50vw, 100vw" className="aspect-[16/9] w-full" />
            <div className="p-gutter-sm">
              <Badge className="bg-signal text-signal-ink">{RJT}</Badge>
              <h2 className="mt-3 font-display text-2xl font-bold text-on-surface">Grades 7–14</h2>
              <p className="mt-1 font-semibold text-on-signal">Thursdays 5:30–7:00pm</p>
              <p className="mt-3 text-on-surface-variant">
                Athletes rotate through four stations: a mix of game-based activities from the {RJT} programme and
                event-specific practice, with coaching on safe and proper use of equipment. If there&rsquo;s time, we
                finish with a relay.
              </p>
              <button
                type="button"
                onClick={() => setTimelineOpen(true)}
                className={`${buttonVariants({ variant: 'outline' })} mt-4`}
              >
                How the Night runs →
              </button>
            </div>
          </article>
        </div>
      </section>

      {/* Recording & parent help */}
      <section className="container-page section-pad">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-xl bg-white p-gutter-sm shadow-soft">
            <div className="flex items-center gap-2 text-sky-info">
              <Timer className="h-5 w-5" aria-hidden />
              <h2 className="font-display text-xl font-bold text-on-surface">Recording results</h2>
            </div>
            <p className="mt-3 text-on-surface-variant">
              We try to measure all events at least once during Term 4 and again in Term 1, and give the children a
              record of how they have done over the season.
            </p>
            <Link to="/club-records" className={`${buttonVariants({ variant: 'outline' })} mt-4`}>
              See all-time club records
            </Link>
          </div>

          <div className="rounded-xl border-l-4 border-l-signal bg-white p-gutter-sm shadow-soft">
            <div className="flex items-center gap-2 text-on-signal">
              <HandHeart className="h-5 w-5" aria-hidden />
              <h2 className="font-display text-xl font-bold text-on-surface">Parent help</h2>
            </div>
            <p className="mt-3 text-on-surface-variant">
              Parent help is always needed and is a great way to encourage our children. We need hands each week for
              setting up, timing and recording, moving groups around, and packing up.
            </p>
            <Link to="/volunteer" className={`${buttonVariants({ variant: 'mint' })} mt-4`}>
              Help on club night
            </Link>
          </div>
        </div>
      </section>

      {/* Season dates + dev squad */}
      <section className="container-page pb-gutter-md">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-xl bg-white p-gutter-sm shadow-soft">
            <div className="mb-3 flex items-center gap-2 text-sky-info">
              <CalendarDays className="h-5 w-5" aria-hidden />
              <h2 className="font-bold text-on-surface">{clubName} season dates</h2>
            </div>
            <ul className="space-y-2 text-on-surface-variant">
              {seasonDates.clubNights.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl bg-white p-gutter-sm shadow-soft">
            <div className="mb-3 flex items-center gap-2 text-sky-info">
              <CalendarDays className="h-5 w-5" aria-hidden />
              <h2 className="font-bold text-on-surface">Development Squad</h2>
            </div>
            <p className="text-on-surface-variant">
              {developmentSquad.day} {developmentSquadTimeLabel}. {developmentSquad.who}
            </p>
            <ul className="mt-2 space-y-2 text-on-surface-variant">
              {seasonDates.developmentSquad.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
            <Link to="/devsquad" className={`${buttonVariants({ variant: 'outline' })} mt-4`}>
              About Development Squad
            </Link>
          </div>
        </div>
      </section>

      {timelineOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setTimelineOpen(false)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="evening-runs-heading"
            className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-gutter-md shadow-floating"
          >
            <button
              type="button"
              onClick={() => setTimelineOpen(false)}
              aria-label="Close"
              className="absolute right-3 top-3 rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
            <h2 id="evening-runs-heading" className="font-display text-2xl font-bold text-on-surface">
              How the evening runs
            </h2>
            <ol className="mt-6 space-y-0">
              {eveningTimeline.map((step, i) => (
                <li key={step.time} className="relative flex gap-5 pb-6 last:pb-0">
                  {i < eveningTimeline.length - 1 && (
                    <span className="absolute left-[15px] top-8 h-full w-0.5 bg-outline-variant" aria-hidden />
                  )}
                  <span className="relative z-10 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-display text-lg font-bold text-primary">{step.time}</p>
                    <h3 className="font-bold text-on-surface">{step.title}</h3>
                    <p className="mt-1 text-on-surface-variant">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </>
  )
}

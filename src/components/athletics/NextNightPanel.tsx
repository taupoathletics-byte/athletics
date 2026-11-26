import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CloudSun, MapPin, QrCode } from 'lucide-react'
import { RegisterButton } from '@/components/RegisterButton'
import { clubNightGroups, formatClubNightLabel, groupTimeLabel, nextClubNight } from '@/data/clubNights'
import { registration } from '@/data/fees'
import { venue } from '@/data/site'
import { Odometer } from './Odometer'
import { EventFloater } from './EventIcon'
import { JavelinLanding } from './JavelinFlight'
import { Reveal, SectionLabel } from './motion'

function useTick(ms: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

const GROUP_COPY: Record<string, string> = {
  juniors: 'Games-based running, jumping and throwing in small groups, with coaches and whānau helping.',
  seniors: 'Four stations: game-based activities from the ASB Run Jump Throw programme and event-specific practice.',
}

/**
 * The Sixes "Book party cricket" card, re-imagined: a cream card with a
 * running-lane frame that counts down to the next club night.
 */
export function NextNightPanel() {
  const now = useTick(1000)
  const next = nextClubNight(new Date(now))

  const diff = next ? Math.max(0, next.when.getTime() - now) : 0
  const d = Math.floor(diff / 86_400_000)
  const h = Math.floor((diff % 86_400_000) / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  const s = Math.floor((diff % 60_000) / 1000)

  return (
    <section className="relative overflow-hidden bg-[linear-gradient(to_bottom,#0c2033_0,#0c2033_45%,#a9c6de_45%,#a9c6de_100%)] pb-20 pt-16 md:pt-24">
      {/* Hidden on phones, where it would sit over the opening line */}
      <EventFloater event="shot-put" className="left-[8%] top-[6%] hidden h-28 w-28 md:block" speed={60} />
      {/* Where the javelin thrown from the header lands */}
      <JavelinLanding className="right-[9%] top-[4%] md:top-[7%] xl:right-[8%] xl:top-[45%]" />

      <div className="container-page relative">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="font-display text-2xl font-extrabold leading-tight text-cream md:text-3xl">
            Sprints, jumps, throws and relays for ages 3–14 — every Thursday through Term 4 and Term 1 at {venue.name}.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="mx-auto mt-12 max-w-4xl">
          <div className="lane-frame rounded-[6px] bg-cream px-5 py-8 md:px-12 md:py-10">
            <SectionLabel>{next?.isTonight ? 'Club night is tonight' : 'Next club night'}</SectionLabel>
            {next ? (
              <>
                <p className="mt-2 text-center font-display text-3xl font-black uppercase text-ink md:text-4xl">
                  {formatClubNightLabel(next.iso)} · 5:30pm
                </p>
                <Odometer
                  className="mt-6"
                  label={`${plural(d, 'day')}, ${plural(h, 'hour')}, ${plural(m, 'minute')} until the next club night`}
                  groups={[
                    { value: d, label: 'days' },
                    { value: h, label: 'hrs' },
                    { value: m, label: 'mins' },
                    { value: s, label: 'secs' },
                  ]}
                />
              </>
            ) : (
              <p className="mt-4 text-center text-lg text-on-surface-variant">
                That&rsquo;s a wrap for the season — see you in Term 4. Registrations open on GameDay.
              </p>
            )}

            {/* Both programmes side by side — no tabs to find */}
            <div className="mt-8 grid gap-3 md:grid-cols-2">
              {clubNightGroups.map((g) => (
                <div key={g.id} className="rounded-lg border border-ink/10 bg-white px-4 py-3 text-sm">
                  <p className="font-display text-lg font-extrabold uppercase tracking-wide text-track">{g.programme}</p>
                  <p className="font-display text-2xl font-black text-ink">
                    {g.label} · {groupTimeLabel(g)}
                  </p>
                  <p className="text-on-surface-variant">{GROUP_COPY[g.id]}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.mapsQuery)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 rounded-lg border border-ink/10 bg-white px-4 py-3 transition-colors hover:border-ink/30"
              >
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-track" aria-hidden />
                <span>
                  <span className="block font-bold text-ink">{venue.name}</span>
                  <span className="text-on-surface-variant">{venue.address} · open in Maps</span>
                </span>
              </a>
              <div className="flex items-start gap-3 rounded-lg border border-ink/10 bg-white px-4 py-3">
                <CloudSun className="mt-0.5 h-5 w-5 shrink-0 text-track" aria-hidden />
                <span>
                  <span className="block font-bold text-ink">Weather call by 4pm</span>
                  <span className="text-on-surface-variant">Cancellations go on Facebook — check before you leave.</span>
                </span>
              </div>
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <RegisterButton className="px-7 py-3 text-base">Register for {registration.seasonLabel}</RegisterButton>
              <Link
                to="/check-in"
                className="inline-flex items-center gap-2 rounded-full border-2 border-ink px-6 py-3 font-bold text-ink transition-colors hover:bg-ink hover:text-cream"
              >
                <QrCode className="h-4 w-4" aria-hidden /> Check in on the night
              </Link>
            </div>

            <p className="mx-auto mt-6 flex max-w-2xl items-start gap-2 rounded-lg bg-signal/15 px-4 py-3 text-sm text-on-signal">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{registration.closedNote}</span>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

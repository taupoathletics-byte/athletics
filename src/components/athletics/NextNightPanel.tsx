import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CloudSun, MapPin, QrCode } from 'lucide-react'
import { RegisterButton } from '@/components/RegisterButton'
import { clubNightGroups, formatClubNightLabel, groupTimeLabel, nextClubNight } from '@/data/clubNights'
import { registration } from '@/data/fees'
import { venue } from '@/data/site'
import { cn } from '@/lib/utils'
import { Odometer } from './Odometer'
import { Floater, Reveal, SectionLabel } from './motion'

function useTick(ms: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

const GROUP_COPY: Record<string, string> = {
  juniors: 'Get Set Go: games-based running, jumping and throwing in four small-group rotations.',
  seniors: 'Track and field rotations — sprints, distance, jumps, throws — and a relay to finish.',
}

/**
 * The Sixes "Book party cricket" card, re-imagined: a cream card with a
 * running-lane frame that counts down to the next club night.
 */
export function NextNightPanel() {
  const now = useTick(1000)
  const next = nextClubNight(new Date(now))
  const [tab, setTab] = useState(clubNightGroups[0].id)
  const group = clubNightGroups.find((g) => g.id === tab) ?? clubNightGroups[0]

  const diff = next ? Math.max(0, next.when.getTime() - now) : 0
  const d = Math.floor(diff / 86_400_000)
  const h = Math.floor((diff % 86_400_000) / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  const s = Math.floor((diff % 60_000) / 1000)

  return (
    <section className="relative overflow-hidden bg-[linear-gradient(to_bottom,#0c2033_0,#0c2033_45%,#a9c6de_45%,#a9c6de_100%)] pb-20 pt-16 md:pt-24">
      <Floater icon="Discus" className="left-[4%] top-[10%] h-16 w-16 md:left-[10%] md:h-24 md:w-24" speed={140} spin={120} />
      <Floater icon="Rosette" className="right-[4%] top-[6%] h-20 w-20 md:right-[10%] md:h-28 md:w-28" speed={110} spin={-30} />

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
                  label={`${d} days, ${h} hours, ${m} minutes until the next club night`}
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

            {/* Grade tabs */}
            <div className="mt-8 flex justify-center gap-6 border-b border-ink/15" role="tablist" aria-label="Times by grade">
              {clubNightGroups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === g.id}
                  onClick={() => setTab(g.id)}
                  className={cn(
                    '-mb-px border-b-4 px-1 pb-2 font-display text-lg font-extrabold uppercase tracking-wide transition-colors',
                    tab === g.id ? 'border-coral-active text-ink' : 'border-transparent text-on-surface-variant hover:text-ink',
                  )}
                >
                  {g.label}
                  {g.programme ? ` · ${g.programme}` : ''}
                </button>
              ))}
            </div>
            <div role="tabpanel" className="mt-5 grid gap-3 text-sm md:grid-cols-3">
              <div className="rounded-lg border border-ink/10 bg-white px-4 py-3">
                <p className="font-display text-2xl font-black text-ink">{groupTimeLabel(group)}</p>
                <p className="text-on-surface-variant">{GROUP_COPY[group.id]}</p>
              </div>
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

            <p className="mx-auto mt-6 flex max-w-2xl items-start gap-2 rounded-lg bg-coral-active/15 px-4 py-3 text-sm text-on-coral">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                <strong>We do not hold open days.</strong> Junior grades are capped each season to keep coach-to-athlete
                ratios healthy, so register early.
              </span>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

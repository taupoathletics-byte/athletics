import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Clock, Heart, MapPin, Sparkles, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Photo } from '@/components/Photo'
import { PhotoGallery } from '@/components/PhotoGallery'
import { RegisterButton } from '@/components/RegisterButton'
import { SponsorStrip } from '@/components/SponsorStrip'
import { FacebookFeed } from '@/components/FacebookFeed'
import { clubName, contactEmail, mission, venue, verifiedStats } from '@/data/site'
import { committee } from '@/data/committee'
import { developmentSquad, formatClubNightLabel, nextClubNight } from '@/data/clubNights'
import { registration } from '@/data/fees'

/** Committee roles worth surfacing on Home — the full list lives on /team. */
const KEY_ROLES = ['Chairperson', 'Secretary', 'Treasurer', 'Coach Coordinator']

const GALLERY = [44, 41, 39, 37, 43, 35, 47, 42, 34]

function countdownText(when: Date) {
  const diff = when.getTime() - Date.now()
  const d = Math.floor(diff / 86_400_000)
  const h = Math.floor((diff % 86_400_000) / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  if (d > 0) return `${d}d ${h}h`
  return `${h}h ${m}m`
}

function useNow() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])
  return now
}

function Stat({ value, suffix, label }: { value: number; suffix?: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [n, setN] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setN(value)
      return
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        io.disconnect()
        const start = performance.now()
        const tick = (t: number) => {
          const p = Math.min(1, (t - start) / 1200)
          setN(Math.round(value * p))
          if (p < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [value])
  return (
    <div ref={ref} className="rounded-xl bg-white p-gutter-sm text-center shadow-soft">
      <div className="font-display text-4xl font-bold text-primary md:text-5xl">
        {n}
        {suffix}
      </div>
      <div className="mt-1 text-sm text-on-surface-variant">{label}</div>
    </div>
  )
}

export default function Home() {
  const now = useNow()
  const next = nextClubNight(new Date(now))
  const keyPeople = committee
    .find((g) => g.id === 'committee')
    ?.people.filter((p) => KEY_ROLES.includes(p.role)) ?? []

  return (
    <>
      {/* Hero — photography first. No watermark text behind the image. */}
      <section className="relative isolate overflow-hidden bg-inverse-surface text-white">
        <Photo
          id={38}
          priority
          sizes="100vw"
          className="absolute inset-0 -z-10 h-full w-full"
        />
        {/* Soft bottom-left gradient: dark enough for 4.5:1 text, not a muddy wash. */}
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-tr from-black/80 via-black/55 to-black/10"
          aria-hidden
        />

        <div className="container-page relative py-20 md:py-28">
          <Badge className="mb-5 bg-white/20 text-white">
            Registrations open · Season {registration.seasonLabel}
          </Badge>
          <h1 className="max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight drop-shadow-sm md:text-6xl">
            Athletics for ages 3&ndash;14 at {venue.name}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-white/90">
            {clubName} — fun, whānau-friendly athletics every Thursday through Term 4 and Term 1.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <RegisterButton className="px-6 py-3 text-base">Register now</RegisterButton>
            <Link
              to="/club-nights"
              className="inline-flex items-center justify-center rounded-full border-2 border-white/80 bg-white/10 px-6 py-3 text-base font-semibold text-white backdrop-blur transition-colors hover:bg-white hover:text-on-surface"
            >
              Club Nights
            </Link>
          </div>

          {next && (
            <div className="mt-9 inline-flex items-center gap-3 rounded-full bg-white/15 px-5 py-2.5 text-sm font-semibold backdrop-blur">
              <Clock className="h-4 w-4" aria-hidden />
              {next.isTonight ? (
                <span>Tonight! Check Facebook by 4pm for weather.</span>
              ) : (
                <span>
                  Next club night in {countdownText(next.when)} · {formatClubNightLabel(next.iso)} 5:30pm
                </span>
              )}
            </div>
          )}
        </div>

        {/* Lane lines sit at the foot of the hero, clear of the stat cards. */}
        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full text-white"
          viewBox="0 0 1440 96"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path className="lane-line" d="M-60 40 C 320 10, 720 70, 1500 30" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.45" />
          <path className="lane-line" d="M-60 66 C 320 36, 720 96, 1500 56" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.28" style={{ animationDelay: '0.15s' }} />
        </svg>
      </section>

      {/* Stats — only figures with a stated source are shown. */}
      {verifiedStats.length > 0 && (
        <section className="container-page relative z-10 -mt-8">
          <div
            className={
              verifiedStats.length === 1
                ? 'flex justify-center'
                : 'grid grid-cols-2 gap-4 md:grid-cols-4'
            }
          >
            {verifiedStats.map((s) => (
              <div key={s.label} className={verifiedStats.length === 1 ? 'w-full max-w-xs' : ''}>
                <Stat value={s.value} suffix={s.suffix} label={s.label} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quick facts */}
      <section className="container-page section-pad">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: Users, title: 'Ages 3–14', text: 'Club nights for athletes from 3 to 14 years old.' },
            {
              icon: Clock,
              title: 'Club Nights',
              text: 'Thursdays from 5:30pm (weather dependent). Grades 3–6 finish 6:30pm, Grades 7–14 finish 7:00pm.',
            },
            { icon: MapPin, title: 'Where', text: `${venue.name}, ${venue.address}.` },
          ].map((f) => (
            <div key={f.title} className="rounded-xl bg-white p-gutter-sm shadow-soft">
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-primary-container p-3 text-primary">
                  <f.icon className="h-6 w-6" aria-hidden />
                </div>
                <div>
                  <h3 className="font-bold text-on-surface">{f.title}</h3>
                  <p className="mt-1 text-on-surface-variant">{f.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Mission + no open days */}
      <section className="container-page">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl bg-white p-gutter-sm shadow-soft">
            <h2 className="font-display text-2xl font-bold text-on-surface">Our mission</h2>
            <p className="mt-2 text-on-surface-variant">{mission}</p>
          </div>
          <div className="flex items-start gap-4 rounded-xl border-l-4 border-l-coral-active bg-white p-gutter-sm shadow-soft">
            <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-coral-active" aria-hidden />
            <div>
              <h2 className="font-display text-2xl font-bold text-on-surface">We do not hold open days.</h2>
              <p className="mt-1 text-on-surface-variant">
                Due to the high number of children wanting to take part, we no longer run an open day. Junior grades are
                capped each season to keep our coach-to-athlete ratios healthy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="container-page section-pad">
        <PhotoGallery ids={GALLERY} heading="Life at the club" />
      </section>

      {/* Committee (compact) + Development Squad */}
      <section className="band-alt">
        <div className="container-page section-pad">
          <div className="grid items-start gap-8 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-bold text-on-surface">
                Committee, coaches &amp; volunteers
              </h2>
              <p className="mt-3 text-on-surface-variant">
                The committee elected for the 2026&ndash;27 season:
              </p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {keyPeople.map((m) => (
                  <li key={m.name} className="rounded-lg bg-white px-4 py-2.5 shadow-soft-sm">
                    <span className="font-semibold text-on-surface">{m.name}</span>
                    <span className="block text-sm text-on-surface-variant">{m.role}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-on-surface-variant">
                We can always do with more helping hands on club nights — email{' '}
                <a className="font-semibold text-primary underline" href={`mailto:${contactEmail}`}>
                  {contactEmail}
                </a>{' '}
                or talk to one of the team on Thursday night.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/team" className={buttonVariants({ variant: 'outline' })}>
                  Meet the full team →
                </Link>
                <Link to="/volunteer" className={buttonVariants({ variant: 'mint' })}>
                  See our vacancies
                </Link>
              </div>
            </div>

            {/* self-start so the card sizes to its content, not the column */}
            <div className="self-start overflow-hidden rounded-xl bg-white shadow-soft">
              <Photo
                id={26}
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="aspect-[16/9] w-full"
              />
              <div className="p-gutter-sm">
                <div className="flex items-center gap-2 text-tertiary">
                  <Sparkles className="h-5 w-5" aria-hidden />
                  <h3 className="font-display text-xl font-bold">Development Squad</h3>
                </div>
                <p className="mt-3 text-on-surface-variant">
                  {developmentSquad.day} {developmentSquad.start}&ndash;{developmentSquad.finish}.{' '}
                  {developmentSquad.startsLabel}. {developmentSquad.who} No extra fee.
                </p>
                <p className="mt-2 text-on-surface-variant">{developmentSquad.detail}</p>
                <p className="mt-2 text-on-surface-variant">
                  Search Facebook for the closed group{' '}
                  <span className="font-semibold">&lsquo;{developmentSquad.facebookGroup}&rsquo;</span>.
                </p>
                <a
                  href={`mailto:${contactEmail}?subject=Development%20Squad`}
                  className={`${buttonVariants({ variant: 'outline' })} mt-4`}
                >
                  Talk to coach Leah
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Facebook feed — cancellations are announced here by 4pm on club night */}
      <section className="band-alt">
        <div className="container-page section-pad">
          <FacebookFeed />
        </div>
      </section>

      {/* Sponsors */}
      <section className="container-page section-pad">
        <div className="mb-6 flex items-center gap-2">
          <Heart className="h-5 w-5 text-coral-active" aria-hidden />
          <h2 className="font-display text-3xl font-bold text-on-surface">Thank you to our sponsors</h2>
        </div>
        <SponsorStrip />
        <p className="mt-6 text-on-surface-variant">
          Want to support the club? Email{' '}
          <a className="font-semibold text-primary underline" href={`mailto:${contactEmail}`}>
            {contactEmail}
          </a>
          .
        </p>
      </section>
    </>
  )
}

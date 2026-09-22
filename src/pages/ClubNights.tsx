import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, CloudRain, Facebook, HandHeart, Timer } from 'lucide-react'
import { PageHero } from '@/components/PageHero'
import { Photo } from '@/components/Photo'
import { FacebookFeed } from '@/components/FacebookFeed'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { clubName, links, seasonDates } from '@/data/site'
import { developmentSquad, eventRotation, eveningTimeline } from '@/data/clubNights'

/** Reveals children one by one as the list scrolls into view. */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(true)
      return
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold: 0.2 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return { ref, shown }
}

export default function ClubNights() {
  const { ref, shown } = useReveal<HTMLOListElement>()

  return (
    <>
      <PageHero
        eyebrow="Every Thursday"
        title="Club Nights"
        subtitle={`Club nights take place every Thursday (weather permitting) beginning at 5:30pm.`}
        photo={41}
      />

      {/* Weather call — prominent, because this is the thing families need. */}
      <section className="bg-coral-active/10">
        <div className="container-page flex flex-wrap items-center gap-4 py-4">
          <CloudRain className="h-6 w-6 shrink-0 text-coral-active" aria-hidden />
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
        <FacebookFeed hideCancellationNote />
      </section>

      <section className="container-page section-pad">
        <p className="max-w-3xl text-lg text-on-surface-variant">
          All ages start with a jog and some stretches to warm up, then split into their age groups.
        </p>

        {/* Two groups, side by side */}
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <article className="overflow-hidden rounded-xl border-l-4 border-l-tertiary bg-white shadow-soft">
            <Photo id={39} sizes="(min-width: 768px) 50vw, 100vw" className="aspect-[16/9] w-full" />
            <div className="p-gutter-sm">
              <Badge className="bg-tertiary text-white">Get Set Go</Badge>
              <h2 className="mt-3 font-display text-2xl font-bold text-on-surface">Littlies · 3–6 yrs</h2>
              <p className="mt-1 font-semibold text-tertiary">Thursdays 5:30–6:30pm</p>
              <p className="mt-3 text-on-surface-variant">
                Our littlies take part in running races and other game-based activities as part of the Get Set Go
                programme. Parents stay and help — it makes the night run, and the children love it.
              </p>
              <Link to="/volunteer" className={`${buttonVariants({ variant: 'outline' })} mt-4`}>
                Volunteer portal →
              </Link>
            </div>
          </article>

          <article className="overflow-hidden rounded-xl border-l-4 border-l-coral-active bg-white shadow-soft">
            <Photo id={35} sizes="(min-width: 768px) 50vw, 100vw" className="aspect-[16/9] w-full" />
            <div className="p-gutter-sm">
              <Badge className="bg-coral-active text-coral-ink">Club night rotation</Badge>
              <h2 className="mt-3 font-display text-2xl font-bold text-on-surface">7 yrs +</h2>
              <p className="mt-1 font-semibold text-on-coral">Thursdays 5:30–7:00pm</p>
              <p className="mt-3 text-on-surface-variant">
                Older athletes work through a rotation of 3&ndash;4 events with coaching on safe and proper use of
                equipment — usually one running event and two field events, plus some skills.
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {eventRotation.map((e) => (
                  <li
                    key={e}
                    className="rounded-full border border-outline-variant bg-surface-container-low px-3 py-1 text-sm font-semibold text-on-surface"
                  >
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        </div>
      </section>

      {/* Evening timeline */}
      <section className="band-alt">
        <div className="container-page section-pad">
          <h2 className="font-display text-3xl font-bold text-on-surface">How the evening runs</h2>
          <ol ref={ref} className="mt-8 space-y-0">
            {eveningTimeline.map((step, i) => (
              <li
                key={step.time}
                className="relative flex gap-5 pb-8 last:pb-0"
                style={{
                  opacity: shown ? 1 : 0,
                  transform: shown ? 'none' : 'translateY(12px)',
                  transition: `opacity .5s ease ${i * 0.12}s, transform .5s ease ${i * 0.12}s`,
                }}
              >
                {i < eveningTimeline.length - 1 && (
                  <span
                    className="absolute left-[15px] top-8 h-full w-0.5 bg-outline-variant"
                    aria-hidden
                  />
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
              See club records
            </Link>
          </div>

          <div className="rounded-xl border-l-4 border-l-coral-active bg-white p-gutter-sm shadow-soft">
            <div className="flex items-center gap-2 text-on-coral">
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
              {developmentSquad.day} {developmentSquad.start}&ndash;{developmentSquad.finish}. {developmentSquad.who}
            </p>
            <ul className="mt-2 space-y-2 text-on-surface-variant">
              {seasonDates.developmentSquad.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  )
}

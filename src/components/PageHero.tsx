import type { ReactNode } from 'react'
import { Photo } from '@/components/Photo'
import { EventFloater } from '@/components/athletics/EventIcon'
import type { EventId } from '@/components/athletics/events/Stage'

interface PageHeroProps {
  eyebrow?: string
  title: string
  subtitle?: ReactNode
  /** Photo id from src/data/photos.ts, shown alongside the heading. */
  photo?: number
  /** The event icon floating on this page (defaults by title). */
  event?: EventId
}

const EVENTS: EventId[] = ['distance', 'hurdles', 'discus', 'relays', 'high-jump', 'long-jump', 'shot-put']

/**
 * One page-header pattern for every page, in the glow-up style: navy band,
 * giant condensed title, and the photo sitting on running-track lanes that run
 * off the edge of the page (Sixes' offset image blocks).
 */
export function PageHero({ eyebrow, title, subtitle, photo, event }: PageHeroProps) {
  const floater = event ?? EVENTS[title.length % EVENTS.length]
  return (
    <section className="relative overflow-hidden bg-ink text-cream">
      <EventFloater event={floater} drive="page" span={0.6} speed={30} className="left-[46%] top-[10%] hidden h-24 w-24 lg:block" />
      <div className="container-page relative grid items-center gap-10 py-12 md:py-16 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="relative z-10">
          {eyebrow && (
            <p className="font-display text-lg font-extrabold uppercase tracking-[0.16em] text-signal-light">{eyebrow}</p>
          )}
          <h1 className="display-xl mt-2 text-[clamp(3.2rem,8vw,6.5rem)] text-cream">{title}</h1>
          {subtitle && <p className="mt-4 max-w-2xl text-lg text-cream/80">{subtitle}</p>}
        </div>
        {photo !== undefined && (
          <div className="relative hidden lg:block">
            <span aria-hidden className="track-lanes absolute -right-[40%] left-[12%] top-[16%] h-[24%]" style={{ ['--lane' as string]: '16px' }} />
            <span aria-hidden className="track-lanes absolute -right-[40%] left-[12%] top-[60%] h-[24%]" style={{ ['--lane' as string]: '16px' }} />
            <Photo
              id={photo}
              sizes="(min-width: 1024px) 34vw, 100vw"
              priority
              className="relative aspect-[4/3] w-full rounded-2xl ring-4 ring-ink"
            />
          </div>
        )}
      </div>
      <div aria-hidden className="h-2 bg-[linear-gradient(to_bottom,#b04f49_0_33%,#F6F3EC_33%_66%,#b04f49_66%)]" />
    </section>
  )
}

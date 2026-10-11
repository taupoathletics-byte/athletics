import type { ReactNode } from 'react'
import { Photo } from '@/components/Photo'
import { Floater } from '@/components/athletics/motion'
import type { AthleticsIconName } from '@/components/athletics/icons'

interface PageHeroProps {
  eyebrow?: string
  title: string
  subtitle?: ReactNode
  /** Photo id from src/data/photos.ts, shown alongside the heading. */
  photo?: number
  /** Floating athletics illustration for this page (defaults by title). */
  icon?: AthleticsIconName
}

const ICONS: AthleticsIconName[] = ['ShotPut', 'Baton', 'Discus', 'Stopwatch', 'Rosette', 'Hurdle', 'Medal']

/**
 * One page-header pattern for every page, in the glow-up style: navy band,
 * giant condensed title, and the photo sitting on running-track lanes that run
 * off the edge of the page (Sixes' offset image blocks).
 */
export function PageHero({ eyebrow, title, subtitle, photo, icon }: PageHeroProps) {
  const floater = icon ?? ICONS[title.length % ICONS.length]
  return (
    <section className="relative overflow-hidden bg-ink text-cream">
      <Floater icon={floater} className="left-[46%] top-[12%] hidden h-16 w-16 lg:block" speed={60} spin={50} />
      <div className="container-page relative grid items-center gap-10 py-12 md:py-16 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="relative z-10">
          {eyebrow && (
            <p className="font-display text-lg font-extrabold uppercase tracking-[0.16em] text-coral-active">{eyebrow}</p>
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
      <div aria-hidden className="h-2 bg-[linear-gradient(to_bottom,#c8553d_0_33%,#fbf5ea_33%_66%,#c8553d_66%)]" />
    </section>
  )
}

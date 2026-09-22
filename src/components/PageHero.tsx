import type { ReactNode } from 'react'
import { Photo } from '@/components/Photo'

interface PageHeroProps {
  eyebrow?: string
  title: string
  subtitle?: ReactNode
  /** Photo id from src/data/photos.ts, shown alongside the heading. */
  photo?: number
}

/**
 * One page-header pattern for every page: eyebrow, serif H1, one-line intro,
 * and a photo on the right. A low-opacity lane motif keeps it from reading as
 * a flat block of colour.
 */
export function PageHero({ eyebrow, title, subtitle, photo }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-outline-variant bg-surface-container-low">
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full text-primary"
        viewBox="0 0 1440 320"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <path d="M-60 250 C 320 190, 720 300, 1500 230" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.10" />
        <path d="M-60 285 C 320 225, 720 335, 1500 265" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.07" />
      </svg>

      <div className="container-page relative grid items-center gap-8 py-10 md:py-14 lg:grid-cols-[1.4fr_1fr]">
        <div>
          {eyebrow && (
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
          )}
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-on-surface md:text-5xl">
            {title}
          </h1>
          {subtitle && <p className="mt-3 max-w-2xl text-lg text-on-surface-variant">{subtitle}</p>}
        </div>

        {photo !== undefined && (
          <Photo
            id={photo}
            sizes="(min-width: 1024px) 34vw, 100vw"
            className="hidden aspect-[16/10] w-full rounded-xl shadow-soft lg:block"
          />
        )}
      </div>
    </section>
  )
}

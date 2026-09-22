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
 * and a photo alongside. A low-opacity lane motif keeps it from reading as a
 * flat block of colour.
 *
 * The photo is height-capped rather than aspect-driven. Page headings are two
 * or three lines, so an aspect-ratio photo in a 1fr column grew far taller
 * than the text and left a dead band under the heading — the header ended up
 * ~500px tall to carry three lines of copy. Capping the height keeps the photo
 * an accent and lets the header size to its text.
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

      <div className="container-page relative grid items-center gap-8 py-8 md:py-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
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
            sizes="(min-width: 1024px) 30vw, 100vw"
            className="hidden h-[180px] w-full rounded-xl shadow-soft lg:block xl:h-[200px]"
          />
        )}
      </div>
    </section>
  )
}

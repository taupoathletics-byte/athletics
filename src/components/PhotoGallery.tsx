import * as React from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Photo, focalStyle } from '@/components/Photo'
import { consentNote, photo as lookup } from '@/data/photos'

interface PhotoGalleryProps {
  /** Photo ids, in display order. */
  ids: number[]
  heading?: string
}

/**
 * Bento-ish photo grid with a lightbox. Focus is trapped while open, Escape
 * closes, arrows move between photos, and focus returns to the thumbnail that
 * opened it.
 */
export function PhotoGallery({ ids, heading }: PhotoGalleryProps) {
  const [open, setOpen] = React.useState<number | null>(null)
  const triggers = React.useRef<(HTMLButtonElement | null)[]>([])
  const dialogRef = React.useRef<HTMLDivElement>(null)

  const close = React.useCallback(() => {
    setOpen((i) => {
      if (i !== null) triggers.current[i]?.focus()
      return null
    })
  }, [])

  const move = React.useCallback(
    (dir: number) => setOpen((i) => (i === null ? i : (i + dir + ids.length) % ids.length)),
    [ids.length],
  )

  React.useEffect(() => {
    if (open === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        move(1)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        move(-1)
      } else if (e.key === 'Tab') {
        // Trap focus inside the dialog.
        const f = dialogRef.current?.querySelectorAll<HTMLElement>('button')
        if (!f || f.length === 0) return
        const first = f[0]
        const last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.querySelector('button')?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, close, move])

  const current = open === null ? null : lookup(ids[open])

  return (
    <div>
      {heading && (
        <h2 className="mb-5 font-display text-3xl font-bold text-on-surface">{heading}</h2>
      )}

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {ids.map((id, i) => (
          <li key={id} className={i === 0 ? 'col-span-2 row-span-2' : undefined}>
            <button
              type="button"
              ref={(el) => (triggers.current[i] = el)}
              onClick={() => setOpen(i)}
              className="group block h-full w-full overflow-hidden rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Photo
                id={id}
                sizes={i === 0 ? '(min-width: 1024px) 50vw, 66vw' : '(min-width: 1024px) 25vw, 33vw'}
                className="aspect-square h-full w-full transition-transform duration-300 group-hover:scale-105"
              />
              <span className="sr-only">{lookup(id).alt} — open larger</span>
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-sm text-on-surface-variant">{consentNote}</p>

      {open !== null && current && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) close()
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Club photo"
            className="relative w-full max-w-5xl"
          >
            <img
              src={`/photos/${current.id}-1600.jpg`}
              alt={current.alt}
              style={focalStyle(current)}
              className="max-h-[80vh] w-full rounded-xl object-contain"
            />
            <p className="mt-3 text-center text-sm text-white/85">{current.alt}</p>

            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute -top-3 right-0 rounded-full bg-white p-2 text-on-surface shadow-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2.5 text-on-surface shadow-soft hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2.5 text-on-surface shadow-soft hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

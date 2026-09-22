import { photo as lookup, type Photo as PhotoData } from '@/data/photos'
import { cn } from '@/lib/utils'

const WIDTHS = [480, 960, 1600]

interface PhotoProps {
  /** Photo id from src/data/photos.ts. */
  id: number
  className?: string
  /** Rendered width hint for the browser, e.g. "(min-width:768px) 50vw, 100vw". */
  sizes?: string
  /** The hero image above the fold — loads eagerly at high priority. */
  priority?: boolean
  /** Override the alt text (rare — prefer fixing it in photos.ts). */
  alt?: string
}

function srcset(id: number, ext: string) {
  return WIDTHS.map((w) => `/photos/${id}-${w}.${ext} ${w}w`).join(', ')
}

/** Focal point as a CSS object-position, so crops never cut heads off. */
export function focalStyle(p: PhotoData) {
  return { objectPosition: `${p.focal.x * 100}% ${p.focal.y * 100}%` }
}

/**
 * Responsive club photo: AVIF, then WebP, then JPG. Width and height are set
 * from the real aspect ratio so nothing shifts as images load.
 */
export function Photo({ id, className, sizes = '100vw', priority = false, alt }: PhotoProps) {
  const p = lookup(id)
  return (
    // The layout classes go on <picture>, not the <img>.
    //
    // <picture> is display:inline by default, which gives the <img> no
    // containing box and collapses every aspect-ratio and h-full crop. The
    // obvious fix — display:contents — is worse: it promotes the <source>
    // elements to layout items too, so inside a two-column grid the sources
    // took the spare cells and pushed the image onto a second row, leaving a
    // dead band under the heading. Making <picture> an ordinary block keeps
    // one element in the layout and lets the image fill it.
    <picture className={cn('block overflow-hidden', className)}>
      <source type="image/avif" srcSet={srcset(id, 'avif')} sizes={sizes} />
      <source type="image/webp" srcSet={srcset(id, 'webp')} sizes={sizes} />
      <img
        src={`/photos/${id}-960.jpg`}
        srcSet={srcset(id, 'jpg')}
        sizes={sizes}
        alt={alt ?? p.alt}
        width={1920}
        height={p.cropped ? 1045 : 1080}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        {...(priority ? { fetchPriority: 'high' as const } : {})}
        style={focalStyle(p)}
        className="h-full w-full object-cover"
      />
    </picture>
  )
}

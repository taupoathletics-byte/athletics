import { Fragment, useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { Photo } from '@/components/Photo'

const ROWS: { words: string[]; photos: number[] }[] = [
  { words: ['Personal bests', 'Ribbon days', 'Club records'], photos: [35, 39, 36] },
  { words: ['Whānau welcome', 'No experience needed', 'Ages 3–14'], photos: [42, 46, 47] },
  { words: ['Sprint finishes', 'Sandpit landings', 'Relay glory'], photos: [37, 44, 43] },
]

/** Giant words interleaved with round photos, sliding in alternate directions as you scroll. */
export function WordRows() {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const a = useTransform(scrollYProgress, [0, 1], ['0%', '-30%'])
  const b = useTransform(scrollYProgress, [0, 1], ['-30%', '0%'])

  return (
    <section ref={ref} aria-label="What club nights are about" className="overflow-hidden bg-cream py-10 md:py-16">
      <p className="sr-only">{ROWS.flatMap((row) => row.words).join(', ')}.</p>
      {ROWS.map((row, r) => (
        <motion.div
          key={r}
          aria-hidden
          style={reduce ? undefined : { x: r % 2 ? b : a }}
          className="flex w-max items-center gap-6 py-2 md:gap-10"
        >
          {[...row.words, ...row.words].map((w, i) => (
            <Fragment key={`${w}-${i}`}>
              <span className="display-xl whitespace-nowrap text-[clamp(3rem,9vw,7.5rem)] text-ink">{w}</span>
              <Photo id={row.photos[i % row.photos.length]} sizes="140px" className="size-20 shrink-0 rounded-full ring-4 ring-coral-active md:size-32" />
            </Fragment>
          ))}
        </motion.div>
      ))}
    </section>
  )
}

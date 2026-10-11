import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { Photo } from '@/components/Photo'
import { photo } from '@/data/photos'
import { Reveal } from './motion'

const STRIP = [44, 41, 39, 42, 35, 45, 47, 43, 36, 40]

/**
 * Pinned horizontal photo strip — scroll down, the photos travel sideways
 * (Sixes "Food & Drink" row). Falls back to a swipeable row for reduced motion.
 */
export function LifeStrip() {
  const ref = useRef<HTMLElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const [distance, setDistance] = useState(0)

  useEffect(() => {
    const measure = () => {
      if (!track.current) return
      setDistance(Math.max(0, track.current.scrollWidth - window.innerWidth + 48))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const x = useTransform(scrollYProgress, [0, 0.05, 0.95, 1], [0, 0, -distance, -distance])

  const heading = (
    <div className="container-page grid gap-6 md:grid-cols-[1.1fr_1fr] md:items-end">
      <h2 className="display-xl text-[clamp(3.6rem,10vw,8.5rem)] text-ink">
        Life at
        <br />
        the club
      </h2>
      <div className="max-w-md pb-2">
        <p className="text-lg text-on-surface-variant">
          Sack races and sandpits, Ribbon Day podiums and end-of-night huddles. Club nights are where tamariki find their
          event, their mates and their confidence.
        </p>
      </div>
    </div>
  )

  const cards = STRIP.map((id, i) => (
    <figure
      key={id}
      className="relative h-[52vh] max-h-[460px] min-h-[260px] w-[78vw] shrink-0 overflow-hidden rounded-2xl bg-ink md:w-[34vw]"
      style={{ rotate: `${i % 2 ? 1.2 : -1.2}deg` }}
    >
      <Photo id={id} sizes="(min-width: 768px) 34vw, 78vw" className="h-full w-full" />
      <figcaption className="sr-only">{photo(id).alt}</figcaption>
    </figure>
  ))

  if (reduce) {
    return (
      <section className="bg-cream py-16">
        {heading}
        <div className="mt-10 flex snap-x gap-5 overflow-x-auto px-margin-mobile pb-4 md:px-margin-desktop">{cards}</div>
      </section>
    )
  }

  return (
    <section ref={ref} className="relative h-[320vh] bg-cream">
      <div className="sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden py-10">
        <Reveal>{heading}</Reveal>
        <motion.div ref={track} style={{ x }} className="mt-10 flex w-max gap-6 pl-margin-mobile md:pl-margin-desktop">
          {cards}
        </motion.div>
      </div>
    </section>
  )
}

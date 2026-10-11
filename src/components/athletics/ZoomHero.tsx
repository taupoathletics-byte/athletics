import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { ArrowDown, Pause, Play } from 'lucide-react'
import { Photo } from '@/components/Photo'
import { RegisterButton } from '@/components/RegisterButton'
import { registration } from '@/data/fees'
import { venue } from '@/data/site'
import { Floater } from './motion'

const VIDEO = '/media/promo-loop.mp4'
const POSTER = '/media/promo-poster.jpg'

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setMatches(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return matches
}

/** Skip autoplay for people on a data saver or who asked for less motion. */
function shouldAutoplay(reduce: boolean | null) {
  if (reduce) return false
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  return !conn?.saveData
}

/**
 * Sixes-style opening: a giant headline over three cards and running-track
 * lanes. Scrolling pins the scene and zooms the middle card (the club promo
 * film) out to full screen while the side photos slide away.
 */
export function ZoomHero() {
  const ref = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const reduce = useReducedMotion()
  const mobile = useMediaQuery('(max-width: 767px)')
  const [playing, setPlaying] = useState(false)
  const [overlayOn, setOverlayOn] = useState(false)

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  // Every range spans the full 0→1 with explicit end values. Motion hands these
  // to the browser's native ScrollTimeline, which otherwise fills the missing
  // tail of a partial range by easing back to the start value — the film would
  // zoom in, then shrink again as you kept scrolling.
  const fullBleed = 'inset(0% 0% 0% 0% round 0px)'
  const startClip = mobile ? 'inset(50% 5% 7% 5% round 22px)' : 'inset(40% 31% 7% 31% round 30px)'
  const clipPath = useTransform(scrollYProgress, [0, 0.68, 1], [startClip, fullBleed, fullBleed])
  const mediaScale = useTransform(scrollYProgress, [0, 0.68, 1], [1.22, 1, 1])
  const headY = useTransform(scrollYProgress, [0, 0.42, 1], ['0%', '-40%', '-40%'])
  const headOpacity = useTransform(scrollYProgress, [0, 0.12, 0.4, 1], [1, 1, 0, 0])
  const leftX = useTransform(scrollYProgress, [0, 0.5, 1], ['0vw', '-34vw', '-34vw'])
  const rightX = useTransform(scrollYProgress, [0, 0.5, 1], ['0vw', '34vw', '34vw'])
  const sideOpacity = useTransform(scrollYProgress, [0, 0.08, 0.42, 1], [1, 1, 0, 0])
  const bandsY = useTransform(scrollYProgress, [0, 0.7, 1], ['0%', '18%', '18%'])
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.6, 0.78, 1], [0, 0, 1, 1])
  const hintOpacity = useTransform(scrollYProgress, [0, 0.08, 1], [1, 0, 0])
  useMotionValueEvent(overlayOpacity, 'change', (v) => setOverlayOn(v > 0.05))

  // Play only while the hero is on screen.
  useEffect(() => {
    const el = ref.current
    const video = videoRef.current
    if (!el || !video || !shouldAutoplay(reduce)) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) video.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
      else {
        video.pause()
        setPlaying(false)
      }
    })
    io.observe(el)
    return () => io.disconnect()
  }, [reduce])

  const toggle = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) v.play().then(() => setPlaying(true)).catch(() => {})
    else {
      v.pause()
      setPlaying(false)
    }
  }

  const headline = (
    <h1 className="display-xl text-center text-cream drop-shadow-[0_6px_0_rgba(12,32,51,0.35)]">
      <span className="sr-only">Taupō Athletics Club — </span>
      <span className="block text-[clamp(4.2rem,15vw,7rem)] md:text-[clamp(6rem,10.5vw,10.5rem)]">Run. Jump.</span>
      <span className="block text-[clamp(4.2rem,15vw,7rem)] md:text-[clamp(6rem,10.5vw,10.5rem)]">
        Thr<span className="text-coral-active">o</span>w.
      </span>
    </h1>
  )

  const video = (
    <video
      ref={videoRef}
      className="h-full w-full object-cover"
      src={VIDEO}
      poster={POSTER}
      muted
      loop
      playsInline
      preload={reduce ? 'none' : 'metadata'}
      controls={!!reduce}
      aria-label="Club promo film: athletes on the track, Ribbon Day podiums and club nights at Owen Delany Park"
    />
  )

  // Reduced motion: a calm, static version of the same scene.
  if (reduce) {
    return (
      <section className="bg-ink pb-16 pt-24 text-cream">
        <div className="container-page">
          <p className="text-center text-sm font-bold uppercase tracking-[0.2em] text-sky-soft">
            Season {registration.seasonLabel} · Ages 3–14 · {venue.name}
          </p>
          <div className="mt-4">{headline}</div>
          <div className="mx-auto mt-8 aspect-video max-w-4xl overflow-hidden rounded-3xl">{video}</div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <RegisterButton className="px-7 py-3 text-base">Register now</RegisterButton>
            <Link to="/club-nights" className="rounded-full border-2 border-cream/70 px-7 py-3 font-bold text-cream hover:bg-cream hover:text-ink">
              Club nights
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section ref={ref} className="relative h-[240vh] bg-ink" aria-label="Welcome to Taupō Athletics">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {/* Running-track lanes behind the cards */}
        <motion.div aria-hidden style={{ y: bandsY }} className="absolute inset-x-0 top-[58%] flex flex-col gap-5 md:top-[54%] md:gap-7">
          <div className="track-lanes h-14 md:h-20" style={{ ['--lane' as string]: '20px' }} />
          <div className="track-lanes h-14 md:h-20" style={{ ['--lane' as string]: '20px' }} />
        </motion.div>

        {/* Side photos (desktop) */}
        {!mobile && (
          <>
            <motion.div
              style={{ x: leftX, opacity: sideOpacity }}
              className="absolute bottom-[7%] left-[3%] top-[52%] w-[26%] overflow-hidden rounded-[26px] ring-4 ring-ink"
            >
              <Photo id={37} sizes="26vw" priority className="h-full w-full" />
            </motion.div>
            <motion.div
              style={{ x: rightX, opacity: sideOpacity }}
              className="absolute bottom-[7%] right-[3%] top-[52%] w-[26%] overflow-hidden rounded-[26px] ring-4 ring-ink"
            >
              <Photo id={39} sizes="26vw" priority className="h-full w-full" />
            </motion.div>
          </>
        )}

        {/* The zooming promo film */}
        <motion.div style={{ clipPath }} className="absolute inset-0 overflow-hidden will-change-[clip-path]">
          <motion.div style={{ scale: mediaScale }} className="h-full w-full">
            {video}
          </motion.div>
          <motion.div
            aria-hidden
            style={{ opacity: overlayOpacity }}
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/35 to-ink/10"
          />
        </motion.div>

        {/* Headline + floating kit */}
        <motion.div style={{ y: headY, opacity: headOpacity }} className="absolute inset-x-0 top-[13%] z-10 px-4 md:top-[11%]">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-[0.22em] text-sky-soft md:text-sm">
            Taupō Athletics Club · Season {registration.seasonLabel} · Ages 3–14
          </p>
          {headline}
        </motion.div>
        <Floater icon="ShotPut" className="left-[6%] top-[18%] hidden h-20 w-20 md:block lg:h-24 lg:w-24" speed={160} spin={90} />
        <Floater icon="Baton" className="right-[7%] top-[14%] hidden h-24 w-24 md:block lg:h-28 lg:w-28" speed={200} spin={-70} />
        <Floater icon="Stopwatch" className="right-[4%] top-[40%] h-14 w-14 md:hidden" speed={90} spin={40} />

        {/* Revealed once the film fills the screen */}
        <motion.div
          style={{ opacity: overlayOpacity, visibility: overlayOn ? 'visible' : 'hidden' }}
          className="absolute inset-x-0 bottom-0 z-20"
        >
          <div className="container-page pb-12 md:pb-16">
            <p className="font-display text-lg font-extrabold uppercase tracking-[0.12em] text-coral-active md:text-xl">
              Thursdays · 5:30pm · {venue.name}
            </p>
            <p className="display-xl mt-2 max-w-4xl text-[clamp(2.6rem,7vw,5.5rem)] text-cream">
              Fun, whānau-friendly athletics for every kid
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <RegisterButton className="px-7 py-3 text-base">Register for {registration.seasonLabel}</RegisterButton>
              <Link
                to="/club-nights"
                className="inline-flex items-center rounded-full border-2 border-cream/80 bg-ink/30 px-7 py-3 font-bold text-cream backdrop-blur transition-colors hover:bg-cream hover:text-ink"
              >
                How club nights run
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          aria-hidden
          style={{ opacity: hintOpacity }}
          className="absolute bottom-3 left-1/2 z-20 hidden -translate-x-1/2 items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-cream/70 md:flex"
        >
          Scroll <ArrowDown className="h-4 w-4 animate-bounce" />
        </motion.div>

        <button
          type="button"
          onClick={toggle}
          className="absolute bottom-4 right-4 z-30 grid h-11 w-11 place-items-center rounded-full bg-ink/70 text-cream ring-1 ring-cream/30 backdrop-blur transition-colors hover:bg-ink"
          aria-label={playing ? 'Pause the club film' : 'Play the club film'}
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>
      </div>
    </section>
  )
}

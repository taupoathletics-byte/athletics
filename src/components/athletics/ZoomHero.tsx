import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { ArrowDown, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { Photo } from '@/components/Photo'
import { RegisterButton } from '@/components/RegisterButton'
import { registration } from '@/data/fees'
import { venue } from '@/data/site'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { cn } from '@/lib/utils'
import { EventFloater } from './EventIcon'
import { THROW_SPAN } from './JavelinFlight'

const VIDEO = '/media/promo-loop.mp4'
const POSTER = '/media/promo-poster.jpg'
/** The promo's music is mastered loud; 70% sits comfortably under speech on a phone. */
const SOUND_VOLUME = 0.7

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
  // Browsers only allow sound after a tap, so the film always starts muted and
  // the visitor turns the music on. Refs mirror state for the observers below.
  const [soundOn, setSoundOn] = useState(false)
  const [soundTouched, setSoundTouched] = useState(false)
  const [controlsOn, setControlsOn] = useState(true)
  const soundRef = useRef(false)
  const wantPlay = useRef(false)
  const inView = useRef(false)

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
  // The film controls are pinned to the screen (on first load the pinned scene
  // starts below the announcement bar, which would push them below the fold)
  // and fade out once the hero starts scrolling away.
  useMotionValueEvent(scrollYProgress, 'change', (v) => setControlsOn(v < 0.995))

  /** Play; if the browser refuses audible playback, fall back to muted so the film still runs. */
  const playSafely = useCallback(async () => {
    const v = videoRef.current
    if (!v) return
    try {
      await v.play()
      setPlaying(true)
    } catch {
      if (!v.muted) {
        v.muted = true
        soundRef.current = false
        setSoundOn(false)
        try {
          await v.play()
          setPlaying(true)
          return
        } catch {
          /* still refused (e.g. iOS Low Power Mode) — leave it paused */
        }
      }
      setPlaying(false)
    }
  }, [])

  // Play only while the hero is on screen and the tab is visible, so the music
  // never carries on underneath the rest of the page.
  useEffect(() => {
    const el = ref.current
    const video = videoRef.current
    if (!el || !video) return
    wantPlay.current = shouldAutoplay(reduce)
    const io = new IntersectionObserver(([e]) => {
      inView.current = e.isIntersecting
      if (e.isIntersecting) {
        if (wantPlay.current && !document.hidden) playSafely()
      } else {
        video.pause()
        setPlaying(false)
      }
    })
    const onVisibility = () => {
      if (document.hidden) {
        video.pause()
        setPlaying(false)
      } else if (inView.current && wantPlay.current) {
        playSafely()
      }
    }
    io.observe(el)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [reduce, playSafely])

  const toggle = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      wantPlay.current = true
      playSafely()
    } else {
      wantPlay.current = false
      v.pause()
      setPlaying(false)
    }
  }

  // Must change `muted` and call play() inside the tap itself — iOS only
  // unlocks audio for the gesture that asked for it.
  const toggleSound = () => {
    const v = videoRef.current
    if (!v) return
    const next = !soundRef.current
    soundRef.current = next
    setSoundOn(next)
    setSoundTouched(true)
    v.muted = !next
    if (next) {
      v.volume = SOUND_VOLUME
      wantPlay.current = true
      if (v.paused) playSafely()
    }
  }

  const headline = (
    <h1 className="display-xl text-center text-cream drop-shadow-[0_6px_0_rgba(12,32,51,0.35)]">
      <span className="sr-only">Taupō Athletics Club — </span>
      <span className="block text-[clamp(4.2rem,15vw,7rem)] md:text-[clamp(6rem,10.5vw,10.5rem)]">Run. Jump.</span>
      <span className="block text-[clamp(4.2rem,15vw,7rem)] md:text-[clamp(6rem,10.5vw,10.5rem)]">
        Thr<span className="text-signal">o</span>w.
      </span>
    </h1>
  )

  const video = (
    <video
      ref={videoRef}
      className="h-full w-full object-cover"
      src={VIDEO}
      poster={POSTER}
      // Autoplay is muted; with reduced motion nothing autoplays, so the
      // native controls (and their volume) are left to the visitor.
      muted={reduce ? false : !soundOn}
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
      <div data-hero-stage className="sticky top-0 h-[100svh] overflow-hidden">
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
        {/* The event icons, alive. The javelin thrower's throw leaves the tile and
            flies down the page as you scroll (see JavelinFlight). */}
        <EventFloater
          event="javelin"
          dataJavelin
          drive="page"
          span={THROW_SPAN}
          speed={0}
          className="left-[4%] top-[38%] h-20 w-20 md:left-[5%] md:top-[15%] md:h-28 md:w-28 lg:h-32 lg:w-32"
        />
        <EventFloater event="long-jump" drive="page" span={0.9} speed={0} className="right-[5%] top-[14%] hidden h-28 w-28 md:block lg:h-32 lg:w-32" />

        {/* Revealed once the film fills the screen */}
        <motion.div
          style={{ opacity: overlayOpacity, visibility: overlayOn ? 'visible' : 'hidden' }}
          className="absolute inset-x-0 bottom-0 z-20"
        >
          <div className="container-page pb-20 md:pb-16">
            <p className="font-display text-lg font-extrabold uppercase tracking-[0.12em] text-signal-light md:text-xl">
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

        <div
          // visibility (not just opacity) also takes the buttons out of the tab order once hidden
          className={cn(
            'fixed bottom-4 right-4 z-40 flex items-center gap-2 transition-[opacity,visibility] duration-300',
            controlsOn ? 'visible opacity-100' : 'invisible opacity-0',
          )}
        >
          <button
            type="button"
            onClick={toggleSound}
            aria-label={soundOn ? 'Mute the club film' : 'Turn the club film’s sound on'}
            className={cn(
              'inline-flex h-11 items-center gap-2 rounded-full px-4 font-display text-base font-extrabold uppercase tracking-wide ring-1 backdrop-blur transition-colors',
              soundOn
                ? 'bg-ink/70 text-cream ring-cream/30 hover:bg-ink'
                : 'bg-signal text-signal-ink ring-signal hover:bg-signal-hover',
              !soundTouched && 'animate-register-pulse',
            )}
          >
            {soundOn ? <Volume2 className="h-5 w-5" aria-hidden /> : <VolumeX className="h-5 w-5" aria-hidden />}
            <span aria-hidden>{soundOn ? 'Mute' : 'Sound on'}</span>
          </button>
          <button
            type="button"
            onClick={toggle}
            className="grid h-11 w-11 place-items-center rounded-full bg-ink/70 text-cream ring-1 ring-cream/30 backdrop-blur transition-colors hover:bg-ink"
            aria-label={playing ? 'Pause the club film' : 'Play the club film'}
          >
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </section>
  )
}

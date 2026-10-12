import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react'
import { ICON_CROP, ICON_CROP_SIZE } from './EventIcon'
import { JAVELIN_LENGTH, JavelinShape, RELEASE, RELEASE_ANGLE, RELEASE_POINT } from './events/scenes/javelin'

/**
 * The javelin thrown from the home page header.
 *
 * The thrower is an event tile in the hero (`data-javelin-tile`), driven by
 * page scroll over THROW_SPAN viewport heights. At the release the javelin
 * leaves the tile and this full-screen layer takes over: as the visitor keeps
 * scrolling it arcs across the screen and down the page, then sticks into the
 * ground at the landing mark (`data-javelin-land`) by the next-club-night card
 * and scrolls away with it. Everything is a pure function of scroll position,
 * so scrolling back up flies it back into the thrower's hand.
 */

/** The throw plays over this many viewport heights of scrolling from the top. */
export const THROW_SPAN = 0.55
/** Where on screen the landing mark is when the javelin arrives (fraction of the viewport height). */
const LAND_AT = 0.72
/** How much bigger the javelin grows in flight, as if coming toward the viewer. */
const GROW = 1.6
/** The trail: how far back along the flight it reaches (as a fraction of the flight). */
const TRAIL = 0.14

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const smooth = (t: number) => t * t * (3 - 2 * t)
const deg = (r: number) => (r * 180) / Math.PI
const rad = (d: number) => (d * Math.PI) / 180

type Pt = [number, number]
const bez = (t: number, a: Pt, c: Pt, b: Pt): Pt => {
  const u = 1 - t
  return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]
}
const bezAngle = (t: number, a: Pt, c: Pt, b: Pt) => {
  const dx = 2 * (1 - t) * (c[0] - a[0]) + 2 * t * (b[0] - c[0])
  const dy = 2 * (1 - t) * (c[1] - a[1]) + 2 * t * (b[1] - c[1])
  return deg(Math.atan2(dy, dx))
}

/** Where the javelin is, for the current scroll position — or null when it's still in the hand. */
export function javelinPlacement(scroll: number, vh: number, tile: DOMRect, stage: DOMRect, stageDocTop: number, land: DOMRect, ceiling = 0) {
  const release = RELEASE * THROW_SPAN * vh
  if (scroll < release) return null

  // The thrower's tile is pinned in the hero's sticky stage, so at the release
  // its screen position is its offset within the stage plus where the stage
  // sat at that scroll (pinned to the top of the viewport by then).
  const stageTopAtRelease = Math.max(0, stageDocTop - release)
  const [cropX, cropY] = ICON_CROP.javelin.split(' ').map(Number)
  const inner = tile.width - 6 // inside the 3px border
  const k = inner / ICON_CROP_SIZE
  const grip: Pt = [
    tile.left + 3 + (RELEASE_POINT[0] - cropX) * k,
    tile.top - stage.top + 3 + (RELEASE_POINT[1] - cropY) * k + stageTopAtRelease,
  ]
  const length0 = JAVELIN_LENGTH * k
  const tip0: Pt = [grip[0] + (length0 / 2) * Math.cos(rad(RELEASE_ANGLE)), grip[1] + (length0 / 2) * Math.sin(rad(RELEASE_ANGLE))]

  // The landing mark, and the scroll at which it reaches LAND_AT of the screen.
  const landX = land.left + land.width / 2
  const landDocY = land.top + land.height / 2 + scroll
  const arrive = Math.max(landDocY - LAND_AT * vh, release + 0.4 * vh)
  const end: Pt = [landX, landDocY - arrive]
  // Arc up then down — but never so high that the javelin slips behind the
  // sticky site header (`ceiling`, the header's bottom edge).
  const ctrl: Pt = [(tip0[0] + end[0]) / 2, Math.min(tip0[1], end[1]) - 0.42 * vh]
  const top = (cy: number) => Math.min(...Array.from({ length: 21 }, (_, i) => bez(i / 20, tip0, [ctrl[0], cy], end)[1]))
  if (top(ctrl[1]) < ceiling + 24) {
    let lo = ctrl[1]
    let hi = Math.max(tip0[1], end[1])
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2
      if (top(mid) < ceiling + 24) lo = mid
      else hi = mid
    }
    ctrl[1] = hi
  }

  const f = clamp01((scroll - release) / (arrive - release))
  if (f < 1) {
    const tip = bez(f, tip0, ctrl, end)
    // Ease from the release angle onto the flight path over the first few percent.
    const angle = RELEASE_ANGLE + (bezAngle(f, tip0, ctrl, end) - RELEASE_ANGLE) * smooth(clamp01(f / 0.08))
    const trail = Array.from({ length: 10 }, (_, i) => bez(Math.max(0, f - (TRAIL * i) / 9), tip0, ctrl, end))
    return { tip, angle, length: length0 * (1 + GROW * Math.sin((Math.PI / 2) * f)), landed: 0, trail }
  }
  // Stuck in the ground: rides with the landing mark, with a dying quiver.
  const after = (scroll - arrive) / vh
  const quiver = 7 * Math.exp(-7 * after) * Math.sin(after * 48)
  return {
    tip: [landX, land.top + land.height / 2] as Pt,
    angle: bezAngle(1, tip0, ctrl, end) + quiver,
    length: length0 * (1 + GROW),
    landed: after,
    trail: [] as Pt[],
  }
}

/** Mount once on the page. Draws nothing until the javelin leaves the hand. */
export function JavelinFlight() {
  const reduce = useReducedMotion()
  const { scrollY } = useScroll()
  const javRef = useRef<SVGGElement>(null)
  const dustRef = useRef<SVGGElement>(null)
  const trailRef = useRef<SVGPolylineElement>(null)

  const update = useCallback(() => {
    const jav = javRef.current
    const dust = dustRef.current
    const trail = trailRef.current
    if (!jav || !dust || !trail) return
    const tile = document.querySelector<HTMLElement>('[data-javelin-tile]')
    const land = document.querySelector<HTMLElement>('[data-javelin-land]')
    const stage = tile?.closest<HTMLElement>('[data-hero-stage]')
    const section = stage?.parentElement
    const hide = () => {
      jav.setAttribute('visibility', 'hidden')
      dust.setAttribute('visibility', 'hidden')
      trail.setAttribute('visibility', 'hidden')
    }
    if (!tile || !land || !stage || !section || tile.offsetParent === null) return hide()
    const s = window.scrollY
    const place = javelinPlacement(
      s,
      window.innerHeight,
      tile.getBoundingClientRect(),
      stage.getBoundingClientRect(),
      section.getBoundingClientRect().top + s,
      land.getBoundingClientRect(),
      document.querySelector('header')?.getBoundingClientRect().bottom ?? 0,
    )
    if (!place) return hide()
    const scale = place.length / JAVELIN_LENGTH
    // JavelinShape is centred on its grip; shift it back so the tip sits on the point.
    jav.setAttribute(
      'transform',
      `translate(${place.tip[0].toFixed(1)} ${place.tip[1].toFixed(1)}) rotate(${place.angle.toFixed(2)}) scale(${scale.toFixed(3)}) translate(${(-JAVELIN_LENGTH / 2 + 6).toFixed(1)} 0)`,
    )
    jav.setAttribute('visibility', 'visible')
    // A short red trail behind the javelin while it flies.
    if (place.trail.length > 1) {
      // Start the trail behind the javelin's tail, not at its tip.
      const back = place.length - 6
      const pts = place.trail.filter(([x, y]) => Math.hypot(x - place.tip[0], y - place.tip[1]) > back)
      trail.setAttribute('points', pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '))
      trail.setAttribute('visibility', pts.length > 1 ? 'visible' : 'hidden')
    } else trail.setAttribute('visibility', 'hidden')
    if (place.landed > 0 && place.landed < 0.3) {
      const k = place.landed / 0.3
      dust.setAttribute('transform', `translate(${place.tip[0].toFixed(1)} ${place.tip[1].toFixed(1)})`)
      dust.setAttribute('opacity', (0.8 * (1 - k)).toFixed(3))
      dust.querySelectorAll('circle').forEach((c, i) => {
        const a = rad(200 + i * 35)
        c.setAttribute('cx', (Math.cos(a) * 26 * k).toFixed(1))
        c.setAttribute('cy', (Math.sin(a) * 14 * k - 4).toFixed(1))
      })
      dust.setAttribute('visibility', 'visible')
    } else dust.setAttribute('visibility', 'hidden')
  }, [])

  useMotionValueEvent(scrollY, 'change', update)
  useLayoutEffect(update, [update])
  useEffect(() => {
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [update])

  if (reduce) return null
  return (
    <svg aria-hidden className="pointer-events-none fixed inset-0 z-[45] h-full w-full overflow-visible">
      <polyline ref={trailRef} visibility="hidden" fill="none" stroke="#b04f49" strokeWidth={4} strokeLinecap="round" strokeDasharray="10 9" opacity={0.75} />
      <g ref={dustRef} visibility="hidden">
        {[0, 1, 2, 3, 4].map((i) => (
          <circle key={i} r={4 + (i % 3)} fill="#C9B79C" />
        ))}
      </g>
      <g ref={javRef} visibility="hidden">
        <JavelinShape length={JAVELIN_LENGTH} stroke={8} />
      </g>
    </svg>
  )
}

/** The landing mark: an invisible point the javelin sticks into, plus a scuff on the ground. */
export function JavelinLanding({ className }: { className?: string }) {
  const reduce = useReducedMotion()
  if (reduce) return null
  return (
    <span aria-hidden data-javelin-land className={`pointer-events-none absolute block h-0 w-0 ${className ?? ''}`}>
      <svg className="absolute -left-6 -top-1 h-3 w-12 overflow-visible" viewBox="0 0 48 12">
        <ellipse cx={24} cy={6} rx={22} ry={4} fill="#000" opacity={0.18} />
      </svg>
    </span>
  )
}

import { createContext, useContext, useEffect, useId, useLayoutEffect, useRef, type ReactNode } from 'react'
import type { MotionValue } from 'motion/react'
import { figureAttrs, INK, RED, type Look, type Pose } from './rig'

/** Position, turn, size, fade and stroke-draw for one prop (a shot, a baton, a trail…). */
export interface PropState {
  x?: number
  y?: number
  rot?: number
  scale?: number
  opacity?: number
  /** 0 → 1 draws a path that has `pathLength={1}` and `data-reveal`. */
  reveal?: number
}

export interface Frame {
  actors: Record<string, Pose>
  props?: Record<string, PropState>
}

export type EventId = 'hurdles' | 'long-jump' | 'high-jump' | 'shot-put' | 'discus' | 'relays' | 'distance'

export interface ArtProps {
  /** Places an athlete from the scene's cast, at its depth in the drawing. */
  Actor: (props: { id: string }) => JSX.Element
  /** Prefix for any SVG ids the art defines, so several stages can share a page. */
  uid: string
}

export interface EventScene {
  id: EventId
  /** Who appears, and how they're dressed. */
  cast: Record<string, Look>
  /** The venue and props, drawn in an 800 × 500 box. */
  Art: (props: ArtProps) => JSX.Element
  /** Where everything is at progress p (0 → 1). Must be pure. */
  frame: (p: number) => Frame
  /** The progress shown as a still picture (reduced motion, thumbnails). */
  poster: number
  /** Describes the still picture for screen readers. */
  alt: string
  /**
   * Progress values where an athlete turns round (their pose flips from
   * facing right to left or back). The rig mirrors them in one frame, so the
   * smoothness check skips these instants.
   */
  turns?: number[]
}

const VIEW_W = 800
const VIEW_H = 500

// --- applying a frame to the DOM --------------------------------------------

type PartEls = Record<string, SVGElement[]>

function propTransform(s: PropState) {
  if (s.x === undefined && s.y === undefined && s.rot === undefined && s.scale === undefined) return null
  return `translate(${(s.x ?? 0).toFixed(1)} ${(s.y ?? 0).toFixed(1)}) rotate(${(s.rot ?? 0).toFixed(1)}) scale(${(s.scale ?? 1).toFixed(3)})`
}

function propAttrs(s: PropState): Record<string, string> {
  const out: Record<string, string> = {}
  const t = propTransform(s)
  if (t) out.transform = t
  if (s.opacity !== undefined) out.opacity = s.opacity.toFixed(3)
  if (s.reveal !== undefined) out['stroke-dashoffset'] = (1 - s.reveal).toFixed(4)
  return out
}

/** Attribute name for each rig part: paths take `d`, polygons `points`, groups `transform`. */
const PART_ATTR: Record<string, string> = {
  legB: 'd', legF: 'd', armB: 'd', armF: 'd', shortsB: 'd', shortsF: 'd',
  torso: 'points', panel: 'points', head: 'transform', pony: 'transform', shoeB: 'transform', shoeF: 'transform',
}

function applyFrame(actors: Map<string, PartEls>, props: Map<string, SVGElement[]>, frame: Frame) {
  for (const [id, parts] of actors) {
    const pose = frame.actors[id]
    if (!pose) continue
    const attrs = figureAttrs(pose) as unknown as Record<string, string>
    for (const part in parts) {
      const v = attrs[part]
      for (const el of parts[part]) el.setAttribute(PART_ATTR[part], v)
    }
  }
  if (!frame.props) return
  for (const id in frame.props) {
    const els = props.get(id)
    if (!els) continue
    const a = propAttrs(frame.props[id])
    for (const el of els) for (const k in a) el.setAttribute(k, a[k])
  }
}

// --- drawing an athlete -----------------------------------------------------

const StageCtx = createContext<{ scene: EventScene; first: Frame } | null>(null)

/** Head art, drawn facing right around the head centre (0, 0). */
function Head({ look }: { look: Look }) {
  return (
    <>
      {look.hairStyle === 'ponytail' && (
        <g data-part="pony">
          <path d="M-16 -12 Q-44 -22 -44 -44" stroke={look.hair} strokeWidth={11} strokeLinecap="round" fill="none" />
        </g>
      )}
      {look.hairStyle === 'bun' && <circle cx={-15} cy={-20} r={9} fill={look.hair} stroke={INK} strokeWidth={3} />}
      <ellipse rx={18} ry={22} fill={look.skin} stroke={INK} strokeWidth={5} />
      {look.hairStyle === 'short' ? (
        <path d="M-17 -4 Q-23 -27 8 -27 Q19 -27 17 -10 Q0 -19 -17 -4Z" fill={look.hair} />
      ) : (
        <path d="M-18 -8 Q-14 -33 9 -27 Q26 -22 24 -4 L15 -12 Q0 -23 -18 -8Z" fill={look.hair} />
      )}
      <circle cx={11} cy={1} r={2.8} fill={INK} />
    </>
  )
}

function Actor({ id }: { id: string }) {
  const ctx = useContext(StageCtx)
  if (!ctx) throw new Error('Actor outside EventStage')
  const look = ctx.scene.cast[id]
  const pose = ctx.first.actors[id]
  if (!look || !pose) return <g />
  const a = figureAttrs(pose)
  const limb = (part: 'legB' | 'legF' | 'armB' | 'armF', skin: string) => {
    const w = part.startsWith('leg') ? [25, 18] : [19, 12]
    return (
      <>
        <path data-part={part} d={a[part]} fill="none" stroke={INK} strokeWidth={w[0]} strokeLinecap="round" strokeLinejoin="round" />
        <path data-part={part} d={a[part]} fill="none" stroke={skin} strokeWidth={w[1]} strokeLinecap="round" strokeLinejoin="round" />
      </>
    )
  }
  const shorts = (part: 'shortsB' | 'shortsF') => (
    <>
      <path data-part={part} d={a[part]} stroke={INK} strokeWidth={29} strokeLinecap="round" />
      <path data-part={part} d={a[part]} stroke={look.shorts} strokeWidth={22} strokeLinecap="round" />
    </>
  )
  const shoe = (part: 'shoeB' | 'shoeF') => (
    <g data-part={part} transform={a[part]}>
      <ellipse rx={16} ry={7} fill={look.shoe} stroke={INK} strokeWidth={3} />
    </g>
  )
  return (
    <g data-actor={id}>
      {limb('armB', look.skinBack)}
      {limb('legB', look.skinBack)}
      {shorts('shortsB')}
      {shoe('shoeB')}
      {limb('legF', look.skin)}
      {shorts('shortsF')}
      {shoe('shoeF')}
      <polygon data-part="torso" points={a.torso} fill={look.singlet} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
      <polygon data-part="panel" points={a.panel} fill={look.panel} />
      <g data-part="head" transform={a.head}>
        <Head look={look} />
      </g>
      {limb('armF', look.skin)}
    </g>
  )
}

// --- the stage --------------------------------------------------------------

function useIsoLayoutEffect(fn: () => void | (() => void), deps: unknown[]) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return (typeof window === 'undefined' ? useEffect : useLayoutEffect)(fn, deps)
}

export interface EventStageProps {
  scene: EventScene
  /** A number, or a motion value to follow (scroll progress, a preview…). */
  progress: number | MotionValue<number>
  className?: string
  /** Hide from assistive tech when the same event is described nearby. */
  decorative?: boolean
  children?: ReactNode
}

/**
 * Draws one event at a given progress. When `progress` is a motion value the
 * stage follows it by writing SVG attributes directly — no React renders per
 * scroll frame.
 */
export function EventStage({ scene, progress, className, decorative }: EventStageProps) {
  const uid = useId().replace(/:/g, '')
  const svgRef = useRef<SVGSVGElement>(null)
  const startP = typeof progress === 'number' ? progress : progress.get()
  const first = useRef<Frame | null>(null)
  if (!first.current) first.current = scene.frame(startP)

  useIsoLayoutEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const actors = new Map<string, PartEls>()
    svg.querySelectorAll<SVGGElement>('[data-actor]').forEach((g) => {
      const parts: PartEls = {}
      g.querySelectorAll<SVGElement>('[data-part]').forEach((el) => {
        const k = el.getAttribute('data-part')!
        ;(parts[k] ??= []).push(el)
      })
      actors.set(g.getAttribute('data-actor')!, parts)
    })
    const props = new Map<string, SVGElement[]>()
    svg.querySelectorAll<SVGElement>('[data-prop]').forEach((el) => {
      const k = el.getAttribute('data-prop')!
      props.set(k, [...(props.get(k) ?? []), el])
    })
    let last = NaN
    const draw = (p: number) => {
      if (p === last) return
      last = p
      applyFrame(actors, props, scene.frame(p))
    }
    if (typeof progress === 'number') {
      draw(progress)
      return
    }
    draw(progress.get())
    return progress.on('change', draw)
  }, [scene, progress])

  const { Art } = scene
  return (
    <StageCtx.Provider value={{ scene, first: first.current }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className={className}
        role={decorative ? undefined : 'img'}
        aria-label={decorative ? undefined : scene.alt}
        aria-hidden={decorative || undefined}
        focusable="false"
      >
        <Art Actor={Actor} uid={uid} />
      </svg>
    </StageCtx.Provider>
  )
}

/** Initial attributes for props, so the first paint (and static markup) is right. */
export function usePropInit(id: string): Record<string, string> {
  const ctx = useContext(StageCtx)
  const s = ctx?.first.props?.[id]
  return s ? propAttrs(s) : {}
}

/** A prop group: `<Prop id="shot">…drawn around (0, 0)…</Prop>`. */
export function Prop({ id, children }: { id: string; children: ReactNode }) {
  const init = usePropInit(id)
  return (
    <g data-prop={id} transform={init.transform} opacity={init.opacity}>
      {children}
    </g>
  )
}

/** A path that draws on with progress: `<Trail id="arc" d="…" />`. */
export function Trail({ id, d, stroke = RED, width = 6, opacity }: { id: string; d: string; stroke?: string; width?: number; opacity?: number }) {
  const init = usePropInit(id)
  return (
    <g opacity={opacity}>
      <path
        data-prop={id}
        d={d}
        pathLength={1}
        fill="none"
        stroke={stroke}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray="1 1"
        strokeDashoffset={init['stroke-dashoffset'] ?? 1}
        opacity={init.opacity}
      />
    </g>
  )
}

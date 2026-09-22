import * as React from 'react'
import { cn } from '@/lib/utils'
import { registration } from '@/data/fees'

interface RegisterButtonProps {
  className?: string
  children?: React.ReactNode
  /** Gentle pulse to draw the eye while registrations are open. */
  pulse?: boolean
}

const COLOURS = ['#5b84a8', '#ff7f50', '#4fd1c5', '#ffd700', '#0ea5e9']

/** One-time celebratory burst when someone heads off to register. */
function burst(origin: HTMLElement) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const rect = origin.getBoundingClientRect()
  const layer = document.createElement('div')
  layer.setAttribute('aria-hidden', 'true')
  layer.style.cssText =
    'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden'
  document.body.appendChild(layer)

  const x = rect.left + rect.width / 2
  const y = rect.top + rect.height / 2
  const pieces: HTMLElement[] = []
  for (let i = 0; i < 28; i++) {
    const p = document.createElement('i')
    p.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:8px;height:8px;border-radius:2px;background:${
      COLOURS[i % COLOURS.length]
    };will-change:transform,opacity`
    layer.appendChild(p)
    pieces.push(p)
    const angle = (Math.PI * 2 * i) / 28 + Math.random() * 0.4
    const dist = 90 + Math.random() * 120
    p.animate(
      [
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
        {
          transform: `translate(${Math.cos(angle) * dist}px, ${
            Math.sin(angle) * dist + 140
          }px) rotate(${Math.random() * 540 - 270}deg)`,
          opacity: 0,
        },
      ],
      { duration: 900 + Math.random() * 400, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' },
    )
  }
  window.setTimeout(() => layer.remove(), 1500)
}

export function RegisterButton({ className, children = 'Register', pulse = true }: RegisterButtonProps) {
  const ref = React.useRef<HTMLAnchorElement>(null)
  const fired = React.useRef(false)

  return (
    <a
      ref={ref}
      href={registration.url}
      target="_blank"
      rel="noopener"
      onClick={() => {
        if (fired.current || !ref.current) return
        fired.current = true
        burst(ref.current)
      }}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full bg-coral-active px-5 py-2.5 text-sm font-semibold text-white',
        'shadow-coral-sm transition-all hover:bg-coral-hover active:translate-y-[2px] active:shadow-none',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        pulse && registration.isOpen && 'animate-register-pulse',
        className,
      )}
    >
      {children}
    </a>
  )
}

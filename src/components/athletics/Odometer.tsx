import { cn } from '@/lib/utils'

/**
 * Rolling-digit counter, like the Sixes "sixes hit" board. Each digit is a
 * vertical strip of 0–9 that slides to the right number; reduced-motion users
 * get the same digits without the roll (see index.css transition override).
 */
function Digit({ value, className }: { value: number; className?: string }) {
  return (
    <span
      className={cn(
        'relative inline-block h-[1.12em] w-[0.74em] overflow-hidden rounded-[0.14em] bg-ink text-cream shadow-[inset_0_-0.06em_0_rgba(255,255,255,0.08),0_0.08em_0_#081624]',
        className,
      )}
    >
      <span
        className="absolute inset-x-0 top-0 flex flex-col transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
        style={{ transform: `translateY(-${value * 1.12}em)` }}
      >
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className="flex h-[1.12em] items-center justify-center">
            {i}
          </span>
        ))}
      </span>
      {/* split-flap seam */}
      <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-black/40" />
    </span>
  )
}

export interface OdometerGroup {
  value: number
  label: string
  /** How many digits to pad to. */
  digits?: number
}

export function Odometer({ groups, className, label }: { groups: OdometerGroup[]; className?: string; label: string }) {
  return (
    <div className={cn('flex flex-wrap items-end justify-center gap-3 md:gap-5', className)} role="timer" aria-label={label}>
      {groups.map((g, gi) => {
        const text = String(Math.max(0, g.value)).padStart(g.digits ?? 2, '0')
        return (
          <div key={g.label} className="flex items-end gap-3 md:gap-5">
            <div className="flex flex-col items-center">
              <div className="flex gap-1 font-display text-6xl font-black leading-none md:gap-1.5 md:text-8xl" aria-hidden>
                {text.split('').map((d, i) => (
                  <Digit key={i} value={Number(d)} />
                ))}
              </div>
              <span className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">{g.label}</span>
            </div>
            {gi < groups.length - 1 && (
              <span aria-hidden className="pb-9 font-display text-5xl font-black text-track md:pb-11 md:text-7xl">
                :
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

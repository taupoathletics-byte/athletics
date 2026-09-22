import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AccordionItem {
  value: string
  title: string
  content: React.ReactNode
}

interface AccordionProps {
  items: AccordionItem[]
  type?: 'single' | 'multiple'
  className?: string
}

/**
 * Disclosure list. Hand-rolled rather than Radix, so the ARIA wiring Radix
 * would supply is explicit here: the trigger points at its panel with
 * aria-controls and the panel points back with aria-labelledby, and the panel
 * stays in the DOM hidden with the `hidden` attribute rather than being
 * unmounted — so browser find-in-page still matches text inside a collapsed
 * answer.
 */
export function Accordion({ items, type = 'single', className }: AccordionProps) {
  const [open, setOpen] = React.useState<string[]>([])
  const base = React.useId()

  const toggle = (v: string) =>
    setOpen((prev) =>
      type === 'single'
        ? prev.includes(v)
          ? []
          : [v]
        : prev.includes(v)
          ? prev.filter((x) => x !== v)
          : [...prev, v],
    )

  return (
    <div className={cn('space-y-2', className)}>
      {items.map((it, i) => {
        const isOpen = open.includes(it.value)
        const triggerId = `${base}-t${i}`
        const panelId = `${base}-p${i}`
        return (
          <div key={it.value} className="rounded-lg border border-outline-variant bg-card shadow-soft-sm">
            <h3 className="m-0">
              <button
                type="button"
                id={triggerId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(it.value)}
                className="flex w-full items-center justify-between gap-4 rounded-lg px-5 py-4 text-left font-semibold text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span>{it.title}</span>
                <ChevronDown
                  aria-hidden
                  className={cn('h-5 w-5 shrink-0 text-primary transition-transform', isOpen && 'rotate-180')}
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={triggerId}
              hidden={!isOpen}
              className="px-5 pb-5 leading-relaxed text-on-surface-variant"
            >
              {it.content}
            </div>
          </div>
        )
      })}
    </div>
  )
}

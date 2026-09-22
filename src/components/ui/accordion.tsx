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

export function Accordion({ items, type = 'single', className }: AccordionProps) {
  const [open, setOpen] = React.useState<string[]>([])

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
      {items.map((it) => {
        const isOpen = open.includes(it.value)
        return (
          <div key={it.value} className="rounded-lg border border-outline-variant bg-card shadow-soft-sm">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-on-surface"
              onClick={() => toggle(it.value)}
              aria-expanded={isOpen}
            >
              <span>{it.title}</span>
              <ChevronDown
                className={cn('h-5 w-5 shrink-0 text-primary transition-transform', isOpen && 'rotate-180')}
              />
            </button>
            {isOpen && (
              <div className="px-5 pb-5 text-sm leading-relaxed text-on-surface-variant">{it.content}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}

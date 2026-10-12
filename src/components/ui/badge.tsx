import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva('inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold', {
  variants: {
    variant: {
      default: 'bg-primary-container text-on-primary-container',
      mint: 'bg-mint-go/20 text-tertiary',
      sunflower: 'bg-sunflower-caution/25 text-on-sunflower',
      signal: 'bg-signal/15 text-on-signal',
      sky: 'bg-sky-info/15 text-sky-info',
      outline: 'border border-outline-variant text-on-surface-variant',
    },
  },
  defaultVariants: { variant: 'default' },
})

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }

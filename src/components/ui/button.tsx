import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-display text-base font-extrabold uppercase tracking-wide transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-info focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-signal text-signal-ink shadow-signal hover:brightness-95 active:translate-y-[3px] active:shadow-none',
        outline:
          'border-2 border-ink bg-transparent text-ink hover:bg-ink hover:text-cream',
        ghost: 'text-on-surface-variant hover:bg-surface-container-low hover:text-primary',
        secondary: 'bg-secondary-container text-on-secondary-container hover:brightness-95',
        mint: 'bg-mint-go text-on-tertiary-container hover:brightness-95',
      },
      size: {
        default: 'h-11 px-6 py-2',
        sm: 'h-9 px-4 text-[0.95rem]',
        lg: 'h-12 px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  ),
)
Button.displayName = 'Button'

export { Button, buttonVariants }

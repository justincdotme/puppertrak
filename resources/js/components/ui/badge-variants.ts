import { cva } from 'class-variance-authority'

export const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-xs font-semibold tracking-wide whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'text-foreground',
        /** Feedings logged. */
        success: 'border-success-border bg-success-surface text-success',
        /** Zero / skipped feedings. */
        warning: 'border-warning-border bg-warning-surface text-warning-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

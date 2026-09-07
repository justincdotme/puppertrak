import { TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AlertBannerProps {
  message: string
  variant?: 'warning' | 'secondary'
}

export function AlertBanner({ message, variant = 'warning' }: AlertBannerProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium',
        variant === 'warning'
          ? 'border-warning-border bg-warning-surface text-warning-foreground'
          : 'border-border bg-muted text-muted-foreground'
      )}
    >
      <TriangleAlert className="size-4 flex-none" />
      {message}
    </div>
  )
}

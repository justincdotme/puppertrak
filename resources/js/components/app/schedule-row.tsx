import { Check, TriangleAlert } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { formatTime } from '@/lib/format'
import type { FeedingScheduleStatus } from '@/api/types'

interface ScheduleRowProps {
  time: string
  status: FeedingScheduleStatus
  label: string
  sublabel: string
  loggedAt: string | null
  onClick?: () => void
}

function StatusIcon({ status }: { status: FeedingScheduleStatus }) {
  switch (status) {
    case 'fed':
      return (
        <span className="flex size-7 items-center justify-center rounded-full bg-success text-success-foreground">
          <Check className="size-4" />
        </span>
      )
    case 'skipped':
      return (
        <span className="flex size-7 items-center justify-center rounded-full border border-warning-border bg-warning-surface text-warning-foreground">
          <TriangleAlert className="size-4" />
        </span>
      )
    case 'overdue':
      return (
        <span className="flex size-7 items-center justify-center rounded-full border border-destructive/40 bg-destructive/10 text-destructive">
          <TriangleAlert className="size-4" />
        </span>
      )
    case 'untracked':
      return (
        <span className="block size-7 rounded-full border-[1.5px] border-dashed border-input opacity-50" />
      )
    case 'upcoming':
    default:
      return (
        <span className="block size-7 rounded-full border-[1.5px] border-dashed border-input" />
      )
  }
}

/** '7:00 AM' from a schedule entry's raw 'HH:MM' time-of-day. */
function formatScheduledTime(time: string): string {
  const [hoursPart, minutesPart] = time.split(':')
  const hours = Number(hoursPart ?? 0)
  const minutes = Number(minutesPart ?? 0)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`
}

export function ScheduleRow({
  time,
  status,
  label,
  sublabel,
  loggedAt,
  onClick,
}: ScheduleRowProps) {
  const interactive = !!onClick
  const untracked = status === 'untracked'

  return (
    <Card
      className={
        'flex items-center gap-3 p-4' +
        (interactive ? ' cursor-pointer hover:border-primary' : '') +
        (untracked ? ' opacity-60' : '')
      }
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      <span className="flex-none">
        <StatusIcon status={status} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{label}</span>
        <span className="block text-sm text-muted-foreground">{sublabel}</span>
        {untracked && <span className="block text-xs text-muted-foreground">Not tracked</span>}
        {loggedAt && (
          <span className="block text-xs text-muted-foreground">at {formatTime(loggedAt)}</span>
        )}
      </span>
      <span className="flex-none font-mono text-sm whitespace-nowrap">
        {formatScheduledTime(time)}
      </span>
    </Card>
  )
}

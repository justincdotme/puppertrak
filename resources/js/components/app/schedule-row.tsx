import { Check, TriangleAlert } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { formatScheduledTime, formatTime } from '@/lib/format'
import type { FeedingScheduleStatus } from '@/api/types'

export interface PortionData {
  logId: number
  amount: string | null
  unit: string | null
  foodName: string | null
  loggedAt: string | null
  wasSkipped: boolean
  skipReason: string | null
}

interface ScheduleRowProps {
  time: string
  status: FeedingScheduleStatus
  label: string
  sublabel: string
  loggedAt: string | null
  onClick?: () => void
  portions?: PortionData[]
  onPortionClick?: (logId: number) => void
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

function PortionLine({
  portion,
  onPortionClick,
}: {
  portion: PortionData
  onPortionClick?: (logId: number) => void
}) {
  const portionLabel = portion.wasSkipped
    ? `Skipped${portion.skipReason ? `: ${portion.skipReason}` : ''}`
    : [portion.amount, portion.unit, portion.foodName].filter(Boolean).join(' ')

  return (
    <span
      role="button"
      tabIndex={0}
      className="-mx-1 block cursor-pointer rounded px-1 py-0.5 hover:bg-muted"
      data-testid={`portion-${portion.logId}`}
      onClick={e => {
        e.stopPropagation()
        onPortionClick?.(portion.logId)
      }}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          e.stopPropagation()
          onPortionClick?.(portion.logId)
        }
      }}
    >
      <span className="block text-sm font-medium">{portionLabel}</span>
      {portion.loggedAt && (
        <span className="block text-xs text-muted-foreground">
          at {formatTime(portion.loggedAt)}
        </span>
      )}
    </span>
  )
}

export function ScheduleRow({
  time,
  status,
  label,
  sublabel,
  loggedAt,
  onClick,
  portions,
  onPortionClick,
}: ScheduleRowProps) {
  const interactive = !!onClick
  const untracked = status === 'untracked'
  const hasPortions = portions && portions.length > 0

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
        {hasPortions ? (
          <span className="grid gap-0.5">
            {portions.map(p => (
              <PortionLine key={p.logId} portion={p} onPortionClick={onPortionClick} />
            ))}
          </span>
        ) : (
          <>
            <span className="block font-semibold">{label}</span>
            <span className="block text-sm text-muted-foreground">{sublabel}</span>
            {untracked && <span className="block text-xs text-muted-foreground">Not tracked</span>}
            {loggedAt && (
              <span className="block text-xs text-muted-foreground">at {formatTime(loggedAt)}</span>
            )}
          </>
        )}
      </span>
      <span className="flex-none font-mono text-sm whitespace-nowrap">
        {formatScheduledTime(time)}
      </span>
    </Card>
  )
}

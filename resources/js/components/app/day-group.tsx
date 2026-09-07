import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDayHeading, formatTime } from '@/lib/format'
import type { HistoryEntry } from '@/api/types'
import { Pencil, Trash2 } from 'lucide-react'

interface DayGroupProps {
  date: string
  entries: HistoryEntry[]
  onEdit?: (entry: HistoryEntry) => void
  onDelete?: (entry: HistoryEntry) => void
}

function entryTime(entry: HistoryEntry): string {
  return formatTime(entry.type === 'feeding' ? entry.fed_at : entry.given_at)
}

function entryLabel(entry: HistoryEntry): string {
  if (entry.type === 'feeding') {
    if (entry.was_skipped) return entry.food_name ?? 'Feeding'
    return `${entry.amount} ${entry.unit} ${entry.food_name ?? ''}`
  }
  return `${entry.amount_given} ${entry.unit} ${entry.supplement_name ?? ''}`
}

export function DayGroup({ date, entries, onEdit, onDelete }: DayGroupProps) {
  const feedingsCount = entries.filter(e => e.type === 'feeding' && !e.was_skipped).length

  return (
    <section className="grid gap-1">
      <div className="flex items-baseline justify-between border-b pb-1.5">
        <h2 className="text-sm font-bold">{formatDayHeading(date)}</h2>
        <span className="font-mono text-xs whitespace-nowrap text-muted-foreground">
          {feedingsCount} {feedingsCount === 1 ? 'feeding' : 'feedings'}
        </span>
      </div>
      <ul>
        {entries.map(entry => {
          const key = `${entry.type}-${entry.id}`
          return (
            <li key={key} className="flex items-start gap-3 py-2.5">
              <span className="w-16 flex-none pt-px font-mono text-sm whitespace-nowrap">
                {entryTime(entry)}
              </span>
              <span className="min-w-0 flex-1">
                {entry.type === 'feeding' ? (
                  <span className="block font-semibold">{entryLabel(entry)}</span>
                ) : (
                  <span className="block text-sm text-muted-foreground">{entryLabel(entry)}</span>
                )}
                {entry.was_skipped && (
                  <span className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge variant="warning">SKIPPED</Badge>
                    <span className="text-sm text-muted-foreground">{entry.skip_reason}</span>
                  </span>
                )}
              </span>
              {(onEdit || onDelete) && (
                <span className="flex flex-none gap-1 pt-0.5">
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => onEdit(entry)}
                      aria-label="Edit"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive"
                      onClick={() => onDelete(entry)}
                      aria-label="Delete"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

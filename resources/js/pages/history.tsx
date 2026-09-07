import { useMemo, useState } from 'react'
import { AppHeader, Screen } from '@/components/app/app-header'
import { DayGroup } from '@/components/app/day-group'
import { LogEditSheet } from '@/components/forms/log-edit-sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useFeedingLogs } from '@/hooks/use-feeding-logs'
import { useSupplementLogs } from '@/hooks/use-supplement-logs'
import { useDogs } from '@/hooks/use-dogs'
import type { FeedingLog, HistoryDay, HistoryEntry, SupplementLog } from '@/api/types'

function daysAgoIso(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function todayIso(): string {
  return daysAgoIso(0)
}

/** Reads the date directly from the ISO string so grouping uses the embedded offset, not the host's local timezone. */
function dateFromTimestamp(iso: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(iso)
  return match?.[1] ?? iso.slice(0, 10)
}

function mergeAndGroup(feedingLogs: FeedingLog[], supplementLogs: SupplementLog[]): HistoryDay[] {
  const entries: HistoryEntry[] = [
    ...feedingLogs.map(log => ({ type: 'feeding' as const, ...log })),
    ...supplementLogs.map(log => ({ type: 'supplement' as const, ...log })),
  ]

  entries.sort((a, b) => {
    const timeA = a.type === 'feeding' ? a.fed_at : a.given_at
    const timeB = b.type === 'feeding' ? b.fed_at : b.given_at
    return timeB.localeCompare(timeA)
  })

  const dayMap = new Map<string, HistoryEntry[]>()
  for (const entry of entries) {
    const ts = entry.type === 'feeding' ? entry.fed_at : entry.given_at
    const date = dateFromTimestamp(ts)
    const existing = dayMap.get(date) ?? []
    existing.push(entry)
    dayMap.set(date, existing)
  }

  return [...dayMap.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, dayEntries]) => ({ date, entries: dayEntries }))
}

export function HistoryPage() {
  const { data: dogs } = useDogs()

  const [dogFilter, setDogFilter] = useState('all')
  const [fromDate, setFromDate] = useState(daysAgoIso(7))
  const [toDate, setToDate] = useState(todayIso())

  const filters = useMemo(() => {
    const params: { dog?: string; from?: string; to?: string } = {}
    if (dogFilter !== 'all') params.dog = dogFilter
    if (fromDate) params.from = fromDate
    if (toDate) params.to = toDate
    return params
  }, [dogFilter, fromDate, toDate])

  const { data: feedingLogs, isLoading: feedingLoading } = useFeedingLogs(filters)
  const { data: supplementLogs, isLoading: supplementLoading } = useSupplementLogs(filters)

  const [editEntry, setEditEntry] = useState<HistoryEntry | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  const days = useMemo(
    () => mergeAndGroup(feedingLogs ?? [], supplementLogs ?? []),
    [feedingLogs, supplementLogs]
  )

  const editDogSlug = useMemo(() => {
    if (!editEntry || !dogs) return undefined
    const dog = dogs.find(d => d.id === editEntry.dog_id)
    return dog?.slug
  }, [editEntry, dogs])

  function handleEdit(entry: HistoryEntry) {
    setEditEntry(entry)
    setEditOpen(true)
  }

  const isLoading = feedingLoading || supplementLoading

  return (
    <div>
      <AppHeader title="History" subtitle="Feeding and supplement logs across all dogs" />

      <Screen>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="history-dog">Dog</Label>
            <Select value={dogFilter} onValueChange={setDogFilter}>
              <SelectTrigger id="history-dog">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All dogs</SelectItem>
                {(dogs ?? []).map(d => (
                  <SelectItem key={d.slug} value={d.slug}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="history-from">From</Label>
            <Input
              id="history-from"
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="history-to">To</Label>
            <Input
              id="history-to"
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
            />
          </div>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}

        {!isLoading &&
          days.map(day => (
            <DayGroup key={day.date} date={day.date} entries={day.entries} onEdit={handleEdit} />
          ))}

        {!isLoading && days.length === 0 && (
          <p className="text-sm text-muted-foreground">No logs found for the selected range.</p>
        )}
      </Screen>

      <LogEditSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        entry={editEntry}
        dogSlug={editDogSlug}
      />
    </div>
  )
}

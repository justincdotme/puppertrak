import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { AppHeader, Screen } from '@/components/app/app-header'
import { DayGroup } from '@/components/app/day-group'
import { LogEditSheet } from '@/components/forms/log-edit-sheet'
import { useDogHistory } from '@/hooks/use-history'
import { useDog } from '@/hooks/use-dogs'
import type { HistoryEntry } from '@/api/types'

export function DogHistoryPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: dog, isLoading: dogLoading } = useDog(slug ?? '')
  const { data: days, isLoading: historyLoading } = useDogHistory(slug ?? '', 7)

  const [editEntry, setEditEntry] = useState<HistoryEntry | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  if (!slug) return <Navigate to="/" replace />
  if (dogLoading || historyLoading) return null

  function handleEdit(entry: HistoryEntry) {
    setEditEntry(entry)
    setEditOpen(true)
  }

  return (
    <div>
      <AppHeader
        title="Feeding history"
        subtitle={`Last 7 days${dog ? ` · ${dog.name}` : ''}`}
        backTo={`/dogs/${slug}`}
        backLabel={dog?.name ?? 'Back'}
      />

      <Screen>
        {(days ?? []).map(day => (
          <DayGroup key={day.date} date={day.date} entries={day.entries} onEdit={handleEdit} />
        ))}
        {days?.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing logged in the last 7 days.</p>
        )}
      </Screen>

      <LogEditSheet open={editOpen} onOpenChange={setEditOpen} entry={editEntry} dogSlug={slug} />
    </div>
  )
}

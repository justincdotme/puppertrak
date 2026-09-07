import { useState } from 'react'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useNotification } from '@/components/app/use-notification'
import { isoToLocal, toIso } from '@/lib/datetime'
import { useUpdateFeedingLog, useDeleteFeedingLog } from '@/hooks/use-feeding-logs'
import { useUpdateSupplementLog, useDeleteSupplementLog } from '@/hooks/use-supplement-logs'
import type { HistoryEntry } from '@/api/types'

const UNITS = ['cup', 'g', 'oz', 'scoop', 'pump', 'chew', 'sachet', 'tablet', 'mL', 'mg'] as const

interface LogEditSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: HistoryEntry | null
  dogSlug?: string
}

export function LogEditSheet({ open, onOpenChange, entry, dogSlug }: LogEditSheetProps) {
  if (!entry) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="grid gap-4">
        <LogEditBody entry={entry} dogSlug={dogSlug} onClose={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  )
}

function LogEditBody({
  entry,
  dogSlug,
  onClose,
}: {
  entry: HistoryEntry
  dogSlug?: string
  onClose: () => void
}) {
  const updateFeeding = useUpdateFeedingLog()
  const deleteFeeding = useDeleteFeedingLog()
  const updateSupplement = useUpdateSupplementLog()
  const deleteSupplement = useDeleteSupplementLog()
  const { notify } = useNotification()

  const initialAmount = entry.type === 'feeding' ? entry.amount : entry.amount_given
  const initialTimestamp = entry.type === 'feeding' ? entry.fed_at : entry.given_at

  const [amount, setAmount] = useState(initialAmount)
  const [unit, setUnit] = useState(entry.unit)
  const [timestamp, setTimestamp] = useState(isoToLocal(initialTimestamp))
  const [skipped, setSkipped] = useState(entry.was_skipped)
  const [reason, setReason] = useState(entry.skip_reason ?? '')
  const [notes, setNotes] = useState(entry.notes ?? '')
  const [reasonError, setReasonError] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function save() {
    if (skipped && reason.trim().length < 3) {
      setReasonError(true)
      return
    }

    if (entry.type === 'feeding') {
      updateFeeding.mutate(
        {
          id: entry.id,
          payload: {
            amount: skipped ? 0 : Number(amount),
            unit,
            fed_at: toIso(timestamp),
            was_skipped: skipped,
            skip_reason: skipped ? reason.trim() : null,
            notes: notes.trim() || null,
          },
          dogSlug,
        },
        {
          onSuccess: onClose,
          onError: () => notify('Failed to update feeding log.'),
        }
      )
    } else {
      updateSupplement.mutate(
        {
          id: entry.id,
          payload: {
            amount_given: skipped ? 0 : Number(amount),
            unit,
            given_at: toIso(timestamp),
            was_skipped: skipped,
            skip_reason: skipped ? reason.trim() : null,
            notes: notes.trim() || null,
          },
          dogSlug,
        },
        {
          onSuccess: onClose,
          onError: () => notify('Failed to update supplement log.'),
        }
      )
    }
  }

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }

    if (entry.type === 'feeding') {
      deleteFeeding.mutate(
        { id: entry.id, dogSlug },
        {
          onSuccess: onClose,
          onError: () => notify('Failed to delete log.'),
        }
      )
    } else {
      deleteSupplement.mutate(
        { id: entry.id, dogSlug },
        {
          onSuccess: onClose,
          onError: () => notify('Failed to delete log.'),
        }
      )
    }
  }

  const isPending =
    updateFeeding.isPending ||
    updateSupplement.isPending ||
    deleteFeeding.isPending ||
    deleteSupplement.isPending

  const title =
    entry.type === 'feeding'
      ? `Edit feeding${entry.food_name ? ` — ${entry.food_name}` : ''}`
      : `Edit supplement${entry.supplement_name ? ` — ${entry.supplement_name}` : ''}`

  return (
    <>
      <SheetHeader>
        <SheetTitle>{title}</SheetTitle>
      </SheetHeader>

      <div className="grid grid-cols-[1fr_7rem] gap-2">
        <div className="grid gap-2">
          <Label htmlFor="log-edit-amount">Amount</Label>
          <Input
            id="log-edit-amount"
            type="number"
            step="any"
            min="0"
            className="font-mono"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            disabled={skipped}
          />
        </div>
        <div className="grid gap-2">
          <Label>Unit</Label>
          <Select value={unit} onValueChange={setUnit}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNITS.map(u => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="log-edit-time">When</Label>
        <Input
          id="log-edit-time"
          type="datetime-local"
          value={timestamp}
          onChange={e => setTimestamp(e.target.value)}
        />
      </div>

      <div className="flex items-center justify-between rounded-md border p-3">
        <Label htmlFor="log-edit-skipped" className="text-base">
          Didn&rsquo;t eat / skipped
        </Label>
        <Switch
          id="log-edit-skipped"
          checked={skipped}
          onCheckedChange={v => {
            setSkipped(v)
            setReasonError(false)
          }}
        />
      </div>

      {skipped && (
        <div className="grid gap-2">
          <Label htmlFor="log-edit-reason">Reason (required)</Label>
          <Input
            id="log-edit-reason"
            value={reason}
            placeholder="e.g. Turned away from the bowl"
            onChange={e => {
              setReason(e.target.value)
              setReasonError(false)
            }}
          />
          {reasonError && (
            <p className="text-sm font-medium text-destructive">
              Add a short reason before confirming.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="log-edit-notes">Notes (optional)</Label>
        <Textarea
          id="log-edit-notes"
          rows={2}
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>

      <SheetFooter>
        <Button variant="destructive" size="xl" onClick={handleDelete} disabled={isPending}>
          {confirmDelete ? 'Confirm delete' : 'Delete'}
        </Button>
        <Button variant="outline" size="xl" onClick={onClose}>
          Cancel
        </Button>
        <Button size="xl" className="flex-1" onClick={save} disabled={isPending}>
          Save
        </Button>
      </SheetFooter>
    </>
  )
}

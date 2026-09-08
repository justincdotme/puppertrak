import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
import { isoToLocal, nowLocal, todayAtLocal, toIso } from '@/lib/datetime'
import {
  useCreateFeedingLog,
  useDeleteFeedingLog,
  useUpdateFeedingLog,
} from '@/hooks/use-feeding-logs'
import { useFoods } from '@/hooks/use-foods'
import type { FeedingLogPayload } from '@/api/feeding-logs'
import type { DogToday, FeedingPlan, FeedingScheduleEntry } from '@/api/types'

const UNITS = ['cup', 'g', 'oz', 'scoop'] as const

interface FeedSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dogSlug: string
  dogToday?: DogToday
  plans?: FeedingPlan[]
  entry?: FeedingScheduleEntry
}

interface FeedSheetBodyProps {
  onOpenChange: (open: boolean) => void
  dogSlug: string
  dogToday?: DogToday
  plans?: FeedingPlan[]
  entry?: FeedingScheduleEntry
}

/** An existing log keeps its own time, a tapped row its slot, ad hoc logging now. */
function initialFedAt(entry?: FeedingScheduleEntry): string {
  if (entry?.logged_at) return isoToLocal(entry.logged_at)
  if (entry) return todayAtLocal(entry.time)

  return nowLocal()
}

function FeedSheetBody({ onOpenChange, dogSlug, dogToday, plans, entry }: FeedSheetBodyProps) {
  const { data: foods } = useFoods()
  const createLog = useCreateFeedingLog()
  const updateLog = useUpdateFeedingLog()
  const deleteLog = useDeleteFeedingLog()
  const { notify } = useNotification()

  const firstPlan = plans?.[0]
  const logId = entry?.log_id ?? null
  const isEdit = logId !== null

  const [foodId, setFoodId] = useState(isEdit ? '' : String(firstPlan?.food_id ?? ''))
  const [amount, setAmount] = useState(entry?.amount ?? firstPlan?.amount ?? '')
  const [unit, setUnit] = useState(entry?.unit ?? firstPlan?.unit ?? '')
  const [fedAt, setFedAt] = useState(initialFedAt(entry))
  const [skipped, setSkipped] = useState(entry?.status === 'skipped')
  const [reason, setReason] = useState(entry?.skip_reason ?? '')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function submit() {
    if (skipped && reason.trim().length < 3) {
      setError(true)
      return
    }

    if (!skipped && !unit) {
      return
    }

    const trimmedNotes = notes.trim()

    if (logId !== null) {
      // The stored food and notes never reach this sheet, so omitting the ones
      // the user left alone stops a save from wiping values it never showed.
      const patch: Partial<FeedingLogPayload> = {
        amount: skipped ? 0 : Number(amount),
        unit,
        fed_at: toIso(fedAt),
        was_skipped: skipped,
        skip_reason: skipped ? reason.trim() : null,
      }

      if (foodId) patch.food_id = Number(foodId)
      if (trimmedNotes) patch.notes = trimmedNotes

      updateLog.mutate(
        { id: logId, payload: patch, dogSlug },
        {
          onSuccess: () => onOpenChange(false),
          onError: () => notify('Failed to update feeding log.'),
        }
      )

      return
    }

    createLog.mutate(
      {
        dogSlug,
        payload: {
          food_id: foodId ? Number(foodId) : null,
          amount: skipped ? 0 : Number(amount),
          unit,
          fed_at: toIso(fedAt),
          was_skipped: skipped,
          skip_reason: skipped ? reason.trim() : null,
          notes: trimmedNotes || null,
        },
      },
      {
        onSuccess: () => onOpenChange(false),
        onError: () => notify('Failed to log feeding.'),
      }
    )
  }

  function remove() {
    if (logId === null) return

    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }

    deleteLog.mutate(
      { id: logId, dogSlug },
      {
        onSuccess: () => onOpenChange(false),
        onError: () => notify('Failed to delete feeding log.'),
      }
    )
  }

  const isPending = createLog.isPending || updateLog.isPending || deleteLog.isPending
  const subtitle = dogToday?.dog.name

  return (
    <>
      <SheetHeader>
        <SheetTitle>{isEdit ? 'Edit feeding log' : 'Log a feeding'}</SheetTitle>
        {subtitle && <SheetDescription>{subtitle}</SheetDescription>}
      </SheetHeader>

      {dogToday?.dog.feeding_instructions && (
        <p className="text-sm text-muted-foreground">{dogToday.dog.feeding_instructions}</p>
      )}

      <div className="grid gap-2">
        <Label>Food</Label>
        <Select value={foodId} onValueChange={setFoodId}>
          <SelectTrigger>
            <SelectValue placeholder={entry?.food_name ?? 'Pick a food'} />
          </SelectTrigger>
          <SelectContent>
            {(foods ?? []).map(f => (
              <SelectItem key={f.id} value={String(f.id)}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-[1fr_7rem] gap-2">
        <div className="grid gap-2">
          <Label htmlFor="feed-amount">Amount</Label>
          <Input
            id="feed-amount"
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
              <SelectValue placeholder="Pick a unit">{unit || undefined}</SelectValue>
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
        <Label htmlFor="feed-fed-at">When</Label>
        <Input
          id="feed-fed-at"
          type="datetime-local"
          value={fedAt}
          onChange={e => setFedAt(e.target.value)}
        />
      </div>

      <div className="flex items-center justify-between rounded-md border p-3">
        <Label htmlFor="feed-skipped" className="text-base">
          Didn&rsquo;t eat / skipped
        </Label>
        <Switch
          id="feed-skipped"
          checked={skipped}
          onCheckedChange={v => {
            setSkipped(v)
            setError(false)
          }}
        />
      </div>

      {skipped && (
        <div className="grid gap-2">
          <Label htmlFor="feed-reason">Reason (required)</Label>
          <Input
            id="feed-reason"
            value={reason}
            placeholder="e.g. Turned away from the bowl"
            onChange={e => {
              setReason(e.target.value)
              setError(false)
            }}
          />
          {error && (
            <p className="text-sm font-medium text-destructive">
              Add a short reason before confirming.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="feed-notes">Notes (optional)</Label>
        <Textarea
          id="feed-notes"
          rows={2}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Ate slowly, seemed off..."
        />
      </div>

      <SheetFooter>
        {isEdit && (
          <Button variant="destructive" size="xl" onClick={remove} disabled={isPending}>
            {confirmDelete ? 'Confirm delete' : 'Delete'}
          </Button>
        )}
        <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          size="xl"
          className="flex-1"
          onClick={submit}
          disabled={isPending || (!skipped && !unit)}
        >
          {isEdit ? 'Save' : 'Confirm'}
        </Button>
      </SheetFooter>
    </>
  )
}

/** Remounts the body each time open transitions to true so state resets. */
export function FeedSheet({ open, onOpenChange, dogSlug, dogToday, plans, entry }: FeedSheetProps) {
  const [revision, setRevision] = useState(0)

  function handleOpenChange(next: boolean) {
    if (next) setRevision(r => r + 1)
    onOpenChange(next)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="grid gap-4">
        {open && (
          <FeedSheetBody
            key={revision}
            onOpenChange={onOpenChange}
            dogSlug={dogSlug}
            dogToday={dogToday}
            plans={plans}
            entry={entry}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

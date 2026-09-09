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
import { formatScheduledTime } from '@/lib/format'
import { useNotification } from '@/components/app/use-notification'
import { isoToLocal, nowLocal, todayAtLocal, toIso } from '@/lib/datetime'
import {
  useCreateFeedingLog,
  useDeleteFeedingLog,
  useUpdateFeedingLog,
} from '@/hooks/use-feeding-logs'
import { useFoods } from '@/hooks/use-foods'
import type { FeedingLogPayload } from '@/api/feeding-logs'
import type { DogToday, FeedingLogEntry, FeedingPlan, FeedingScheduleEntry } from '@/api/types'

const UNITS = ['cup', 'g', 'oz', 'scoop'] as const
const UNSCHEDULED = '_unscheduled'

interface FeedSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dogSlug: string
  dogToday?: DogToday
  plans?: FeedingPlan[]
  entry?: FeedingScheduleEntry
  logEntry?: FeedingLogEntry
}

interface FeedSheetBodyProps {
  onOpenChange: (open: boolean) => void
  dogSlug: string
  dogToday?: DogToday
  plans?: FeedingPlan[]
  entry?: FeedingScheduleEntry
  logEntry?: FeedingLogEntry
}

function initialFedAt(entry?: FeedingScheduleEntry, logEntry?: FeedingLogEntry): string {
  if (logEntry?.logged_at) return isoToLocal(logEntry.logged_at)
  if (entry) return todayAtLocal(entry.time)
  return nowLocal()
}

function initialMealTime(
  scheduleEntries: FeedingScheduleEntry[],
  entry?: FeedingScheduleEntry
): string {
  if (entry) return entry.time

  const firstUnfed = scheduleEntries.find(e => e.logs.length === 0)
  return firstUnfed?.time ?? UNSCHEDULED
}

function FeedSheetBody({
  onOpenChange,
  dogSlug,
  dogToday,
  plans,
  entry,
  logEntry,
}: FeedSheetBodyProps) {
  const { data: foods } = useFoods()
  const createLog = useCreateFeedingLog()
  const updateLog = useUpdateFeedingLog()
  const deleteLog = useDeleteFeedingLog()
  const { notify } = useNotification()

  const firstPlan = plans?.[0]
  const logId = logEntry?.log_id ?? null
  const isEdit = logId !== null

  const scheduleEntries = dogToday?.feedings.schedule ?? []

  const [mealTime, setMealTime] = useState(initialMealTime(scheduleEntries, entry))
  const [foodId, setFoodId] = useState(isEdit ? '' : String(firstPlan?.food_id ?? ''))
  const [amount, setAmount] = useState(logEntry?.amount ?? firstPlan?.amount ?? '')
  const [unit, setUnit] = useState(logEntry?.unit ?? firstPlan?.unit ?? '')
  const [fedAt, setFedAt] = useState(initialFedAt(entry, logEntry))
  const [skipped, setSkipped] = useState(logEntry?.was_skipped ?? false)
  const [reason, setReason] = useState(logEntry?.skip_reason ?? '')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function feedTimePayload(): string | null {
    return mealTime === UNSCHEDULED ? null : mealTime
  }

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
      const patch: Partial<FeedingLogPayload> = {
        amount: skipped ? 0 : Number(amount),
        unit,
        fed_at: toIso(fedAt),
        was_skipped: skipped,
        skip_reason: skipped ? reason.trim() : null,
        feed_time: feedTimePayload(),
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
          feed_time: feedTimePayload(),
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
        <Label>Meal</Label>
        <Select value={mealTime} onValueChange={setMealTime}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {scheduleEntries.map(e => (
              <SelectItem key={e.time} value={e.time}>
                {formatScheduledTime(e.time)}
              </SelectItem>
            ))}
            <SelectItem value={UNSCHEDULED}>Unscheduled meal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label>Food</Label>
        <Select value={foodId} onValueChange={setFoodId}>
          <SelectTrigger>
            <SelectValue placeholder={logEntry?.food_name ?? 'Pick a food'} />
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
export function FeedSheet({
  open,
  onOpenChange,
  dogSlug,
  dogToday,
  plans,
  entry,
  logEntry,
}: FeedSheetProps) {
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
            logEntry={logEntry}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

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
import { nowLocal, toIso } from '@/lib/datetime'
import { useCreateFeedingLog, useUpdateFeedingLog } from '@/hooks/use-feeding-logs'
import { useFoods } from '@/hooks/use-foods'
import type { DogToday, FeedingLog, FeedingPlan } from '@/api/types'

const UNITS = ['cup', 'g', 'oz', 'scoop'] as const

interface FeedSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dogSlug: string
  dogToday?: DogToday
  plans?: FeedingPlan[]
  log?: FeedingLog
}

interface FeedSheetBodyProps {
  onOpenChange: (open: boolean) => void
  dogSlug: string
  dogToday?: DogToday
  plans?: FeedingPlan[]
  log?: FeedingLog
}

function FeedSheetBody({ onOpenChange, dogSlug, dogToday, plans, log }: FeedSheetBodyProps) {
  const { data: foods } = useFoods()
  const createLog = useCreateFeedingLog()
  const updateLog = useUpdateFeedingLog()
  const { notify } = useNotification()

  const firstPlan = plans?.[0]
  const isEdit = !!log

  const [foodId, setFoodId] = useState<string>(
    log ? String(log.food_id ?? '') : String(firstPlan?.food_id ?? '')
  )
  const [amount, setAmount] = useState(log?.amount ?? firstPlan?.amount ?? '')
  const [unit, setUnit] = useState(log?.unit ?? firstPlan?.unit ?? '')
  const [fedAt, setFedAt] = useState(nowLocal())
  const [skipped, setSkipped] = useState(log?.was_skipped ?? false)
  const [reason, setReason] = useState(log?.skip_reason ?? '')
  const [notes, setNotes] = useState(log?.notes ?? '')
  const [error, setError] = useState(false)

  function submit() {
    if (skipped && reason.trim().length < 3) {
      setError(true)
      return
    }

    if (!skipped && !unit) {
      return
    }

    const payload = {
      food_id: foodId ? Number(foodId) : null,
      amount: skipped ? 0 : Number(amount),
      unit,
      fed_at: toIso(fedAt),
      was_skipped: skipped,
      skip_reason: skipped ? reason.trim() : null,
      notes: notes.trim() || null,
    }

    if (isEdit) {
      updateLog.mutate(
        { id: log.id, payload, dogSlug },
        {
          onSuccess: () => onOpenChange(false),
          onError: () => notify('Failed to update feeding log.'),
        }
      )
    } else {
      createLog.mutate(
        { dogSlug, payload },
        {
          onSuccess: () => onOpenChange(false),
          onError: () => notify('Failed to log feeding.'),
        }
      )
    }
  }

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
            <SelectValue placeholder="Pick a food" />
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
        <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          size="xl"
          className="flex-1"
          onClick={submit}
          disabled={createLog.isPending || updateLog.isPending || (!skipped && !unit)}
        >
          {isEdit ? 'Save' : 'Confirm'}
        </Button>
      </SheetFooter>
    </>
  )
}

/** Remounts the body each time open transitions to true so state resets. */
export function FeedSheet({ open, onOpenChange, dogSlug, dogToday, plans, log }: FeedSheetProps) {
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
            log={log}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

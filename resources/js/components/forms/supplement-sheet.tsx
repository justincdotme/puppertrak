import { useState } from 'react'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useNotification } from '@/components/app/use-notification'
import { nowLocal, toIso } from '@/lib/datetime'
import { useCreateSupplementLog, useUpdateSupplementLog } from '@/hooks/use-supplement-logs'
import type { DogSupplement, SupplementLog } from '@/api/types'

interface SupplementSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dogSlug: string
  assignment?: DogSupplement
  log?: SupplementLog
}

interface SupplementSheetBodyProps {
  onOpenChange: (open: boolean) => void
  dogSlug: string
  assignment?: DogSupplement
  log?: SupplementLog
}

function SupplementSheetBody({ onOpenChange, dogSlug, assignment, log }: SupplementSheetBodyProps) {
  const createLog = useCreateSupplementLog()
  const updateLog = useUpdateSupplementLog()
  const { notify } = useNotification()

  const isEdit = !!log

  const [amount, setAmount] = useState(log?.amount_given ?? assignment?.dose ?? '')
  const [unit, setUnit] = useState(log?.unit ?? assignment?.unit ?? '')
  const [givenAt, setGivenAt] = useState(nowLocal())
  const [skipped, setSkipped] = useState(log?.was_skipped ?? false)
  const [reason, setReason] = useState(log?.skip_reason ?? '')
  const [notes, setNotes] = useState(log?.notes ?? '')
  const [error, setError] = useState(false)

  function submit() {
    if (skipped && reason.trim().length < 3) {
      setError(true)
      return
    }

    const payload = {
      dog_supplement_id: assignment?.id ?? log?.dog_supplement_id ?? null,
      amount_given: skipped ? 0 : Number(amount),
      unit,
      given_at: toIso(givenAt),
      was_skipped: skipped,
      skip_reason: skipped ? reason.trim() : null,
      notes: notes.trim() || null,
    }

    if (isEdit) {
      updateLog.mutate(
        { id: log.id, payload, dogSlug },
        {
          onSuccess: () => onOpenChange(false),
          onError: () => notify('Failed to update supplement log.'),
        }
      )
    } else {
      createLog.mutate(
        { dogSlug, payload },
        {
          onSuccess: () => onOpenChange(false),
          onError: () => notify('Failed to log supplement.'),
        }
      )
    }
  }

  const title = isEdit
    ? 'Edit supplement log'
    : assignment
      ? `Give ${assignment.supplement_name ?? 'supplement'}`
      : 'Log a supplement'

  return (
    <>
      <SheetHeader>
        <SheetTitle>{title}</SheetTitle>
      </SheetHeader>

      <div className="grid grid-cols-[1fr_7rem] gap-2">
        <div className="grid gap-2">
          <Label htmlFor="supp-amount">Amount</Label>
          <Input
            id="supp-amount"
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
          <Label htmlFor="supp-unit">Unit</Label>
          <Input
            id="supp-unit"
            value={unit}
            onChange={e => setUnit(e.target.value)}
            placeholder="pump"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="supp-given-at">When</Label>
        <Input
          id="supp-given-at"
          type="datetime-local"
          value={givenAt}
          onChange={e => setGivenAt(e.target.value)}
        />
      </div>

      <div className="flex items-center justify-between rounded-md border p-3">
        <Label htmlFor="supp-skipped" className="text-base">
          Skipped
        </Label>
        <Switch
          id="supp-skipped"
          checked={skipped}
          onCheckedChange={v => {
            setSkipped(v)
            setError(false)
          }}
        />
      </div>

      {skipped && (
        <div className="grid gap-2">
          <Label htmlFor="supp-reason">Reason (required)</Label>
          <Input
            id="supp-reason"
            value={reason}
            placeholder="e.g. Out of stock"
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
        <Label htmlFor="supp-notes">Notes (optional)</Label>
        <Textarea id="supp-notes" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
      </div>

      <SheetFooter>
        <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          size="xl"
          className="flex-1"
          onClick={submit}
          disabled={createLog.isPending || updateLog.isPending}
        >
          {isEdit ? 'Save' : 'Confirm'}
        </Button>
      </SheetFooter>
    </>
  )
}

/** Remounts the body each time open transitions to true so state resets. */
export function SupplementSheet({
  open,
  onOpenChange,
  dogSlug,
  assignment,
  log,
}: SupplementSheetProps) {
  const [revision, setRevision] = useState(0)

  function handleOpenChange(next: boolean) {
    if (next) setRevision(r => r + 1)
    onOpenChange(next)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="grid gap-4">
        {open && (
          <SupplementSheetBody
            key={revision}
            onOpenChange={onOpenChange}
            dogSlug={dogSlug}
            assignment={assignment}
            log={log}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

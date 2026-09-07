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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useNotification } from '@/components/app/use-notification'
import { useDogs } from '@/hooks/use-dogs'
import { useCreateFeedingPlan } from '@/hooks/use-feeding-plans'
import type { Food } from '@/api/types'

const UNITS = ['cup', 'g', 'oz', 'scoop'] as const

interface FeedingPlanSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  food: Food | null
}

export function FeedingPlanSheet({ open, onOpenChange, food }: FeedingPlanSheetProps) {
  if (!food) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="grid gap-4">
        <FeedingPlanBody food={food} onClose={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  )
}

function FeedingPlanBody({ food, onClose }: { food: Food; onClose: () => void }) {
  const { data: dogs } = useDogs()
  const { notify } = useNotification()

  const [dogSlug, setDogSlug] = useState(dogs?.[0]?.slug ?? '')
  const [amount, setAmount] = useState('')
  const [unit, setUnit] = useState('')
  const [notes, setNotes] = useState('')

  const createPlan = useCreateFeedingPlan(dogSlug)

  function submit() {
    if (!dogSlug || !amount || !unit) return

    createPlan.mutate(
      {
        food_id: food.id,
        amount: Number(amount),
        unit,
        notes: notes.trim() || null,
      },
      {
        onSuccess: onClose,
        onError: () => notify('Failed to create feeding plan.'),
      }
    )
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>Assign {food.name}</SheetTitle>
        <SheetDescription>
          Set the amount per feeding for a dog. Feeding times are set on the dog&apos;s profile.
        </SheetDescription>
      </SheetHeader>

      <div className="grid gap-2">
        <Label>Dog</Label>
        <Select value={dogSlug} onValueChange={setDogSlug}>
          <SelectTrigger>
            <SelectValue placeholder="Pick a dog" />
          </SelectTrigger>
          <SelectContent>
            {(dogs ?? []).map(d => (
              <SelectItem key={d.slug} value={d.slug}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-[1fr_7rem] gap-2">
        <div className="grid gap-2">
          <Label htmlFor="plan-amount">Amount per feeding</Label>
          <Input
            id="plan-amount"
            type="number"
            step="any"
            min="0"
            className="font-mono"
            value={amount}
            onChange={e => setAmount(e.target.value)}
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
        <Label htmlFor="plan-notes">Notes (optional)</Label>
        <Textarea
          id="plan-notes"
          rows={2}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="e.g. Topper mixed into the morning meal"
        />
      </div>

      <SheetFooter>
        <Button variant="outline" size="xl" onClick={onClose}>
          Cancel
        </Button>
        <Button
          size="xl"
          className="flex-1"
          onClick={submit}
          disabled={createPlan.isPending || !dogSlug || !amount || !unit}
        >
          Assign
        </Button>
      </SheetFooter>
    </>
  )
}

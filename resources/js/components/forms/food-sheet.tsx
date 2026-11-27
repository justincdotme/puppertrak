import { useState } from 'react'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useNotification } from '@/components/app/use-notification'
import { useCreateFood, useUpdateFood } from '@/hooks/use-foods'
import type { Food } from '@/api/types'

interface FoodSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  food?: Food | null
}

export function FoodSheet({ open, onOpenChange, food }: FoodSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="grid gap-4">
        <FoodSheetBody food={food ?? null} onClose={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  )
}

function FoodSheetBody({ food, onClose }: { food: Food | null; onClose: () => void }) {
  const createFood = useCreateFood()
  const updateFood = useUpdateFood(food?.id ?? 0)
  const { notify } = useNotification()

  const isEdit = !!food

  const [name, setName] = useState(food?.name ?? '')
  const [bagDescription, setBagDescription] = useState(food?.bag_description ?? '')
  const [notes, setNotes] = useState(food?.notes ?? '')
  const [nameError, setNameError] = useState(false)

  function submit() {
    if (!name.trim()) {
      setNameError(true)
      return
    }

    const payload = {
      name: name.trim(),
      bag_description: bagDescription.trim() || null,
      notes: notes.trim() || null,
    }

    if (isEdit) {
      updateFood.mutate(payload, {
        onSuccess: onClose,
        onError: () => notify('Failed to update food.'),
      })
    } else {
      createFood.mutate(payload, {
        onSuccess: onClose,
        onError: () => notify('Failed to create food.'),
      })
    }
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>{isEdit ? 'Edit food' : 'Add a food'}</SheetTitle>
      </SheetHeader>

      <div className="grid gap-2">
        <Label htmlFor="food-name">Name</Label>
        <Input
          id="food-name"
          value={name}
          placeholder="Purina Pro Plan Sensitive Skin"
          onChange={e => {
            setName(e.target.value)
            setNameError(false)
          }}
        />
        {nameError && <p className="text-sm font-medium text-destructive">A name is required.</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="food-bag">Bag description</Label>
        <Input
          id="food-bag"
          value={bagDescription}
          placeholder="Salmon & rice formula, 30 lb bag"
          onChange={e => setBagDescription(e.target.value)}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="food-notes">Notes (optional)</Label>
        <Textarea id="food-notes" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
      </div>

      <SheetFooter>
        <Button variant="outline" size="xl" onClick={onClose}>
          Cancel
        </Button>
        <Button
          size="xl"
          className="flex-1"
          onClick={submit}
          disabled={createFood.isPending || updateFood.isPending}
        >
          {isEdit ? 'Save' : 'Add to catalog'}
        </Button>
      </SheetFooter>
    </>
  )
}

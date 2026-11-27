import { useState } from 'react'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useNotification } from '@/components/app/use-notification'
import { useCreateSupplement, useUpdateSupplement } from '@/hooks/use-supplements'
import type { Supplement } from '@/api/types'

interface SupplementCatalogSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplement?: Supplement | null
}

export function SupplementCatalogSheet({
  open,
  onOpenChange,
  supplement,
}: SupplementCatalogSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="grid gap-4">
        <SupplementCatalogBody
          supplement={supplement ?? null}
          onClose={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  )
}

function SupplementCatalogBody({
  supplement,
  onClose,
}: {
  supplement: Supplement | null
  onClose: () => void
}) {
  const createSupplement = useCreateSupplement()
  const updateSupplement = useUpdateSupplement(supplement?.id ?? 0)
  const { notify } = useNotification()

  const isEdit = !!supplement

  const [name, setName] = useState(supplement?.name ?? '')
  const [defaultUnit, setDefaultUnit] = useState(supplement?.default_unit ?? '')
  const [notes, setNotes] = useState(supplement?.notes ?? '')
  const [nameError, setNameError] = useState(false)

  function submit() {
    if (!name.trim()) {
      setNameError(true)
      return
    }

    const payload = {
      name: name.trim(),
      default_unit: defaultUnit.trim() || null,
      notes: notes.trim() || null,
    }

    if (isEdit) {
      updateSupplement.mutate(payload, {
        onSuccess: onClose,
        onError: () => notify('Failed to update supplement.'),
      })
    } else {
      createSupplement.mutate(payload, {
        onSuccess: onClose,
        onError: () => notify('Failed to create supplement.'),
      })
    }
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>{isEdit ? 'Edit supplement' : 'Add a supplement'}</SheetTitle>
      </SheetHeader>

      <div className="grid gap-2">
        <Label htmlFor="supp-name">Name</Label>
        <Input
          id="supp-name"
          value={name}
          placeholder="Fish oil"
          onChange={e => {
            setName(e.target.value)
            setNameError(false)
          }}
        />
        {nameError && <p className="text-sm font-medium text-destructive">A name is required.</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="supp-unit">Default unit</Label>
        <Input
          id="supp-unit"
          value={defaultUnit}
          placeholder="pump, chew, tablet, mL..."
          onChange={e => setDefaultUnit(e.target.value)}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="supp-notes">Notes (optional)</Label>
        <Textarea id="supp-notes" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
      </div>

      <SheetFooter>
        <Button variant="outline" size="xl" onClick={onClose}>
          Cancel
        </Button>
        <Button
          size="xl"
          className="flex-1"
          onClick={submit}
          disabled={createSupplement.isPending || updateSupplement.isPending}
        >
          {isEdit ? 'Save' : 'Add to catalog'}
        </Button>
      </SheetFooter>
    </>
  )
}

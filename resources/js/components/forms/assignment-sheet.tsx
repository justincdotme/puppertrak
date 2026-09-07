import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { FeedTimesField } from '@/components/forms/feed-times-field'
import { useNotification } from '@/components/app/use-notification'
import { cn } from '@/lib/utils'
import { useDogs } from '@/hooks/use-dogs'
import { useSupplements } from '@/hooks/use-supplements'
import { useCreateDogSupplement, useUpdateDogSupplement } from '@/hooks/use-dog-supplements'
import type { Dog, DogSupplement, Supplement } from '@/api/types'

const schema = z.object({
  dogSlug: z.string().min(1, 'Pick a dog.'),
  supplement_id: z.coerce.number().min(1, 'Pick a supplement.'),
  dose: z.coerce.number().min(0, 'Dose must be 0 or more.'),
  unit: z.string().min(1, 'Unit is required.'),
  times: z.array(z.string()),
  notes: z.string().optional().default(''),
})

type AssignmentFormValues = z.infer<typeof schema>

interface AssignmentSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dog?: Dog
  assignment?: DogSupplement
  supplement?: Supplement
}

export function AssignmentSheet({
  open,
  onOpenChange,
  dog,
  assignment,
  supplement,
}: AssignmentSheetProps) {
  const { data: allDogs } = useDogs()
  const { data: supplements } = useSupplements()
  const { notify } = useNotification()

  const dogSlug = dog?.slug ?? ''
  const isEdit = !!assignment

  const createAssignment = useCreateDogSupplement(dogSlug)
  const updateAssignment = useUpdateDogSupplement(dogSlug, assignment?.id ?? 0)

  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      dogSlug: dogSlug,
      supplement_id: 0,
      dose: 0,
      unit: '',
      times: [],
      notes: '',
    },
  })

  useEffect(() => {
    if (!open) return

    const firstSupplement = supplements?.[0]
    form.reset({
      dogSlug: dogSlug,
      supplement_id: assignment?.supplement_id ?? supplement?.id ?? firstSupplement?.id ?? 0,
      dose: assignment ? Number(assignment.dose) : 1,
      unit: assignment?.unit ?? supplement?.default_unit ?? firstSupplement?.default_unit ?? '',
      times: assignment?.times ?? [],
      notes: assignment?.notes ?? '',
    })
  }, [open, assignment, supplement, dogSlug, supplements, form])

  const selectedDog = dog ?? allDogs?.[0]

  function onSubmit(values: AssignmentFormValues) {
    const slug = values.dogSlug
    const payload = {
      supplement_id: values.supplement_id,
      dose: values.dose,
      unit: values.unit,
      times: values.times.length > 0 ? values.times : null,
      notes: values.notes?.trim() || null,
    }

    if (isEdit) {
      updateAssignment.mutate(payload, {
        onSuccess: () => onOpenChange(false),
        onError: () => notify('Failed to update assignment.'),
      })
    } else {
      createAssignment.mutate(
        { ...payload, supplement_id: values.supplement_id },
        {
          onSuccess: () => onOpenChange(false),
          onError: () => notify('Failed to assign supplement.'),
        }
      )
    }
    void slug
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>{isEdit ? 'Edit assignment' : 'Assign a supplement'}</SheetTitle>
          <SheetDescription>
            Dose and schedule belong to this dog, not to the catalog entry.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
            {!dog && (
              <FormField
                control={form.control}
                name="dogSlug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dog</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pick a dog" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(allDogs ?? []).map(d => (
                          <SelectItem key={d.slug} value={d.slug}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="supplement_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplement</FormLabel>
                  <div className="grid gap-2">
                    {(supplements ?? []).map(s => {
                      const active = s.id === field.value
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            field.onChange(s.id)
                            if (s.default_unit) form.setValue('unit', s.default_unit)
                          }}
                          className={cn(
                            'flex min-h-14 items-center gap-3 rounded-lg border p-3 text-left',
                            active
                              ? 'border-success-border bg-success-surface'
                              : 'border-input bg-card'
                          )}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold">{s.name}</span>
                            {s.default_unit && (
                              <span className="block text-xs text-muted-foreground">
                                default: {s.default_unit}
                              </span>
                            )}
                          </span>
                          {active && <Check className="size-5 flex-none text-success" />}
                        </button>
                      )
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-[1fr_7rem] gap-2">
              <FormField
                control={form.control}
                name="dose"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dose</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        className="font-mono"
                        {...field}
                        onChange={e => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl>
                      <Input placeholder="pump" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="times"
              render={({ field }) => (
                <FormItem>
                  <FeedTimesField
                    value={field.value}
                    onChange={field.onChange}
                    label="Times to give"
                    description="Leave empty for as-needed dosing."
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Give with food" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <SheetFooter>
              <Button type="button" variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="xl"
                className="flex-1"
                disabled={createAssignment.isPending || updateAssignment.isPending}
              >
                {isEdit ? 'Save' : `Assign to ${selectedDog?.name ?? 'dog'}`}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}

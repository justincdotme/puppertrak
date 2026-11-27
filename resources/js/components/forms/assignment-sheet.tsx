import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
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
import {
  useCreateDogSupplement,
  useDeleteDogSupplement,
  useUpdateDogSupplement,
} from '@/hooks/use-dog-supplements'
import type { Dog, DogSupplement, Supplement, SupplementFrequency } from '@/api/types'

const FREQUENCY_OPTIONS: { value: SupplementFrequency; label: string }[] = [
  { value: 'as_needed', label: 'As needed' },
  { value: 'daily', label: 'Every day' },
  { value: 'interval', label: 'Every N days' },
]

const schema = z
  .object({
    dogSlug: z.string().min(1, 'Pick a dog.'),
    supplement_id: z.coerce.number<number>().min(1, 'Pick a supplement.'),
    dose: z.coerce.number<number>().min(0, 'Dose must be 0 or more.'),
    unit: z.string().min(1, 'Unit is required.'),
    frequency: z.enum(['as_needed', 'daily', 'interval']),
    interval_days: z.coerce.number<number>().optional().default(0),
    start_date: z.string().optional().default(''),
    times: z.array(z.string()),
    notes: z.string().optional().default(''),
  })
  .refine(data => data.frequency !== 'interval' || data.interval_days >= 2, {
    message: 'Interval must be 2 or more days.',
    path: ['interval_days'],
  })
  .refine(data => data.frequency !== 'interval' || data.interval_days <= 365, {
    message: 'Interval must be 365 days or fewer.',
    path: ['interval_days'],
  })
  .refine(data => data.frequency !== 'interval' || data.start_date, {
    message: 'Start date is required for interval schedules.',
    path: ['start_date'],
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

  const isEdit = !!assignment

  const createAssignment = useCreateDogSupplement()
  const updateAssignment = useUpdateDogSupplement(assignment?.id ?? 0)
  const deleteAssignment = useDeleteDogSupplement(dog?.slug ?? '')

  const form = useForm<z.input<typeof schema>, unknown, AssignmentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      dogSlug: dog?.slug ?? '',
      supplement_id: 0,
      dose: 0,
      unit: '',
      frequency: 'as_needed',
      interval_days: 0,
      start_date: '',
      times: [],
      notes: '',
    },
  })

  useEffect(() => {
    if (!open) return

    const firstSupplement = supplements?.[0]
    form.reset({
      dogSlug: dog?.slug ?? '',
      supplement_id: assignment?.supplement_id ?? supplement?.id ?? firstSupplement?.id ?? 0,
      dose: assignment ? Number(assignment.dose) : 1,
      unit: assignment?.unit ?? supplement?.default_unit ?? firstSupplement?.default_unit ?? '',
      frequency: assignment?.frequency ?? 'as_needed',
      interval_days: assignment?.interval_days ?? 0,
      start_date: assignment?.start_date ?? '',
      times: assignment?.times ?? [],
      notes: assignment?.notes ?? '',
    })
  }, [open, assignment, supplement, dog?.slug, supplements, form])

  const watchedDogSlug = useWatch({ control: form.control, name: 'dogSlug' })
  const watchedFrequency = useWatch({ control: form.control, name: 'frequency' })
  const selectedDog = dog ?? allDogs?.find(d => d.slug === watchedDogSlug)
  const noDogSelected = !dog && !watchedDogSlug
  const showTimes = watchedFrequency === 'daily' || watchedFrequency === 'interval'
  const showInterval = watchedFrequency === 'interval'

  function onSubmit(values: AssignmentFormValues) {
    // react-hook-form keeps the values of unmounted fields, so times entered
    // before switching to "As needed" are still in the form state.
    const usesTimes = values.frequency === 'daily' || values.frequency === 'interval'
    const payload = {
      dogSlug: values.dogSlug,
      supplement_id: values.supplement_id,
      dose: values.dose,
      unit: values.unit,
      frequency: values.frequency,
      interval_days: values.frequency === 'interval' ? values.interval_days : null,
      start_date: values.frequency === 'interval' ? values.start_date || null : null,
      times: usesTimes && values.times.length > 0 ? values.times : null,
      notes: values.notes?.trim() || null,
    }

    if (isEdit) {
      updateAssignment.mutate(payload, {
        onSuccess: () => onOpenChange(false),
        onError: () => notify('Failed to update assignment.'),
      })
    } else {
      createAssignment.mutate(payload, {
        onSuccess: () => onOpenChange(false),
        onError: () => notify('Failed to assign supplement.'),
      })
    }
  }

  function handleRemove() {
    if (!assignment) return
    const supplementName = assignment.supplement_name ?? 'this supplement'
    if (!window.confirm(`Remove ${supplementName} from ${dog?.name ?? 'this dog'}?`)) return
    deleteAssignment.mutate(assignment.id, {
      onSuccess: () => onOpenChange(false),
      onError: () => notify('Failed to remove assignment.'),
    })
  }

  const isPending =
    createAssignment.isPending || updateAssignment.isPending || deleteAssignment.isPending

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
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Schedule</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FREQUENCY_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showInterval && (
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="interval_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Every N days</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="2"
                          step="1"
                          className="font-mono"
                          {...field}
                          value={Number.isNaN(field.value) ? '' : field.value}
                          onChange={e => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {showTimes && (
              <FormField
                control={form.control}
                name="times"
                render={({ field }) => (
                  <FormItem>
                    <FeedTimesField
                      value={field.value}
                      onChange={field.onChange}
                      label="Times to give"
                      description="Optional. Leave empty for a once-a-day reminder with no specific time."
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
              {isEdit && (
                <Button
                  type="button"
                  variant="destructive"
                  size="xl"
                  onClick={handleRemove}
                  disabled={isPending}
                >
                  Remove
                </Button>
              )}
              <Button type="button" variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="xl"
                className="flex-1"
                disabled={noDogSelected || isPending}
              >
                {isEdit
                  ? 'Save'
                  : noDogSelected
                    ? 'Select a dog'
                    : `Assign to ${selectedDog?.name ?? 'dog'}`}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}

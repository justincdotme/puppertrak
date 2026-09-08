import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useNotification } from '@/components/app/use-notification'
import { isoToLocal, nowLocal, toIso } from '@/lib/datetime'
import { useCreateHealthNote, useUpdateHealthNote } from '@/hooks/use-health-notes'
import type { HealthNote } from '@/api/types'

const schema = z.object({
  occurred_at: z.string().min(1, 'When did this happen?'),
  title: z.string().optional().default(''),
  body: z.string().min(3, 'Add a few words about what happened.'),
})

type HealthNoteValues = z.infer<typeof schema>

interface HealthNoteSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dogSlug: string
  note?: HealthNote
}

export function HealthNoteSheet({ open, onOpenChange, dogSlug, note }: HealthNoteSheetProps) {
  const createNote = useCreateHealthNote(dogSlug)
  const updateNote = useUpdateHealthNote(dogSlug, note?.id ?? 0)
  const { notify } = useNotification()

  const isEdit = !!note

  const form = useForm<HealthNoteValues>({
    resolver: zodResolver(schema),
    defaultValues: { occurred_at: nowLocal(), title: '', body: '' },
  })

  useEffect(() => {
    if (!open) return
    if (note) {
      form.reset({
        occurred_at: isoToLocal(note.occurred_at),
        title: note.title ?? '',
        body: note.body,
      })
    } else {
      form.reset({ occurred_at: nowLocal(), title: '', body: '' })
    }
  }, [open, note, form])

  function onSubmit(values: HealthNoteValues) {
    const payload = {
      occurred_at: toIso(values.occurred_at),
      title: values.title?.trim() || null,
      body: values.body.trim(),
    }

    if (isEdit) {
      updateNote.mutate(payload, {
        onSuccess: () => onOpenChange(false),
        onError: () => notify('Failed to update health note.'),
      })
    } else {
      createNote.mutate(payload, {
        onSuccess: () => onOpenChange(false),
        onError: () => notify('Failed to save health note.'),
      })
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader className="mb-4">
          <SheetTitle>{isEdit ? 'Edit health note' : 'Add illness / injury'}</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="occurred_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>When</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Limping on back left leg" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What happened</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={8}
                      className="min-h-44 leading-relaxed"
                      placeholder="Symptoms, when it started, what you did."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
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
                disabled={createNote.isPending || updateNote.isPending}
              >
                {isEdit ? 'Save' : 'Save note'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}

import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { History, Plus, Stethoscope } from 'lucide-react'
import { AppHeader, Screen } from '@/components/app/app-header'
import { ScheduleRow } from '@/components/app/schedule-row'
import { VetContactCard } from '@/components/app/vet-contact-card'
import { AssignmentSheet } from '@/components/forms/assignment-sheet'
import { FeedSheet } from '@/components/forms/feed-sheet'
import { HealthNoteSheet } from '@/components/forms/health-note-sheet'
import { SupplementSheet } from '@/components/forms/supplement-sheet'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useDog } from '@/hooks/use-dogs'
import { useDogToday } from '@/hooks/use-dashboard'
import { useHealthNotes, useDeleteHealthNote } from '@/hooks/use-health-notes'
import { useNotification } from '@/components/app/use-notification'
import { formatDate, formatStamp } from '@/lib/format'
import type {
  DogSupplement,
  FeedingLog,
  FeedingScheduleEntry,
  HealthNote,
  SupplementScheduleEntry,
} from '@/api/types'

function SectionTitle({
  children,
  action,
}: {
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
        {children}
      </h2>
      {action}
    </div>
  )
}

export function DogPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { data: dog, isLoading: dogLoading } = useDog(slug ?? '')
  const { data: today } = useDogToday(slug ?? '')
  const { data: healthNotes } = useHealthNotes(slug ?? '')
  const deleteNote = useDeleteHealthNote(slug ?? '')
  const { notify } = useNotification()

  const [feedOpen, setFeedOpen] = useState(false)
  const [feedLog, setFeedLog] = useState<FeedingLog | undefined>(undefined)
  const [noteOpen, setNoteOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<HealthNote | undefined>(undefined)
  const [assignOpen, setAssignOpen] = useState(false)
  const [suppOpen, setSuppOpen] = useState(false)
  const [suppAssignment, setSuppAssignment] = useState<DogSupplement | undefined>(undefined)

  if (dogLoading) return null
  if (!dog) return <Navigate to="/" replace />

  const openFeedForSchedule = (entry: FeedingScheduleEntry) => {
    if (entry.status === 'fed' || entry.status === 'skipped') {
      if (entry.log_id) {
        setFeedLog({
          id: entry.log_id,
          dog_id: dog.id,
          food_id: null,
          food_name: entry.food_name,
          amount: entry.amount ?? '0',
          unit: entry.unit ?? 'cup',
          fed_at: entry.logged_at ?? '',
          was_skipped: entry.status === 'skipped',
          skip_reason: entry.skip_reason,
          notes: null,
        })
      }
    } else {
      setFeedLog(undefined)
    }
    setFeedOpen(true)
  }

  const openSuppForSchedule = (entry: SupplementScheduleEntry) => {
    const assignment = dog.dog_supplements?.find(a => a.id === entry.dog_supplement_id)
    setSuppAssignment(assignment)
    setSuppOpen(true)
  }

  const handleDeleteNote = (note: HealthNote) => {
    if (!window.confirm('Delete this health note?')) return
    deleteNote.mutate(note.id, {
      onError: () => notify('Failed to delete health note.'),
    })
  }

  const firstPlan = dog.feeding_plans?.[0]

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader
        title={dog.name}
        subtitle={
          [dog.weight ? `${dog.weight} ${dog.weight_unit}` : null, dog.breed]
            .filter(Boolean)
            .join(' · ') || undefined
        }
        backTo="/"
        backLabel="Dogs"
        action={
          <Button variant="outline" size="lg" className="flex-none whitespace-nowrap" asChild>
            <Link to={'/dogs/' + dog.slug + '/edit'} className="no-underline">
              Edit dog
            </Link>
          </Button>
        }
      />

      <Screen className="pb-6">
        <div className="grid grid-cols-2 gap-2">
          <Card className="p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Rabies
            </p>
            <p className="font-mono text-base">
              {dog.rabies_vaccine_date ? formatDate(dog.rabies_vaccine_date) : '—'}
            </p>
          </Card>
          <Card className="p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              DA2PP
            </p>
            <p className="font-mono text-base">
              {dog.da2pp_vaccine_date ? formatDate(dog.da2pp_vaccine_date) : '—'}
            </p>
          </Card>
        </div>

        <section className="grid gap-2">
          <SectionTitle>Vet contacts</SectionTitle>
          <div className="grid gap-2 sm:grid-cols-3">
            <VetContactCard
              label="Primary vet"
              name={dog.primary_vet_name}
              phone={dog.primary_vet_phone}
              address={dog.primary_vet_address}
            />
            <VetContactCard
              label="Emergency vet"
              name={dog.emergency_vet_name}
              phone={dog.emergency_vet_phone}
              address={dog.emergency_vet_address}
            />
            <VetContactCard
              label="Owner"
              name={dog.owner_name}
              phone={dog.owner_phone}
              address={null}
            />
          </div>
        </section>

        {today && (
          <section className="grid gap-2">
            <SectionTitle
              action={
                <span className="font-mono text-xs whitespace-nowrap text-muted-foreground">
                  {today.feedings.handled} of {today.feedings.expected} today
                </span>
              }
            >
              Today&rsquo;s feedings
            </SectionTitle>
            {today.feedings.schedule.map(entry => {
              const foodLabel = entry.food_name ?? firstPlan?.food_name ?? 'Food not set'
              const amountLabel =
                entry.amount && entry.unit
                  ? `${entry.amount} ${entry.unit}`
                  : firstPlan
                    ? `${firstPlan.amount} ${firstPlan.unit}`
                    : ''

              let sublabel = 'Upcoming'
              if (entry.status === 'fed') sublabel = 'Logged'
              else if (entry.status === 'skipped') sublabel = entry.skip_reason ?? 'Skipped'
              else if (entry.status === 'overdue') sublabel = 'Overdue'

              return (
                <ScheduleRow
                  key={entry.time}
                  time={entry.time}
                  status={entry.status}
                  label={`${entry.time} — ${amountLabel} ${foodLabel}`}
                  sublabel={sublabel}
                  loggedAt={entry.logged_at}
                  onClick={() => openFeedForSchedule(entry)}
                />
              )
            })}

            {today.feedings.extras.length > 0 && (
              <div className="grid gap-2 pl-10">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Extras
                </p>
                {today.feedings.extras.map(extra => (
                  <Card key={extra.log_id} className="p-3 text-sm">
                    {extra.amount} {extra.unit} {extra.food_name ?? ''}{' '}
                    <span className="text-muted-foreground">
                      {extra.logged_at ? `at ${extra.logged_at}` : ''}
                    </span>
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}

        {today && (
          <section className="grid gap-2">
            <SectionTitle
              action={
                <Button
                  variant="link"
                  className="h-8 px-0 whitespace-nowrap"
                  onClick={() => {
                    setSuppAssignment(undefined)
                    setAssignOpen(true)
                  }}
                >
                  <Plus />
                  Assign
                </Button>
              }
            >
              Supplements
            </SectionTitle>

            {today.supplements.schedule.length === 0 &&
              today.supplements.as_needed.length === 0 && (
                <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  Nothing assigned.
                </p>
              )}

            {today.supplements.schedule.map(entry => {
              let sublabel = 'Upcoming'
              if (entry.status === 'fed') sublabel = 'Given'
              else if (entry.status === 'skipped') sublabel = entry.skip_reason ?? 'Skipped'
              else if (entry.status === 'overdue') sublabel = 'Overdue'

              return (
                <ScheduleRow
                  key={`${entry.dog_supplement_id}-${entry.time}`}
                  time={entry.time}
                  status={entry.status}
                  label={`${entry.time} — ${entry.dose} ${entry.unit} ${entry.supplement_name ?? ''}`}
                  sublabel={sublabel}
                  loggedAt={entry.logged_at}
                  onClick={() => openSuppForSchedule(entry)}
                />
              )
            })}

            {today.supplements.as_needed.map(asNeeded => {
              const assignment = dog.dog_supplements?.find(a => a.id === asNeeded.dog_supplement_id)
              return (
                <Card key={asNeeded.dog_supplement_id} className="flex items-center gap-3 p-4">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">
                      {asNeeded.supplement_name ?? 'Supplement'}
                    </span>
                    <span className="block font-mono text-sm">
                      {asNeeded.dose} {asNeeded.unit}
                    </span>
                    <span className="block text-xs text-muted-foreground">As needed</span>
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSuppAssignment(assignment)
                      setSuppOpen(true)
                    }}
                  >
                    Give
                  </Button>
                </Card>
              )
            })}
          </section>
        )}

        <section className="grid gap-2">
          <SectionTitle>Health notes</SectionTitle>
          {!healthNotes || healthNotes.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              No illnesses or injuries logged.
            </p>
          ) : (
            healthNotes.map(note => (
              <Card key={note.id} className="grid gap-2 p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-semibold">{note.title || 'Health note'}</p>
                  <p className="flex-none font-mono text-xs whitespace-nowrap text-muted-foreground">
                    {formatStamp(note.noted_at)}
                  </p>
                </div>
                <Separator />
                <p className="text-sm leading-relaxed text-pretty">{note.body}</p>
                <div className="flex gap-2">
                  <Button
                    variant="link"
                    className="h-7 px-0"
                    onClick={() => {
                      setEditingNote(note)
                      setNoteOpen(true)
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="link"
                    className="h-7 px-0 text-destructive"
                    onClick={() => handleDeleteNote(note)}
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            ))
          )}
        </section>
      </Screen>

      <div className="sticky bottom-20 z-20 border-t bg-background/95 backdrop-blur md:bottom-0">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-4 py-3 sm:flex-row-reverse sm:items-center">
          <Button
            size="xl"
            className="w-full text-lg sm:flex-1"
            onClick={() => {
              setFeedLog(undefined)
              setFeedOpen(true)
            }}
          >
            Feed {dog.name}
          </Button>
          <div className="flex gap-2 sm:flex-1">
            <Button
              variant="outline"
              size="lg"
              className="min-h-12 flex-1 whitespace-nowrap"
              onClick={() => {
                setEditingNote(undefined)
                setNoteOpen(true)
              }}
            >
              <Stethoscope />
              Add illness/injury
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="min-h-12 flex-none whitespace-nowrap"
              onClick={() => navigate('/dogs/' + dog.slug + '/history')}
            >
              <History />
              History
            </Button>
          </div>
        </div>
      </div>

      <FeedSheet
        open={feedOpen}
        onOpenChange={setFeedOpen}
        dogSlug={dog.slug}
        dogToday={today ?? undefined}
        plans={dog.feeding_plans}
        log={feedLog}
      />
      <SupplementSheet
        open={suppOpen}
        onOpenChange={setSuppOpen}
        dogSlug={dog.slug}
        assignment={suppAssignment}
      />
      <AssignmentSheet open={assignOpen} onOpenChange={setAssignOpen} dog={dog} />
      <HealthNoteSheet
        open={noteOpen}
        onOpenChange={setNoteOpen}
        dogSlug={dog.slug}
        note={editingNote}
      />
    </div>
  )
}

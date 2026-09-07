import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { AppHeader, Screen } from '@/components/app/app-header'
import { AlertBanner } from '@/components/app/alert-banner'
import { DogAvatar } from '@/components/app/dog-avatar'
import { FeedSheet } from '@/components/forms/feed-sheet'
import { SupplementSheet } from '@/components/forms/supplement-sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useDashboard } from '@/hooks/use-dashboard'
import { useDogs } from '@/hooks/use-dogs'
import { useUnarchiveDog } from '@/hooks/use-dogs'
import { useNotification } from '@/components/app/use-notification'
import type { DogToday } from '@/api/types'

export function DogsListPage() {
  const navigate = useNavigate()
  const { data: dashboard } = useDashboard()
  const { data: archivedDogs } = useDogs(true)
  const unarchive = useUnarchiveDog()
  const { notify } = useNotification()

  const [feedDog, setFeedDog] = useState<DogToday | null>(null)
  const [suppDog, setSuppDog] = useState<DogToday | null>(null)
  const [archivedExpanded, setArchivedExpanded] = useState(false)

  const warnings = (dashboard ?? []).filter(d => d.alerts.feedings_overdue)
  const suppWarnings = (dashboard ?? []).filter(
    d => d.alerts.supplements_overdue && !d.alerts.feedings_overdue
  )

  return (
    <div>
      <AppHeader
        title="Dogs"
        subtitle={new Date().toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })}
        action={
          <Button
            size="lg"
            className="flex-none whitespace-nowrap"
            onClick={() => navigate('/dogs/new')}
          >
            <Plus />
            Add dog
          </Button>
        }
      />

      <Screen>
        {warnings.length > 0 && (
          <div className="grid gap-2">
            {warnings.map(d => (
              <AlertBanner
                key={d.dog.slug}
                message={`${d.dog.name} has ${d.feedings.overdue} overdue feeding${d.feedings.overdue === 1 ? '' : 's'}`}
                variant="warning"
              />
            ))}
          </div>
        )}

        {suppWarnings.length > 0 && (
          <div className="grid gap-2">
            {suppWarnings.map(d => (
              <AlertBanner
                key={d.dog.slug}
                message={`${d.dog.name} has overdue supplements`}
                variant="secondary"
              />
            ))}
          </div>
        )}

        <ul className="grid gap-3 sm:grid-cols-2">
          {(dashboard ?? []).map(d => (
            <li key={d.dog.slug}>
              <Link to={'/dogs/' + d.dog.slug} className="block no-underline">
                <Card className="flex h-full min-h-23 items-center gap-4 p-4 transition-colors hover:border-primary">
                  <DogAvatar name={d.dog.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-lg font-semibold">{d.dog.name}</span>
                    <span className="block text-sm text-muted-foreground">
                      {d.dog.breed}
                      {d.dog.weight ? ` · ${d.dog.weight} ${d.dog.weight_unit}` : ''}
                    </span>
                  </span>
                  <div className="flex flex-none flex-col items-end gap-1">
                    <Badge
                      variant={d.feedings.overdue > 0 ? 'warning' : 'success'}
                      className="whitespace-nowrap"
                    >
                      {d.feedings.fed} of {d.feedings.expected}
                    </Badge>
                    {d.feedings.skipped > 0 && (
                      <Badge variant="warning" className="whitespace-nowrap">
                        {d.feedings.skipped} skipped
                      </Badge>
                    )}
                    {d.health_notes_last_24h > 0 && (
                      <Badge variant="outline" className="whitespace-nowrap">
                        {d.health_notes_last_24h} note{d.health_notes_last_24h === 1 ? '' : 's'}
                      </Badge>
                    )}
                  </div>
                </Card>
              </Link>
              <div className="mt-2 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setFeedDog(d)}
                >
                  Log feeding
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setSuppDog(d)}
                >
                  Log supplement
                </Button>
              </div>
            </li>
          ))}

          <li className="sm:col-span-2">
            <Button
              variant="outline"
              size="xl"
              className="w-full border-dashed text-primary"
              onClick={() => navigate('/dogs/new')}
            >
              <Plus />
              Add another dog
            </Button>
          </li>
        </ul>

        {archivedDogs && archivedDogs.length > 0 && (
          <section className="mt-4">
            <button
              type="button"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setArchivedExpanded(!archivedExpanded)}
            >
              {archivedExpanded ? 'Hide' : 'Show'} archived ({archivedDogs.length})
            </button>
            {archivedExpanded && (
              <ul className="mt-2 grid gap-2">
                {archivedDogs.map(d => (
                  <li key={d.slug}>
                    <Card className="flex items-center gap-4 p-4 opacity-60">
                      <DogAvatar name={d.name} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{d.name}</span>
                        <span className="block text-sm text-muted-foreground">{d.breed}</span>
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          unarchive.mutate(d.slug, {
                            onError: () => notify('Failed to unarchive.'),
                          })
                        }
                      >
                        Unarchive
                      </Button>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </Screen>

      <FeedSheet
        open={!!feedDog}
        onOpenChange={open => {
          if (!open) setFeedDog(null)
        }}
        dogSlug={feedDog?.dog.slug ?? ''}
        dogToday={feedDog ?? undefined}
      />
      <SupplementSheet
        open={!!suppDog}
        onOpenChange={open => {
          if (!open) setSuppDog(null)
        }}
        dogSlug={suppDog?.dog.slug ?? ''}
      />
    </div>
  )
}

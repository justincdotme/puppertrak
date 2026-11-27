import { AppHeader, Screen } from '@/components/app/app-header'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { useDogsIncludingHidden, useHideDog, useUnhideDog } from '@/hooks/use-dogs'
import { useNotification } from '@/components/app/use-notification'

export function SettingsPage() {
  const { data: dogs } = useDogsIncludingHidden()
  const hideDog = useHideDog()
  const unhideDog = useUnhideDog()
  const { notify } = useNotification()

  const activeDogs = (dogs ?? []).filter(d => !d.archived_at)

  const handleToggle = (slug: string, isCurrentlyVisible: boolean) => {
    const mutation = isCurrentlyVisible ? hideDog : unhideDog
    mutation.mutate(slug, {
      onError: () => notify('Failed to update dog visibility.'),
    })
  }

  return (
    <div>
      <AppHeader title="Settings" />

      <Screen>
        <section>
          <h2 className="mb-3 text-lg font-semibold">Dogs</h2>
          <Card className="divide-y">
            {activeDogs.map(dog => (
              <div key={dog.slug} className="flex items-center justify-between p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{dog.name}</p>
                  <p className="text-sm text-muted-foreground">{dog.breed}</p>
                </div>
                <div className="flex flex-none items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {dog.hidden_at ? 'Hidden' : 'Visible'}
                  </span>
                  <Switch
                    checked={!dog.hidden_at}
                    onCheckedChange={() => handleToggle(dog.slug, !dog.hidden_at)}
                    aria-label={`Toggle visibility for ${dog.name}`}
                  />
                </div>
              </div>
            ))}
          </Card>
        </section>
      </Screen>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useQueries } from '@tanstack/react-query'
import { AppHeader, Screen } from '@/components/app/app-header'
import { FoodSheet } from '@/components/forms/food-sheet'
import { SupplementCatalogSheet } from '@/components/forms/supplement-catalog-sheet'
import { FeedingPlanSheet } from '@/components/forms/feeding-plan-sheet'
import { AssignmentSheet } from '@/components/forms/assignment-sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useNotification } from '@/components/app/use-notification'
import { useFoods, useDeleteFood } from '@/hooks/use-foods'
import { useSupplements, useDeleteSupplement } from '@/hooks/use-supplements'
import { useDogs } from '@/hooks/use-dogs'
import { fetchDog } from '@/api/dogs'
import type { Dog, Food, Supplement } from '@/api/types'
import axios from 'axios'

type PantryTab = 'foods' | 'supplements'

export function PantryPage() {
  const { data: foods } = useFoods()
  const { data: supplements } = useSupplements()
  const { data: dogs } = useDogs()
  const deleteFood = useDeleteFood()
  const deleteSupplement = useDeleteSupplement()
  const { notify } = useNotification()

  const dogDetailQueries = useQueries({
    queries: (dogs ?? []).map(dog => ({
      queryKey: ['dogs', dog.slug],
      queryFn: () => fetchDog(dog.slug),
    })),
  })

  const dogsWithPlans: Dog[] = useMemo(
    () =>
      dogDetailQueries.reduce<Dog[]>((acc, q) => {
        if (q.data) acc.push(q.data)
        return acc
      }, []),
    [dogDetailQueries]
  )

  const [tab, setTab] = useState<PantryTab>('foods')

  const [editFood, setEditFood] = useState<Food | null>(null)
  const [foodOpen, setFoodOpen] = useState(false)

  const [editSupplement, setEditSupplement] = useState<Supplement | null>(null)
  const [supplementOpen, setSupplementOpen] = useState(false)

  const [planFood, setPlanFood] = useState<Food | null>(null)
  const [planOpen, setPlanOpen] = useState(false)

  const [assignSupplement, setAssignSupplement] = useState<Supplement | null>(null)
  const [assignOpen, setAssignOpen] = useState(false)

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  function foodUsedBy(food: Food): string {
    const using = dogsWithPlans.filter(dog => dog.feeding_plans?.some(p => p.food_id === food.id))
    return using.length > 0 ? using.map(d => d.name).join(', ') : 'unassigned'
  }

  function supplementUsedBy(supp: Supplement): string {
    const using = dogsWithPlans.filter(dog =>
      dog.dog_supplements?.some(s => s.supplement_id === supp.id)
    )
    return using.length > 0 ? using.map(d => d.name).join(', ') : 'unassigned'
  }

  function handleDeleteFood(id: number) {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id)
      return
    }
    setConfirmDeleteId(null)
    deleteFood.mutate(id, {
      onError: error => {
        if (axios.isAxiosError(error) && error.response?.status === 422) {
          const message = (error.response.data as { message?: string })?.message
          notify(message ?? 'Cannot delete: this food is still in use.')
        } else {
          notify('Failed to delete food.')
        }
      },
    })
  }

  function handleDeleteSupplement(id: number) {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id)
      return
    }
    setConfirmDeleteId(null)
    deleteSupplement.mutate(id, {
      onError: error => {
        if (axios.isAxiosError(error) && error.response?.status === 422) {
          const message = (error.response.data as { message?: string })?.message
          notify(message ?? 'Cannot delete: this supplement is still in use.')
        } else {
          notify('Failed to delete supplement.')
        }
      },
    })
  }

  return (
    <div>
      <AppHeader
        title="Pantry"
        subtitle="Global catalog. Amounts and frequency are set per dog when you assign."
      >
        <Tabs
          value={tab}
          onValueChange={v => {
            setTab(v as PantryTab)
            setConfirmDeleteId(null)
          }}
          className="mt-3"
        >
          <TabsList>
            <TabsTrigger value="foods">Foods</TabsTrigger>
            <TabsTrigger value="supplements">Supplements</TabsTrigger>
          </TabsList>
        </Tabs>
      </AppHeader>

      <Screen className="gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {tab === 'foods' && (
          <>
            {(foods ?? []).map(food => (
              <Card key={food.id} className="flex h-full items-center gap-3 p-4">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{food.name}</span>
                  {food.bag_description && (
                    <span className="block text-sm text-muted-foreground">
                      {food.bag_description}
                    </span>
                  )}
                </span>
                <span className="flex flex-none flex-col items-end gap-1">
                  <Badge variant="secondary">{foodUsedBy(food)}</Badge>
                  <Button
                    variant="link"
                    className="h-8 px-0"
                    onClick={() => {
                      setEditFood(food)
                      setFoodOpen(true)
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="link"
                    className="h-8 px-0 whitespace-nowrap"
                    onClick={() => {
                      setPlanFood(food)
                      setPlanOpen(true)
                    }}
                  >
                    Assign to dog
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive"
                    onClick={() => handleDeleteFood(food.id)}
                    aria-label={confirmDeleteId === food.id ? 'Confirm delete' : 'Delete food'}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </span>
              </Card>
            ))}
            <Button
              variant="outline"
              size="xl"
              className="w-full border-dashed text-primary sm:col-span-2 lg:col-span-3"
              onClick={() => {
                setEditFood(null)
                setFoodOpen(true)
              }}
            >
              <Plus className="size-4" />
              Add a food
            </Button>
          </>
        )}

        {tab === 'supplements' && (
          <>
            {(supplements ?? []).map(supp => (
              <Card key={supp.id} className="flex h-full items-center gap-3 p-4">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{supp.name}</span>
                  {supp.default_unit && (
                    <span className="block text-sm text-muted-foreground">{supp.default_unit}</span>
                  )}
                </span>
                <span className="flex flex-none flex-col items-end gap-1">
                  <Badge variant="secondary">{supplementUsedBy(supp)}</Badge>
                  <Button
                    variant="link"
                    className="h-8 px-0"
                    onClick={() => {
                      setEditSupplement(supp)
                      setSupplementOpen(true)
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="link"
                    className="h-8 px-0 whitespace-nowrap"
                    onClick={() => {
                      setAssignSupplement(supp)
                      setAssignOpen(true)
                    }}
                  >
                    Assign to dog
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive"
                    onClick={() => handleDeleteSupplement(supp.id)}
                    aria-label={
                      confirmDeleteId === supp.id ? 'Confirm delete' : 'Delete supplement'
                    }
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </span>
              </Card>
            ))}
            <Button
              variant="outline"
              size="xl"
              className="w-full border-dashed text-primary sm:col-span-2 lg:col-span-3"
              onClick={() => {
                setEditSupplement(null)
                setSupplementOpen(true)
              }}
            >
              <Plus className="size-4" />
              Add a supplement
            </Button>
          </>
        )}
      </Screen>

      <FoodSheet open={foodOpen} onOpenChange={setFoodOpen} food={editFood} />
      <SupplementCatalogSheet
        open={supplementOpen}
        onOpenChange={setSupplementOpen}
        supplement={editSupplement}
      />
      <FeedingPlanSheet open={planOpen} onOpenChange={setPlanOpen} food={planFood} />
      <AssignmentSheet
        open={assignOpen}
        onOpenChange={setAssignOpen}
        supplement={assignSupplement ?? undefined}
      />
    </div>
  )
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createFeedingPlan,
  deleteFeedingPlan,
  fetchFeedingPlans,
  updateFeedingPlan,
} from '@/api/feeding-plans'
import type { FeedingPlanPayload } from '@/api/feeding-plans'

export function useFeedingPlans(dogSlug: string) {
  return useQuery({
    queryKey: ['dogs', dogSlug, 'feeding-plans'],
    queryFn: () => fetchFeedingPlans(dogSlug),
    enabled: Boolean(dogSlug),
  })
}

export function useCreateFeedingPlan(dogSlug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: FeedingPlanPayload) => createFeedingPlan(dogSlug, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dogs', dogSlug] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpdateFeedingPlan(dogSlug: string, id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<FeedingPlanPayload>) => updateFeedingPlan(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dogs', dogSlug] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useDeleteFeedingPlan(dogSlug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteFeedingPlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dogs', dogSlug] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

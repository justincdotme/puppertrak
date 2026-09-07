import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createFeedingLog,
  deleteFeedingLog,
  fetchFeedingLogs,
  updateFeedingLog,
} from '@/api/feeding-logs'
import type { FeedingLogFilters, FeedingLogPayload } from '@/api/feeding-logs'

export function useFeedingLogs(filters: FeedingLogFilters = {}) {
  return useQuery({
    queryKey: ['feeding-logs', filters],
    queryFn: () => fetchFeedingLogs(filters),
  })
}

export interface CreateFeedingLogInput {
  dogSlug: string
  payload: FeedingLogPayload
}

export function useCreateFeedingLog() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ dogSlug, payload }: CreateFeedingLogInput) => createFeedingLog(dogSlug, payload),
    onSuccess: (_log, { dogSlug }) => {
      queryClient.invalidateQueries({ queryKey: ['feeding-logs'] })
      queryClient.invalidateQueries({ queryKey: ['dogs', dogSlug] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export interface UpdateFeedingLogInput {
  id: number
  payload: Partial<FeedingLogPayload>
  // The caller always knows which dog it is viewing; passing the slug keeps
  // invalidation scoped instead of dropping every dog's cached schedule.
  dogSlug?: string
}

export function useUpdateFeedingLog() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: UpdateFeedingLogInput) => updateFeedingLog(id, payload),
    onSuccess: (_log, { dogSlug }) => {
      queryClient.invalidateQueries({ queryKey: ['feeding-logs'] })
      queryClient.invalidateQueries({ queryKey: dogSlug ? ['dogs', dogSlug] : ['dogs'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export interface DeleteFeedingLogInput {
  id: number
  dogSlug?: string
}

export function useDeleteFeedingLog() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: DeleteFeedingLogInput) => deleteFeedingLog(id),
    onSuccess: (_result, { dogSlug }) => {
      queryClient.invalidateQueries({ queryKey: ['feeding-logs'] })
      queryClient.invalidateQueries({ queryKey: dogSlug ? ['dogs', dogSlug] : ['dogs'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

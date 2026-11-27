import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createSupplementLog,
  deleteSupplementLog,
  fetchSupplementLogs,
  updateSupplementLog,
} from '@/api/supplement-logs'
import type { SupplementLogFilters, SupplementLogPayload } from '@/api/supplement-logs'

export function useSupplementLogs(filters: SupplementLogFilters = {}) {
  return useQuery({
    queryKey: ['supplement-logs', filters],
    queryFn: () => fetchSupplementLogs(filters),
  })
}

export interface CreateSupplementLogInput {
  dogSlug: string
  payload: SupplementLogPayload
}

export function useCreateSupplementLog() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ dogSlug, payload }: CreateSupplementLogInput) =>
      createSupplementLog(dogSlug, payload),
    onSuccess: (_log, { dogSlug }) => {
      queryClient.invalidateQueries({ queryKey: ['supplement-logs'] })
      queryClient.invalidateQueries({ queryKey: ['dogs', dogSlug] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export interface UpdateSupplementLogInput {
  id: number
  payload: Partial<SupplementLogPayload>
  dogSlug?: string
}

export function useUpdateSupplementLog() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: UpdateSupplementLogInput) => updateSupplementLog(id, payload),
    onSuccess: (_log, { dogSlug }) => {
      queryClient.invalidateQueries({ queryKey: ['supplement-logs'] })
      queryClient.invalidateQueries({ queryKey: dogSlug ? ['dogs', dogSlug] : ['dogs'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export interface DeleteSupplementLogInput {
  id: number
  dogSlug?: string
}

export function useDeleteSupplementLog() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: DeleteSupplementLogInput) => deleteSupplementLog(id),
    onSuccess: (_result, { dogSlug }) => {
      queryClient.invalidateQueries({ queryKey: ['supplement-logs'] })
      queryClient.invalidateQueries({ queryKey: dogSlug ? ['dogs', dogSlug] : ['dogs'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createSupplement,
  deleteSupplement,
  fetchSupplements,
  updateSupplement,
} from '@/api/supplements'
import type { SupplementPayload } from '@/api/supplements'

export function useSupplements() {
  return useQuery({ queryKey: ['supplements'], queryFn: fetchSupplements })
}

export function useCreateSupplement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: SupplementPayload) => createSupplement(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplements'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpdateSupplement(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<SupplementPayload>) => updateSupplement(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplements'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useDeleteSupplement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteSupplement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplements'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

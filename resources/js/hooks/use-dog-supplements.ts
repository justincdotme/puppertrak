import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createDogSupplement,
  deleteDogSupplement,
  fetchDogSupplements,
  updateDogSupplement,
} from '@/api/dog-supplements'
import type { DogSupplementPayload } from '@/api/dog-supplements'

export function useDogSupplements(dogSlug: string) {
  return useQuery({
    queryKey: ['dogs', dogSlug, 'supplements'],
    queryFn: () => fetchDogSupplements(dogSlug),
    enabled: Boolean(dogSlug),
  })
}

export function useCreateDogSupplement(dogSlug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: DogSupplementPayload) => createDogSupplement(dogSlug, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dogs', dogSlug] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpdateDogSupplement(dogSlug: string, id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<DogSupplementPayload>) => updateDogSupplement(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dogs', dogSlug] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useDeleteDogSupplement(dogSlug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteDogSupplement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dogs', dogSlug] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

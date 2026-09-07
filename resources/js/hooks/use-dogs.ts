import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { archiveDog, createDog, fetchDog, fetchDogs, unarchiveDog, updateDog } from '@/api/dogs'
import type { DogPayload } from '@/api/dogs'

export function useDogs(archived = false) {
  return useQuery({ queryKey: ['dogs', { archived }], queryFn: () => fetchDogs(archived) })
}

export function useDog(slug: string) {
  return useQuery({
    queryKey: ['dogs', slug],
    queryFn: () => fetchDog(slug),
    enabled: Boolean(slug),
  })
}

export function useCreateDog() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: DogPayload) => createDog(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dogs'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpdateDog(slug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<DogPayload>) => updateDog(slug, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dogs'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useArchiveDog() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (slug: string) => archiveDog(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dogs'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUnarchiveDog() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (slug: string) => unarchiveDog(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dogs'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

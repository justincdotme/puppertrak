import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFood, deleteFood, fetchFoods, updateFood } from '@/api/foods'
import type { FoodPayload } from '@/api/foods'

export function useFoods() {
  return useQuery({ queryKey: ['foods'], queryFn: fetchFoods })
}

export function useCreateFood() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: FoodPayload) => createFood(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foods'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpdateFood(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<FoodPayload>) => updateFood(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foods'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useDeleteFood() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteFood(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foods'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

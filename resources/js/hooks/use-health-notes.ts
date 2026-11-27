import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createHealthNote,
  deleteHealthNote,
  fetchHealthNotes,
  updateHealthNote,
} from '@/api/health-notes'
import type { HealthNotePayload } from '@/api/health-notes'

export function useHealthNotes(dogSlug: string) {
  return useQuery({
    queryKey: ['dogs', dogSlug, 'health-notes'],
    queryFn: () => fetchHealthNotes(dogSlug),
    enabled: Boolean(dogSlug),
  })
}

export function useCreateHealthNote(dogSlug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: HealthNotePayload) => createHealthNote(dogSlug, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dogs', dogSlug] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpdateHealthNote(dogSlug: string, id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<HealthNotePayload>) => updateHealthNote(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dogs', dogSlug] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useDeleteHealthNote(dogSlug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteHealthNote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dogs', dogSlug] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

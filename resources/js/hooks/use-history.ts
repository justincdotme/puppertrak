import { useQuery } from '@tanstack/react-query'
import { fetchDogHistory } from '@/api/history'

export function useDogHistory(dogSlug: string, days = 7) {
  return useQuery({
    queryKey: ['dogs', dogSlug, 'history', days],
    queryFn: () => fetchDogHistory(dogSlug, days),
    enabled: Boolean(dogSlug),
  })
}

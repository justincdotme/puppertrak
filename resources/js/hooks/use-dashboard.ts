import { useQuery } from '@tanstack/react-query'
import { fetchDashboard, fetchDogToday } from '@/api/dashboard'

export function useDashboard() {
  return useQuery({ queryKey: ['dashboard'], queryFn: fetchDashboard })
}

export function useDogToday(slug: string) {
  return useQuery({
    queryKey: ['dogs', slug, 'today'],
    queryFn: () => fetchDogToday(slug),
    enabled: Boolean(slug),
  })
}

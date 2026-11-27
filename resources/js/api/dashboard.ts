import type { AxiosResponse } from 'axios'
import api from '@/lib/api'
import type { DogToday } from './types'

const unwrap = <T>(res: AxiosResponse<{ data: T }>): T => res.data.data

export async function fetchDashboard(): Promise<DogToday[]> {
  return unwrap(await api.get<{ data: DogToday[] }>('/api/dashboard/today'))
}

/** Archived dogs still resolve here even though the dashboard hides them. */
export async function fetchDogToday(slug: string): Promise<DogToday> {
  return unwrap(await api.get<{ data: DogToday }>(`/api/dogs/${slug}/today`))
}

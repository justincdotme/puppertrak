import type { AxiosResponse } from 'axios'
import api from '@/lib/api'
import type { FeedingPlan } from './types'

const unwrap = <T>(res: AxiosResponse<{ data: T }>): T => res.data.data

export interface FeedingPlanPayload {
  food_id: number
  amount: number
  unit: string
  notes?: string | null
}

export async function fetchFeedingPlans(dogSlug: string): Promise<FeedingPlan[]> {
  return unwrap(await api.get<{ data: FeedingPlan[] }>(`/api/dogs/${dogSlug}/feeding-plans`))
}

export async function createFeedingPlan(
  dogSlug: string,
  payload: FeedingPlanPayload
): Promise<FeedingPlan> {
  return unwrap(
    await api.post<{ data: FeedingPlan }>(`/api/dogs/${dogSlug}/feeding-plans`, payload)
  )
}

export async function updateFeedingPlan(
  id: number,
  payload: Partial<FeedingPlanPayload>
): Promise<FeedingPlan> {
  return unwrap(await api.put<{ data: FeedingPlan }>(`/api/feeding-plans/${id}`, payload))
}

export async function deleteFeedingPlan(id: number): Promise<void> {
  await api.delete(`/api/feeding-plans/${id}`)
}

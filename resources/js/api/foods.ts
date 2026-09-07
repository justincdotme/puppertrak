import type { AxiosResponse } from 'axios'
import api from '@/lib/api'
import type { Food } from './types'

const unwrap = <T>(res: AxiosResponse<{ data: T }>): T => res.data.data

export interface FoodPayload {
  name: string
  bag_description?: string | null
  notes?: string | null
}

export async function fetchFoods(): Promise<Food[]> {
  return unwrap(await api.get<{ data: Food[] }>('/api/foods'))
}

export async function createFood(payload: FoodPayload): Promise<Food> {
  return unwrap(await api.post<{ data: Food }>('/api/foods', payload))
}

export async function updateFood(id: number, payload: Partial<FoodPayload>): Promise<Food> {
  return unwrap(await api.put<{ data: Food }>(`/api/foods/${id}`, payload))
}

/** Rejects with a 422 when the food is still on a feeding plan. */
export async function deleteFood(id: number): Promise<void> {
  await api.delete(`/api/foods/${id}`)
}

import type { AxiosResponse } from 'axios'
import api from '@/lib/api'
import type { DogSupplement } from './types'

const unwrap = <T>(res: AxiosResponse<{ data: T }>): T => res.data.data

export interface DogSupplementPayload {
  supplement_id: number
  dose: number
  unit: string
  times?: string[] | null
  notes?: string | null
}

export async function fetchDogSupplements(dogSlug: string): Promise<DogSupplement[]> {
  return unwrap(await api.get<{ data: DogSupplement[] }>(`/api/dogs/${dogSlug}/supplements`))
}

export async function createDogSupplement(
  dogSlug: string,
  payload: DogSupplementPayload
): Promise<DogSupplement> {
  return unwrap(
    await api.post<{ data: DogSupplement }>(`/api/dogs/${dogSlug}/supplements`, payload)
  )
}

export async function updateDogSupplement(
  id: number,
  payload: Partial<DogSupplementPayload>
): Promise<DogSupplement> {
  return unwrap(await api.put<{ data: DogSupplement }>(`/api/dog-supplements/${id}`, payload))
}

export async function deleteDogSupplement(id: number): Promise<void> {
  await api.delete(`/api/dog-supplements/${id}`)
}

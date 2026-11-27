import type { AxiosResponse } from 'axios'
import api from '@/lib/api'
import type { Supplement } from './types'

const unwrap = <T>(res: AxiosResponse<{ data: T }>): T => res.data.data

export interface SupplementPayload {
  name: string
  default_unit?: string | null
  notes?: string | null
}

export async function fetchSupplements(): Promise<Supplement[]> {
  return unwrap(await api.get<{ data: Supplement[] }>('/api/supplements'))
}

export async function createSupplement(payload: SupplementPayload): Promise<Supplement> {
  return unwrap(await api.post<{ data: Supplement }>('/api/supplements', payload))
}

export async function updateSupplement(
  id: number,
  payload: Partial<SupplementPayload>
): Promise<Supplement> {
  return unwrap(await api.put<{ data: Supplement }>(`/api/supplements/${id}`, payload))
}

/** Rejects with a 422 when the supplement is still assigned to a dog. */
export async function deleteSupplement(id: number): Promise<void> {
  await api.delete(`/api/supplements/${id}`)
}

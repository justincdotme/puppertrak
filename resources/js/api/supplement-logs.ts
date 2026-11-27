import type { AxiosResponse } from 'axios'
import api from '@/lib/api'
import type { SupplementLog } from './types'

const unwrap = <T>(res: AxiosResponse<{ data: T }>): T => res.data.data

export interface SupplementLogFilters {
  dog?: string
  from?: string
  to?: string
}

export interface SupplementLogPayload {
  dog_supplement_id?: number | null
  amount_given: number
  unit: string
  given_at?: string
  was_skipped?: boolean
  skip_reason?: string | null
  notes?: string | null
}

export async function fetchSupplementLogs(
  filters: SupplementLogFilters = {}
): Promise<SupplementLog[]> {
  return unwrap(
    await api.get<{ data: SupplementLog[] }>('/api/supplement-logs', { params: filters })
  )
}

export async function createSupplementLog(
  dogSlug: string,
  payload: SupplementLogPayload
): Promise<SupplementLog> {
  return unwrap(
    await api.post<{ data: SupplementLog }>(`/api/dogs/${dogSlug}/supplement-logs`, payload)
  )
}

export async function updateSupplementLog(
  id: number,
  payload: Partial<SupplementLogPayload>
): Promise<SupplementLog> {
  return unwrap(await api.put<{ data: SupplementLog }>(`/api/supplement-logs/${id}`, payload))
}

export async function deleteSupplementLog(id: number): Promise<void> {
  await api.delete(`/api/supplement-logs/${id}`)
}

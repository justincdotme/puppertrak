import type { AxiosResponse } from 'axios'
import api from '@/lib/api'
import type { FeedingLog } from './types'

const unwrap = <T>(res: AxiosResponse<{ data: T }>): T => res.data.data

export interface FeedingLogFilters {
  dog?: string
  from?: string
  to?: string
}

export interface FeedingLogPayload {
  food_id?: number | null
  amount: number
  unit: string
  fed_at?: string
  was_skipped?: boolean
  skip_reason?: string | null
  notes?: string | null
}

export async function fetchFeedingLogs(filters: FeedingLogFilters = {}): Promise<FeedingLog[]> {
  return unwrap(await api.get<{ data: FeedingLog[] }>('/api/feeding-logs', { params: filters }))
}

export async function createFeedingLog(
  dogSlug: string,
  payload: FeedingLogPayload
): Promise<FeedingLog> {
  return unwrap(await api.post<{ data: FeedingLog }>(`/api/dogs/${dogSlug}/feeding-logs`, payload))
}

export async function updateFeedingLog(
  id: number,
  payload: Partial<FeedingLogPayload>
): Promise<FeedingLog> {
  return unwrap(await api.put<{ data: FeedingLog }>(`/api/feeding-logs/${id}`, payload))
}

export async function deleteFeedingLog(id: number): Promise<void> {
  await api.delete(`/api/feeding-logs/${id}`)
}

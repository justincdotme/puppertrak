import type { AxiosResponse } from 'axios'
import api from '@/lib/api'
import type { HistoryDay } from './types'

const unwrap = <T>(res: AxiosResponse<{ data: T }>): T => res.data.data

export async function fetchDogHistory(dogSlug: string, days = 7): Promise<HistoryDay[]> {
  return unwrap(
    await api.get<{ data: HistoryDay[] }>(`/api/dogs/${dogSlug}/history`, { params: { days } })
  )
}

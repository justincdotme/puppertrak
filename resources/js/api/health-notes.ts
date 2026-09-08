import type { AxiosResponse } from 'axios'
import api from '@/lib/api'
import type { HealthNote } from './types'

const unwrap = <T>(res: AxiosResponse<{ data: T }>): T => res.data.data

export interface HealthNotePayload {
  occurred_at?: string
  title?: string | null
  body: string
}

export async function fetchHealthNotes(dogSlug: string): Promise<HealthNote[]> {
  return unwrap(await api.get<{ data: HealthNote[] }>(`/api/dogs/${dogSlug}/health-notes`))
}

export async function createHealthNote(
  dogSlug: string,
  payload: HealthNotePayload
): Promise<HealthNote> {
  return unwrap(await api.post<{ data: HealthNote }>(`/api/dogs/${dogSlug}/health-notes`, payload))
}

export async function updateHealthNote(
  id: number,
  payload: Partial<HealthNotePayload>
): Promise<HealthNote> {
  return unwrap(await api.put<{ data: HealthNote }>(`/api/health-notes/${id}`, payload))
}

export async function deleteHealthNote(id: number): Promise<void> {
  await api.delete(`/api/health-notes/${id}`)
}

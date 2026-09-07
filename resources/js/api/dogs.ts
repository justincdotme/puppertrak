import type { AxiosResponse } from 'axios'
import api from '@/lib/api'
import type { Dog, Sex, WeightUnit } from './types'

// API Resources wrap their payload in a `data` envelope.
const unwrap = <T>(res: AxiosResponse<{ data: T }>): T => res.data.data

export interface DogPayload {
  name: string
  breed?: string | null
  date_of_birth?: string | null
  age_years?: number | null
  sex?: Sex | null
  is_neutered_or_spayed?: boolean
  weight?: number | null
  weight_unit?: WeightUnit
  color_markings?: string | null
  microchip_number?: string | null
  rabies_vaccine_date?: string | null
  da2pp_vaccine_date?: string | null
  other_vaccines?: string | null
  allergies?: string | null
  medical_conditions?: string | null
  current_medications?: string | null
  primary_vet_name?: string | null
  primary_vet_phone?: string | null
  primary_vet_address?: string | null
  emergency_vet_name?: string | null
  emergency_vet_phone?: string | null
  emergency_vet_address?: string | null
  owner_name?: string | null
  owner_phone?: string | null
  notes?: string | null
  feed_times?: string[] | null
  feeding_instructions?: string | null
}

/** `archived` selects the archived-only index instead of the default active list. */
export async function fetchDogs(archived = false): Promise<Dog[]> {
  return unwrap(
    await api.get<{ data: Dog[] }>('/api/dogs', { params: archived ? { archived: 1 } : undefined })
  )
}

export async function fetchDog(slug: string): Promise<Dog> {
  return unwrap(await api.get<{ data: Dog }>(`/api/dogs/${slug}`))
}

export async function createDog(payload: DogPayload): Promise<Dog> {
  return unwrap(await api.post<{ data: Dog }>('/api/dogs', payload))
}

export async function updateDog(slug: string, payload: Partial<DogPayload>): Promise<Dog> {
  return unwrap(await api.put<{ data: Dog }>(`/api/dogs/${slug}`, payload))
}

export async function archiveDog(slug: string): Promise<Dog> {
  return unwrap(await api.post<{ data: Dog }>(`/api/dogs/${slug}/archive`))
}

export async function unarchiveDog(slug: string): Promise<Dog> {
  return unwrap(await api.post<{ data: Dog }>(`/api/dogs/${slug}/unarchive`))
}

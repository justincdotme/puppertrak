import type { Dog } from '@/api/types'

export interface DogFormValues {
  name: string
  breed: string
  date_of_birth: string
  age_years: string
  sex: 'female' | 'male' | ''
  is_neutered_or_spayed: boolean
  weight: string
  weight_unit: 'lb' | 'kg'
  color_markings: string
  microchip_number: string
  rabies_vaccine_date: string
  da2pp_vaccine_date: string
  other_vaccines: string
  allergies: string
  medical_conditions: string
  primary_vet_name: string
  primary_vet_phone: string
  primary_vet_address: string
  emergency_vet_name: string
  emergency_vet_phone: string
  emergency_vet_address: string
  owner_name: string
  owner_phone: string
  notes: string
  feed_times: string[]
  feeding_instructions: string
  food_id: string
  amount: string
  unit: string
}

export function dogToFormValues(dog: Dog): DogFormValues {
  const firstPlan = dog.feeding_plans?.[0]
  return {
    name: dog.name,
    breed: dog.breed ?? '',
    date_of_birth: dog.date_of_birth ?? '',
    age_years: dog.age_years != null ? String(dog.age_years) : '',
    sex: dog.sex ?? '',
    is_neutered_or_spayed: dog.is_neutered_or_spayed,
    weight: dog.weight ?? '',
    weight_unit: dog.weight_unit,
    color_markings: dog.color_markings ?? '',
    microchip_number: dog.microchip_number ?? '',
    rabies_vaccine_date: dog.rabies_vaccine_date ?? '',
    da2pp_vaccine_date: dog.da2pp_vaccine_date ?? '',
    other_vaccines: dog.other_vaccines ?? '',
    allergies: dog.allergies ?? '',
    medical_conditions: dog.medical_conditions ?? '',
    primary_vet_name: dog.primary_vet_name ?? '',
    primary_vet_phone: dog.primary_vet_phone ?? '',
    primary_vet_address: dog.primary_vet_address ?? '',
    emergency_vet_name: dog.emergency_vet_name ?? '',
    emergency_vet_phone: dog.emergency_vet_phone ?? '',
    emergency_vet_address: dog.emergency_vet_address ?? '',
    owner_name: dog.owner_name ?? '',
    owner_phone: dog.owner_phone ?? '',
    notes: dog.notes ?? '',
    feed_times: dog.feed_times ?? [],
    feeding_instructions: dog.feeding_instructions ?? '',
    food_id: firstPlan ? String(firstPlan.food_id) : '',
    amount: firstPlan?.amount ?? '',
    unit: firstPlan?.unit ?? '',
  }
}

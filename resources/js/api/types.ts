export type WeightUnit = 'lb' | 'kg'
export type Sex = 'male' | 'female'

export interface Dog {
  id: number
  slug: string
  name: string
  breed: string | null
  date_of_birth: string | null
  age_years: number | null
  age: number | null
  sex: Sex | null
  is_neutered_or_spayed: boolean
  weight: string | null
  weight_unit: WeightUnit
  color_markings: string | null
  microchip_number: string | null
  rabies_vaccine_date: string | null
  da2pp_vaccine_date: string | null
  other_vaccines: string | null
  allergies: string | null
  medical_conditions: string | null
  current_medications: string | null
  primary_vet_name: string | null
  primary_vet_phone: string | null
  primary_vet_address: string | null
  emergency_vet_name: string | null
  emergency_vet_phone: string | null
  emergency_vet_address: string | null
  owner_name: string | null
  owner_phone: string | null
  notes: string | null
  feed_times: string[] | null
  archived_at: string | null
  // Present on `GET /dogs/{slug}` only, where the show endpoint eager-loads
  // both relations.
  feeding_plans?: FeedingPlan[]
  dog_supplements?: DogSupplement[]
}

export interface Food {
  id: number
  name: string
  bag_description: string | null
  notes: string | null
}

export interface FeedingPlan {
  id: number
  dog_id: number
  food_id: number
  food_name: string | null
  amount: string
  unit: string
  notes: string | null
}

export interface FeedingLog {
  id: number
  dog_id: number
  food_id: number | null
  food_name: string | null
  amount: string
  unit: string
  fed_at: string
  was_skipped: boolean
  skip_reason: string | null
  notes: string | null
}

export interface Supplement {
  id: number
  name: string
  default_unit: string | null
  notes: string | null
}

export interface DogSupplement {
  id: number
  dog_id: number
  supplement_id: number
  supplement_name: string | null
  default_unit: string | null
  dose: string
  unit: string
  times: string[] | null
  notes: string | null
}

export interface SupplementLog {
  id: number
  dog_id: number
  dog_supplement_id: number | null
  supplement_name: string | null
  amount_given: string
  unit: string
  given_at: string
  was_skipped: boolean
  skip_reason: string | null
  notes: string | null
}

export interface HealthNote {
  id: number
  dog_id: number
  noted_at: string
  title: string | null
  body: string
}

export type HistoryEntry =
  ({ type: 'feeding' } & FeedingLog) | ({ type: 'supplement' } & SupplementLog)

export interface HistoryDay {
  date: string
  entries: HistoryEntry[]
}

// Field names mirror App\Services\TodayService::forDog() exactly.

export interface DogTodaySummary {
  id: number
  slug: string
  name: string
  breed: string | null
  weight: string | null
  weight_unit: WeightUnit
  archived_at: string | null
}

export type FeedingScheduleStatus = 'fed' | 'skipped' | 'overdue' | 'upcoming' | 'untracked'

export interface FeedingScheduleEntry {
  time: string
  status: FeedingScheduleStatus
  log_id: number | null
  logged_at: string | null
  amount: string | null
  unit: string | null
  food_name: string | null
  skip_reason: string | null
}

export interface FeedingExtraEntry {
  log_id: number
  food_name: string | null
  amount: string
  unit: string
  status: 'fed' | 'skipped'
  logged_at: string | null
}

export interface SupplementScheduleEntry {
  dog_supplement_id: number
  supplement_name: string | null
  dose: string
  unit: string
  time: string
  status: FeedingScheduleStatus
  log_id: number | null
  logged_at: string | null
  skip_reason: string | null
}

export interface AsNeededSupplementLog {
  log_id: number
  amount: string
  unit: string
  logged_at: string | null
}

export interface AsNeededSupplement {
  dog_supplement_id: number
  supplement_name: string | null
  dose: string
  unit: string
  logs_today: AsNeededSupplementLog[]
}

export interface DogToday {
  dog: DogTodaySummary
  feedings: {
    expected: number
    handled: number
    fed: number
    skipped: number
    overdue: number
    schedule: FeedingScheduleEntry[]
    extras: FeedingExtraEntry[]
  }
  supplements: {
    expected: number
    handled: number
    overdue: number
    schedule: SupplementScheduleEntry[]
    as_needed: AsNeededSupplement[]
  }
  alerts: {
    feedings_overdue: boolean
    supplements_overdue: boolean
  }
  health_notes_last_24h: number
}

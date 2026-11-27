/** Stands in for "no slot" because a Radix select item cannot hold an empty value. */
export const UNSCHEDULED = '_unscheduled'

export function mealSlotPayload(value: string): string | null {
  return value === UNSCHEDULED ? null : value
}

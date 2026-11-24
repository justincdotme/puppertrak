import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatScheduledTime } from '@/lib/format'
import { UNSCHEDULED } from '@/lib/meal-slot'

interface MealSlotFieldProps {
  times: string[]
  value: string
  onChange: (value: string) => void
  label?: string
}

/**
 * Feed times are stored on the log as a literal time, so editing a dog's schedule
 * strands older logs on a slot the dog no longer has. Keep that slot selectable
 * rather than silently rewriting history the moment someone opens the sheet.
 */
function slotOptions(times: string[], value: string): string[] {
  if (value === UNSCHEDULED || times.includes(value)) {
    return times
  }

  return [...times, value].sort()
}

function slotLabel(time: string, times: string[]): string {
  return times.includes(time)
    ? formatScheduledTime(time)
    : `${formatScheduledTime(time)} (no longer scheduled)`
}

export function MealSlotField({ times, value, onChange, label = 'Meal' }: MealSlotFieldProps) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {slotOptions(times, value).map(time => (
            <SelectItem key={time} value={time}>
              {slotLabel(time, times)}
            </SelectItem>
          ))}
          <SelectItem value={UNSCHEDULED}>Unscheduled meal</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/** Mirrors the server's max:10 rule so the form cannot build a payload the API rejects. */
const MAX_FEED_TIMES = 10

const HOURLY_CANDIDATES = 24

interface FeedTimesFieldProps {
  value: string[]
  onChange: (times: string[]) => void
  label?: string
  description?: string
}

export function FeedTimesField({
  value,
  onChange,
  label = 'Feed times',
  description,
}: FeedTimesFieldProps) {
  const atCapacity = value.length >= MAX_FEED_TIMES

  function addTime() {
    if (atCapacity) {
      return
    }

    // Bounded by the number of candidates rather than by finding a free one,
    // so an exhausted list can never spin.
    for (let offset = 0; offset < HOURLY_CANDIDATES; offset++) {
      const candidate = `${String((12 + offset) % HOURLY_CANDIDATES).padStart(2, '0')}:00`

      if (!value.includes(candidate)) {
        onChange([...value, candidate])
        return
      }
    }
  }

  function removeTime(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  function updateTime(index: number, time: string) {
    const next = [...value]
    next[index] = time
    onChange(next)
  }

  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {value.map((time, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            type="time"
            value={time}
            onChange={e => updateTime(index, e.target.value)}
            className="font-mono"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeTime(index)}
            aria-label="Remove time"
          >
            <Minus className="size-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addTime}
        disabled={atCapacity}
        className="w-fit"
      >
        <Plus className="size-4" />
        Add time
      </Button>
      {value.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Feed times are optional. Add one to enable feeding reminders.
        </p>
      )}
    </div>
  )
}

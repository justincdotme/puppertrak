import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
  function addTime() {
    onChange([...value, '12:00'])
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
      <Button type="button" variant="outline" size="sm" onClick={addTime} className="w-fit">
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

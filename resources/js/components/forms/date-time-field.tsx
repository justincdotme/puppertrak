import type { FieldValues, UseFormRegister, Path } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface DateTimeFieldProps<T extends FieldValues> {
  register: UseFormRegister<T>
  name: Path<T>
  label?: string
  error?: string
}

export function DateTimeField<T extends FieldValues>({
  register,
  name,
  label = 'When',
  error,
}: DateTimeFieldProps<T>) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} type="datetime-local" {...register(name)} />
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
    </div>
  )
}

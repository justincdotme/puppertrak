import { createContext, useContext } from 'react'
import { useFormContext, useFormState } from 'react-hook-form'

export interface FormFieldContextValue {
  name: string
}

export const FormFieldContext = createContext<FormFieldContextValue>({} as FormFieldContextValue)

export const FormItemContext = createContext<{ id: string }>({} as { id: string })

export function useFormField() {
  const fieldContext = useContext(FormFieldContext)
  const itemContext = useContext(FormItemContext)
  const { getFieldState } = useFormContext()
  const formState = useFormState({ name: fieldContext.name })
  const fieldState = getFieldState(fieldContext.name, formState)

  if (!fieldContext) throw new Error('useFormField should be used within <FormField>')

  const { id } = itemContext
  return {
    id,
    name: fieldContext.name,
    formItemId: id + '-form-item',
    formDescriptionId: id + '-form-item-description',
    formMessageId: id + '-form-item-message',
    ...fieldState,
  }
}

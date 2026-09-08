import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { AppHeader, Screen } from '@/components/app/app-header'
import { FeedTimesField } from '@/components/forms/feed-times-field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useNotification } from '@/components/app/use-notification'
import {
  useDog,
  useCreateDog,
  useUpdateDog,
  useArchiveDog,
  useUnarchiveDog,
} from '@/hooks/use-dogs'
import { useFoods } from '@/hooks/use-foods'
import { useCreateFeedingPlan, useUpdateFeedingPlan } from '@/hooks/use-feeding-plans'
import { createFeedingPlan } from '@/api/feeding-plans'
import { dogToFormValues } from '@/lib/dog-form-values'
import type { Dog, Food } from '@/api/types'

const schema = z
  .object({
    name: z.string().min(1, 'A name is required.'),
    breed: z.string().optional().default(''),
    date_of_birth: z.string().optional().default(''),
    age_years: z.string().optional().default(''),
    sex: z.enum(['female', 'male', '']),
    is_neutered_or_spayed: z.boolean(),
    weight: z.string().optional().default(''),
    weight_unit: z.enum(['lb', 'kg']),
    color_markings: z.string().optional().default(''),
    microchip_number: z.string().optional().default(''),
    rabies_vaccine_date: z.string().optional().default(''),
    da2pp_vaccine_date: z.string().optional().default(''),
    other_vaccines: z.string().optional().default(''),
    allergies: z.string().optional().default(''),
    medical_conditions: z.string().optional().default(''),
    primary_vet_name: z.string().optional().default(''),
    primary_vet_phone: z.string().optional().default(''),
    primary_vet_address: z.string().optional().default(''),
    emergency_vet_name: z.string().optional().default(''),
    emergency_vet_phone: z.string().optional().default(''),
    emergency_vet_address: z.string().optional().default(''),
    owner_name: z.string().optional().default(''),
    owner_phone: z.string().optional().default(''),
    notes: z.string().optional().default(''),
    feed_times: z.array(z.string()).refine(times => new Set(times).size === times.length, {
      message: 'Feed times must be unique.',
    }),
    feeding_instructions: z.string().optional().default(''),
    food_id: z.string().optional().default(''),
    amount: z.string().optional().default(''),
    unit: z.string().optional().default(''),
  })
  .refine(data => !data.food_id || data.unit, {
    message: 'A unit is required with a feeding plan.',
    path: ['unit'],
  })

type DogFormValues = z.infer<typeof schema>

const EMPTY_VALUES: DogFormValues = {
  name: '',
  breed: '',
  date_of_birth: '',
  age_years: '',
  sex: '',
  is_neutered_or_spayed: false,
  weight: '',
  weight_unit: 'lb',
  color_markings: '',
  microchip_number: '',
  rabies_vaccine_date: '',
  da2pp_vaccine_date: '',
  other_vaccines: '',
  allergies: '',
  medical_conditions: '',
  primary_vet_name: '',
  primary_vet_phone: '',
  primary_vet_address: '',
  emergency_vet_name: '',
  emergency_vet_phone: '',
  emergency_vet_address: '',
  owner_name: '',
  owner_phone: '',
  notes: '',
  feed_times: [],
  feeding_instructions: '',
  food_id: '',
  amount: '',
  unit: '',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 sm:[&>*:first-child]:col-span-2">
      <h2 className="border-b pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  )
}

export function DogFormPage() {
  const { slug } = useParams<{ slug: string }>()
  const isEdit = !!slug
  const { data: existing, isLoading } = useDog(slug ?? '')

  if (isEdit && isLoading) return null
  if (isEdit && !existing) return <Navigate to="/" replace />

  return <DogFormInner key={slug ?? 'new'} existing={existing} />
}

interface DogFormInnerProps {
  existing?: Dog
}

function DogFormInner({ existing }: DogFormInnerProps) {
  const navigate = useNavigate()
  const { notify } = useNotification()
  const { data: foods } = useFoods()

  const isEdit = !!existing
  const slug = existing?.slug ?? ''
  const createDog = useCreateDog()
  const updateDog = useUpdateDog(slug)
  const archiveDog = useArchiveDog()
  const unarchiveDog = useUnarchiveDog()
  const createPlan = useCreateFeedingPlan(slug)
  const updatePlan = useUpdateFeedingPlan(slug, existing?.feeding_plans?.[0]?.id ?? 0)

  const form = useForm<DogFormValues>({
    resolver: zodResolver(schema),
    defaultValues: existing ? dogToFormValues(existing) : EMPTY_VALUES,
  })

  function toDogPayload(values: DogFormValues) {
    return {
      name: values.name,
      breed: values.breed || null,
      date_of_birth: values.date_of_birth || null,
      age_years: values.age_years ? Number(values.age_years) : null,
      sex: values.sex || null,
      is_neutered_or_spayed: values.is_neutered_or_spayed,
      weight: values.weight ? Number(values.weight) : null,
      weight_unit: values.weight_unit,
      color_markings: values.color_markings || null,
      microchip_number: values.microchip_number || null,
      rabies_vaccine_date: values.rabies_vaccine_date || null,
      da2pp_vaccine_date: values.da2pp_vaccine_date || null,
      other_vaccines: values.other_vaccines || null,
      allergies: values.allergies || null,
      medical_conditions: values.medical_conditions || null,
      current_medications: null,
      primary_vet_name: values.primary_vet_name || null,
      primary_vet_phone: values.primary_vet_phone || null,
      primary_vet_address: values.primary_vet_address || null,
      emergency_vet_name: values.emergency_vet_name || null,
      emergency_vet_phone: values.emergency_vet_phone || null,
      emergency_vet_address: values.emergency_vet_address || null,
      owner_name: values.owner_name || null,
      owner_phone: values.owner_phone || null,
      notes: values.notes || null,
      feed_times: values.feed_times.length > 0 ? values.feed_times : null,
      feeding_instructions: values.feeding_instructions || null,
    }
  }

  function onSubmit(values: DogFormValues) {
    const dogPayload = toDogPayload(values)
    const planPayload = values.food_id
      ? { food_id: Number(values.food_id), amount: Number(values.amount) || 1, unit: values.unit }
      : null

    if (existing) {
      updateDog.mutate(dogPayload, {
        onSuccess: () => {
          if (planPayload && existing.feeding_plans?.[0]) {
            updatePlan.mutate(planPayload)
          } else if (planPayload) {
            createPlan.mutate(planPayload)
          }
          navigate('/dogs/' + existing.slug)
        },
        onError: () => notify('Failed to update dog.'),
      })
    } else {
      createDog.mutate(dogPayload, {
        onSuccess: created => {
          if (planPayload) {
            createFeedingPlan(created.slug, planPayload)
              .then(() => navigate('/'))
              .catch(() => {
                notify('Dog saved but the feeding plan failed.')
                navigate('/')
              })
            return
          }
          navigate('/')
        },
        onError: () => notify('Failed to create dog.'),
      })
    }
  }

  function handleArchive() {
    if (!existing) return
    if (!window.confirm(`Archive ${existing.name}? They will disappear from the dashboard.`)) return
    archiveDog.mutate(existing.slug, {
      onSuccess: () => navigate('/'),
      onError: () => notify('Failed to archive.'),
    })
  }

  function handleUnarchive() {
    if (!existing) return
    unarchiveDog.mutate(existing.slug, {
      onSuccess: () => navigate('/dogs/' + existing.slug),
      onError: () => notify('Failed to unarchive.'),
    })
  }

  const text = (name: string, label: string, placeholder?: string) => (
    <FormField
      key={name}
      control={form.control}
      name={name as keyof DogFormValues}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input placeholder={placeholder} {...field} value={(field.value as string) ?? ''} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  const dateField = (name: string, label: string) => (
    <FormField
      key={name}
      control={form.control}
      name={name as keyof DogFormValues}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input type="date" {...field} value={(field.value as string) ?? ''} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  const area = (name: string, label: string, placeholder?: string) => (
    <FormField
      key={name}
      control={form.control}
      name={name as keyof DogFormValues}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Textarea
              rows={3}
              placeholder={placeholder}
              {...field}
              value={(field.value as string) ?? ''}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <AppHeader
          title={isEdit ? 'Edit ' + existing.name : 'Add a dog'}
          subtitle={
            isEdit
              ? 'Changes show on the dog page right away.'
              : 'Only the name is required to start.'
          }
        />

        <Screen className="pb-6">
          <Section title="Basics">
            {text('name', 'Name', 'Maple')}
            {text('breed', 'Breed', 'Golden Retriever')}
            {dateField('date_of_birth', 'Date of birth')}
            {text('age_years', 'Age (if DOB unknown)', '6')}
            <FormField
              control={form.control}
              name="sex"
              render={({ field }) => {
                const label =
                  field.value === 'female' ? 'Female' : field.value === 'male' ? 'Male' : undefined
                return (
                  <FormItem>
                    <FormLabel>Sex</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select">{label}</SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )
              }}
            />
            <FormField
              control={form.control}
              name="is_neutered_or_spayed"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-md border p-3">
                  <FormLabel className="text-base">Spayed / neutered</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="grid grid-cols-[1fr_7rem] gap-2">
              {text('weight', 'Weight', '61.4')}
              <FormField
                control={form.control}
                name="weight_unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue>{field.value || undefined}</SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="lb">lb</SelectItem>
                        <SelectItem value="kg">kg</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
            {text('color_markings', 'Color / markings', 'Golden, white blaze on chest')}
            {text('microchip_number', 'Microchip #', '985141001234567')}
          </Section>

          <Section title="Feeding plan">
            <FormField
              control={form.control}
              name="feed_times"
              render={({ field }) => (
                <FormItem>
                  <FeedTimesField
                    value={field.value}
                    onChange={field.onChange}
                    label="Feed times"
                    description="Sets the AM / PM schedule on the dog page."
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FoodSelectField foods={foods} control={form.control} />
            <div className="grid grid-cols-[1fr_7rem] gap-2">
              {text('amount', 'Amount per meal', '1')}
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pick a unit">
                            {field.value || undefined}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cup">cup</SelectItem>
                        <SelectItem value="g">g</SelectItem>
                        <SelectItem value="oz">oz</SelectItem>
                        <SelectItem value="scoop">scoop</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {area(
              'feeding_instructions',
              'Special instructions',
              'Grind up the food, add warm water...'
            )}
          </Section>

          <Section title="Vaccines">
            {dateField('rabies_vaccine_date', 'Rabies date')}
            {dateField('da2pp_vaccine_date', 'DA2PP date')}
            {area('other_vaccines', 'Other vaccines', 'Bordetella, leptospirosis...')}
          </Section>

          <Section title="Medical">
            {area('allergies', 'Allergies', 'Chicken, bee stings...')}
            {area('medical_conditions', 'Medical conditions', 'Mild hip dysplasia...')}
            <p className="text-sm text-muted-foreground">
              Supplements are assigned per dog from the dog page or Pantry.
            </p>
          </Section>

          <Section title="Primary vet">
            {text('primary_vet_name', 'Name', 'Cedar Creek Animal Hospital')}
            {text('primary_vet_phone', 'Phone', '(512) 555-0184')}
            {text('primary_vet_address', 'Address', '1420 Cedar Creek Rd, Austin TX')}
          </Section>

          <Section title="Emergency vet">
            {text('emergency_vet_name', 'Name', 'Austin Veterinary Emergency (24h)')}
            {text('emergency_vet_phone', 'Phone', '(512) 555-0911')}
            {text('emergency_vet_address', 'Address', '77 Riverside Dr, Austin TX')}
          </Section>

          <Section title="Owner">
            {text('owner_name', 'Owner name', 'Dana Whitfield')}
            {text('owner_phone', 'Owner phone', '(512) 555-0733')}
          </Section>

          <Section title="Notes">
            {area('notes', 'Notes', 'Anything a sitter should know.')}
          </Section>

          {isEdit && existing && (
            <section className="border-t pt-4">
              {existing.archived_at ? (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={handleUnarchive}
                >
                  Unarchive {existing.name}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="destructive"
                  size="lg"
                  className="w-full"
                  onClick={handleArchive}
                >
                  Archive {existing.name}
                </Button>
              )}
            </section>
          )}
        </Screen>

        <div className="sticky bottom-20 z-20 border-t bg-background/95 px-4 py-3 backdrop-blur md:bottom-0">
          <div className="mx-auto flex w-full max-w-3xl gap-2">
            <Button
              type="button"
              variant="outline"
              size="xl"
              className="flex-none"
              onClick={() => navigate(existing ? '/dogs/' + existing.slug : '/')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="xl"
              className="flex-1"
              disabled={createDog.isPending || updateDog.isPending}
            >
              Save
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}

function FoodSelectField({
  foods,
  control,
}: {
  foods?: Food[]
  control: ReturnType<typeof useForm<DogFormValues>>['control']
}) {
  return (
    <FormField
      control={control}
      name="food_id"
      render={({ field }) => {
        const selectedFoodName = foods?.find(f => String(f.id) === field.value)?.name
        return (
          <FormItem>
            <FormLabel>Food</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a food">{selectedFoodName}</SelectValue>
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {(foods ?? []).map(f => (
                  <SelectItem key={f.id} value={String(f.id)}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>Foods live in the Pantry catalog.</FormDescription>
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}

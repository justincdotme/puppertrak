import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AssignmentSheet } from './assignment-sheet'
import { NotificationProvider } from '@/components/app/notifications'
import { server } from '@/test/server'
import created from '@/test/fixtures/dog-supplements/created.json'
import type { Dog, DogSupplement } from '@/api/types'

const MAPLE: Dog = {
  id: 1,
  slug: 'maple',
  name: 'Maple',
  breed: 'Golden Retriever',
  date_of_birth: null,
  age_years: null,
  age: null,
  sex: 'female',
  is_neutered_or_spayed: true,
  weight: '62.00',
  weight_unit: 'lb',
  color_markings: null,
  microchip_number: null,
  rabies_vaccine_date: null,
  da2pp_vaccine_date: null,
  other_vaccines: null,
  allergies: null,
  medical_conditions: null,
  current_medications: null,
  primary_vet_name: null,
  primary_vet_phone: null,
  primary_vet_address: null,
  emergency_vet_name: null,
  emergency_vet_phone: null,
  emergency_vet_address: null,
  owner_name: null,
  owner_phone: null,
  notes: null,
  feed_times: null,
  feeding_instructions: null,
  archived_at: null,
  hidden_at: null,
}

const FISH_OIL_ASSIGNMENT: DogSupplement = {
  id: 10,
  dog_id: 1,
  supplement_id: 1,
  supplement_name: 'Fish oil',
  default_unit: 'pump',
  dose: '2.00',
  unit: 'pump',
  frequency: 'interval',
  interval_days: 3,
  start_date: '2026-12-01',
  times: ['08:00'],
  notes: null,
}

function renderSheet(props: {
  dog?: Dog
  assignment?: DogSupplement
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(
        NotificationProvider,
        null,
        React.createElement(
          MemoryRouter,
          null,
          React.createElement(AssignmentSheet, {
            open: props.open ?? true,
            onOpenChange: props.onOpenChange ?? vi.fn(),
            dog: props.dog,
            assignment: props.assignment,
          })
        )
      )
    )
  )
}

function capturePosts(): { slug: string; body: Record<string, unknown> }[] {
  const posts: { slug: string; body: Record<string, unknown> }[] = []

  server.use(
    http.post('/api/dogs/:slug/supplements', async ({ params, request }) => {
      posts.push({
        slug: String(params.slug),
        body: (await request.json()) as Record<string, unknown>,
      })

      return HttpResponse.json(created, { status: 201 })
    })
  )

  return posts
}

function capturePuts(): { id: string; body: Record<string, unknown> }[] {
  const puts: { id: string; body: Record<string, unknown> }[] = []

  server.use(
    http.put('/api/dog-supplements/:id', async ({ params, request }) => {
      puts.push({
        id: String(params.id),
        body: (await request.json()) as Record<string, unknown>,
      })

      return HttpResponse.json(created)
    })
  )

  return puts
}

function captureDeletes(): string[] {
  const deletes: string[] = []

  server.use(
    http.delete('/api/dog-supplements/:id', ({ params }) => {
      deletes.push(String(params.id))

      return new HttpResponse(null, { status: 204 })
    })
  )

  return deletes
}

describe('AssignmentSheet', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('disables the submit button with "Select a dog" when opened without a dog', async () => {
    renderSheet({})

    await waitFor(() => {
      expect(screen.getByText('Assign a supplement')).toBeInTheDocument()
    })

    const button = screen.getByRole('button', { name: 'Select a dog' })
    expect(button).toBeDisabled()
  })

  it('preselects the dog from the prop and hides the dropdown', async () => {
    renderSheet({ dog: MAPLE })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Assign to Maple/ })).toBeInTheDocument()
    })

    expect(screen.queryByLabelText('Dog')).not.toBeInTheDocument()
  })

  it('posts to the correct dog URL when submitting', async () => {
    const user = userEvent.setup()
    const posts = capturePosts()

    renderSheet({ dog: MAPLE })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Assign to Maple/ })).toBeInTheDocument()
    })

    // Pick the first supplement to satisfy validation
    const supplementButton = await waitFor(() => screen.getByText('Fish oil'))
    await user.click(supplementButton)

    await user.click(screen.getByRole('button', { name: /Assign to Maple/ }))

    await waitFor(() => {
      expect(posts).toHaveLength(1)
    })

    expect(posts[0]?.slug).toBe('maple')
  })

  it('shows a notification when the create request fails', async () => {
    const user = userEvent.setup()

    server.use(
      http.post('/api/dogs/:slug/supplements', () =>
        HttpResponse.json({ message: 'Server error' }, { status: 500 })
      )
    )

    renderSheet({ dog: MAPLE })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Assign to Maple/ })).toBeInTheDocument()
    })

    const supplementButton = await waitFor(() => screen.getByText('Fish oil'))
    await user.click(supplementButton)

    await user.click(screen.getByRole('button', { name: /Assign to Maple/ }))

    await waitFor(() => {
      expect(screen.getByText('Failed to assign supplement.')).toBeInTheDocument()
    })
  })

  it('sends frequency as_needed when the default schedule is left alone', async () => {
    const user = userEvent.setup()
    const posts = capturePosts()

    renderSheet({ dog: MAPLE })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Assign to Maple/ })).toBeInTheDocument()
    })

    const supplementButton = await waitFor(() => screen.getByText('Fish oil'))
    await user.click(supplementButton)

    await user.click(screen.getByRole('button', { name: /Assign to Maple/ }))

    await waitFor(() => {
      expect(posts).toHaveLength(1)
    })

    expect(posts[0]?.body.frequency).toBe('as_needed')
    expect(posts[0]?.body.interval_days).toBeNull()
    expect(posts[0]?.body.start_date).toBeNull()
  })

  it('sends frequency daily when "Every day" is selected', async () => {
    const user = userEvent.setup()
    const posts = capturePosts()

    renderSheet({ dog: MAPLE })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Assign to Maple/ })).toBeInTheDocument()
    })

    const supplementButton = await waitFor(() => screen.getByText('Fish oil'))
    await user.click(supplementButton)

    await user.click(screen.getByRole('combobox', { name: 'Schedule' }))
    await user.click(screen.getByRole('option', { name: 'Every day' }))

    await user.click(screen.getByRole('button', { name: /Assign to Maple/ }))

    await waitFor(() => {
      expect(posts).toHaveLength(1)
    })

    expect(posts[0]?.body.frequency).toBe('daily')
    expect(posts[0]?.body.interval_days).toBeNull()
    expect(posts[0]?.body.start_date).toBeNull()
  })

  it('sends frequency interval with interval_days and start_date', async () => {
    const user = userEvent.setup()
    const posts = capturePosts()

    renderSheet({ dog: MAPLE })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Assign to Maple/ })).toBeInTheDocument()
    })

    const supplementButton = await waitFor(() => screen.getByText('Fish oil'))
    await user.click(supplementButton)

    await user.click(screen.getByRole('combobox', { name: 'Schedule' }))
    await user.click(screen.getByRole('option', { name: 'Every N days' }))

    const intervalInput = screen.getByLabelText('Every N days')
    await user.clear(intervalInput)
    await user.type(intervalInput, '3')

    const startDateInput = screen.getByLabelText('Start date')
    await user.type(startDateInput, '2026-12-01')

    await user.click(screen.getByRole('button', { name: /Assign to Maple/ }))

    await waitFor(() => {
      expect(posts).toHaveLength(1)
    })

    expect(posts[0]?.body.frequency).toBe('interval')
    expect(posts[0]?.body.interval_days).toBe(3)
    expect(posts[0]?.body.start_date).toBe('2026-12-01')
  })

  it('shows validation error when interval is submitted without a start date', async () => {
    const user = userEvent.setup()

    renderSheet({ dog: MAPLE })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Assign to Maple/ })).toBeInTheDocument()
    })

    const supplementButton = await waitFor(() => screen.getByText('Fish oil'))
    await user.click(supplementButton)

    await user.click(screen.getByRole('combobox', { name: 'Schedule' }))
    await user.click(screen.getByRole('option', { name: 'Every N days' }))

    const intervalInput = screen.getByLabelText('Every N days')
    await user.clear(intervalInput)
    await user.type(intervalInput, '3')

    await user.click(screen.getByRole('button', { name: /Assign to Maple/ }))

    await waitFor(() => {
      expect(screen.getByText('Start date is required for interval schedules.')).toBeInTheDocument()
    })
  })

  it('loads saved schedule fields in edit mode', async () => {
    const puts = capturePuts()

    renderSheet({ dog: MAPLE, assignment: FISH_OIL_ASSIGNMENT })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    })

    expect(screen.getByLabelText('Every N days')).toHaveValue(3)
    expect(screen.getByLabelText('Start date')).toHaveValue('2026-12-01')

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(puts).toHaveLength(1)
    })

    expect(puts[0]?.id).toBe('10')
    expect(puts[0]?.body.frequency).toBe('interval')
    expect(puts[0]?.body.interval_days).toBe(3)
    expect(puts[0]?.body.start_date).toBe('2026-12-01')
    expect(puts[0]?.body.times).toEqual(['08:00'])
  })

  it('removes the assignment only after the removal is confirmed', async () => {
    const user = userEvent.setup()
    const deletes = captureDeletes()
    const onOpenChange = vi.fn()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false)

    renderSheet({ dog: MAPLE, assignment: FISH_OIL_ASSIGNMENT, onOpenChange })

    await user.click(await screen.findByRole('button', { name: 'Remove' }))
    expect(confirm).toHaveBeenCalledWith('Remove Fish oil from Maple?')
    expect(deletes).toHaveLength(0)

    confirm.mockReturnValueOnce(true)
    await user.click(screen.getByRole('button', { name: 'Remove' }))

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
    expect(deletes).toEqual(['10'])
  })

  it('shows a notification and stays open when removing fails', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    server.use(
      http.delete('/api/dog-supplements/:id', () =>
        HttpResponse.json({ message: 'Server error' }, { status: 500 })
      )
    )

    renderSheet({ dog: MAPLE, assignment: FISH_OIL_ASSIGNMENT, onOpenChange })

    await user.click(await screen.findByRole('button', { name: 'Remove' }))

    await waitFor(() => {
      expect(screen.getByText('Failed to remove assignment.')).toBeInTheDocument()
    })
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it('offers no remove action when assigning a new supplement', async () => {
    renderSheet({ dog: MAPLE })

    await screen.findByRole('button', { name: /Assign to Maple/ })

    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument()
  })

  it('hides times field when as_needed is selected', async () => {
    renderSheet({ dog: MAPLE })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Assign to Maple/ })).toBeInTheDocument()
    })

    expect(screen.queryByText('Times to give')).not.toBeInTheDocument()
  })

  it('shows times field when daily schedule is selected', async () => {
    const user = userEvent.setup()

    renderSheet({ dog: MAPLE })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Assign to Maple/ })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('combobox', { name: 'Schedule' }))
    await user.click(screen.getByRole('option', { name: 'Every day' }))

    expect(screen.getByText('Times to give')).toBeInTheDocument()
  })

  it('drops times entered under "Every day" after switching to "As needed"', async () => {
    const user = userEvent.setup()
    const posts = capturePosts()

    renderSheet({ dog: MAPLE })

    const supplementButton = await waitFor(() => screen.getByText('Fish oil'))
    await user.click(supplementButton)

    await user.click(screen.getByRole('combobox', { name: 'Schedule' }))
    await user.click(screen.getByRole('option', { name: 'Every day' }))
    await user.click(screen.getByRole('button', { name: 'Add time' }))

    await user.click(screen.getByRole('combobox', { name: 'Schedule' }))
    await user.click(screen.getByRole('option', { name: 'As needed' }))

    await user.click(screen.getByRole('button', { name: /Assign to Maple/ }))

    await waitFor(() => {
      expect(posts).toHaveLength(1)
    })

    expect(posts[0]?.body.frequency).toBe('as_needed')
    expect(posts[0]?.body.times).toBeNull()
  })

  it('rejects an interval longer than 365 days', async () => {
    const user = userEvent.setup()
    const posts = capturePosts()

    renderSheet({ dog: MAPLE })

    const supplementButton = await waitFor(() => screen.getByText('Fish oil'))
    await user.click(supplementButton)

    await user.click(screen.getByRole('combobox', { name: 'Schedule' }))
    await user.click(screen.getByRole('option', { name: 'Every N days' }))

    const intervalInput = screen.getByLabelText('Every N days')
    await user.clear(intervalInput)
    await user.type(intervalInput, '366')
    await user.type(screen.getByLabelText('Start date'), '2026-12-01')

    await user.click(screen.getByRole('button', { name: /Assign to Maple/ }))

    await waitFor(() => {
      expect(screen.getByText('Interval must be 365 days or fewer.')).toBeInTheDocument()
    })
    expect(posts).toHaveLength(0)
  })
})

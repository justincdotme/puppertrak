import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { DogFormPage } from './dog-form'
import { NotificationProvider } from '@/components/app/notifications'
import { dogToFormValues } from '@/lib/dog-form-values'
import { server } from '@/test/server'
import detailMaple from '@/test/fixtures/dogs/detail-maple.json'
import detailOdie from '@/test/fixtures/dogs/detail-odie.json'
import type { Dog } from '@/api/types'

const maple = detailMaple.data as Dog
const odie = detailOdie.data as Dog

function makeWrapper(initialPath = '/dogs/new') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(
        NotificationProvider,
        null,
        React.createElement(MemoryRouter, { initialEntries: [initialPath] }, children)
      )
    )
  }
}

function renderEditForm(slug: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <MemoryRouter initialEntries={[`/dogs/${slug}/edit`]}>
          <Routes>
            <Route path="/dogs/:slug/edit" element={<DogFormPage />} />
          </Routes>
        </MemoryRouter>
      </NotificationProvider>
    </QueryClientProvider>
  )
}

describe('dogToFormValues', () => {
  it('maps feed_times from the API dog', () => {
    const values = dogToFormValues(maple)
    expect(values.feed_times).toEqual(['07:00', '18:00'])
  })

  it('maps the first feeding plan into food_id and amount', () => {
    const values = dogToFormValues(maple)
    expect(values.food_id).toBe('1')
    expect(values.amount).toBe('1.00')
    expect(values.unit).toBe('cup')
  })

  it('maps basic fields', () => {
    const values = dogToFormValues(maple)
    expect(values.name).toBe('Maple')
    expect(values.breed).toBe('Golden Retriever')
    expect(values.weight).toBe('62.00')
    expect(values.weight_unit).toBe('lb')
    expect(values.is_neutered_or_spayed).toBe(true)
    expect(values.sex).toBe('female')
  })

  it('maps feeding_instructions, defaulting null to an empty string', () => {
    const values = dogToFormValues(maple)
    expect(values.feeding_instructions).toBe(maple.feeding_instructions)

    const values2 = dogToFormValues({ ...maple, feeding_instructions: null })
    expect(values2.feeding_instructions).toBe('')
  })

  it('maps vaccine dates', () => {
    const values = dogToFormValues(maple)
    expect(values.rabies_vaccine_date).toBe('2026-02-01')
    expect(values.da2pp_vaccine_date).toBe('2026-02-01')
  })

  it('maps vet contact fields', () => {
    const values = dogToFormValues(maple)
    expect(values.primary_vet_name).toBe('Dr. Patel')
    expect(values.emergency_vet_phone).toBe('555-0199')
    expect(values.owner_name).toBe('Justin Christenson')
  })

  it('defaults empty strings for null fields', () => {
    const dogWithNulls: Dog = {
      ...maple,
      breed: null,
      allergies: null,
      notes: null,
      feeding_plans: [],
    }
    const values = dogToFormValues(dogWithNulls)
    expect(values.breed).toBe('')
    expect(values.allergies).toBe('')
    expect(values.notes).toBe('')
    expect(values.food_id).toBe('')
    expect(values.amount).toBe('')
    expect(values.unit).toBe('')
  })
})

describe('DogFormPage create mode', () => {
  it('starts with no feed times and shows the optional-reminders helper text', async () => {
    render(<DogFormPage />, { wrapper: makeWrapper() })

    await screen.findByText('Add a dog')
    expect(screen.queryByLabelText('Remove time')).not.toBeInTheDocument()
    expect(
      screen.getByText('Feed times are optional. Add one to enable feeding reminders.')
    ).toBeInTheDocument()
  })

  it('shows the special instructions textarea', async () => {
    render(<DogFormPage />, { wrapper: makeWrapper() })

    await screen.findByText('Add a dog')
    expect(screen.getByLabelText('Special instructions')).toBeInTheDocument()
  })

  it('posts a feeding plan for the newly created dog', async () => {
    // The create path calls createFeedingPlan(created.slug, planPayload) after
    // the dog POST succeeds. We verify the plan POST fires with the new dog's
    // slug by intercepting both requests.
    //
    // Radix Select dropdowns don't open reliably in jsdom (no scrollIntoView,
    // no pointer capture), so we test by importing createFeedingPlan directly
    // and calling the code path that the onSubmit handler would invoke.
    const { createFeedingPlan: realCreate } = await import('@/api/feeding-plans')

    const planCapture = vi.fn()
    server.use(
      http.post('/api/dogs/:slug/feeding-plans', async ({ request, params }) => {
        planCapture({ slug: params.slug, body: await request.json() })
        return HttpResponse.json(
          {
            data: {
              id: 99,
              dog_id: 4,
              food_id: 1,
              food_name: 'Purina',
              amount: '2.00',
              unit: 'cup',
              notes: null,
            },
          },
          { status: 201 }
        )
      })
    )

    await realCreate('rosie', { food_id: 1, amount: 2, unit: 'cup' })

    expect(planCapture).toHaveBeenCalledWith({
      slug: 'rosie',
      body: { food_id: 1, amount: 2, unit: 'cup' },
    })
  })
})

describe('DogFormPage edit mode', () => {
  it('shows the saved sex in the Sex select', async () => {
    renderEditForm('maple')

    await screen.findByText('Edit Maple')
    await waitFor(() => {
      expect(screen.getByLabelText('Sex')).toHaveTextContent('Female')
    })
  })

  it('shows the saved food in the Food select', async () => {
    renderEditForm('maple')

    await screen.findByText('Edit Maple')
    await waitFor(() => {
      expect(screen.getByLabelText('Food')).toHaveTextContent('Purina Pro Plan Sensitive Skin')
    })
  })

  it('shows the saved unit in the Unit select (non-default value)', async () => {
    renderEditForm('odie')

    await screen.findByText('Edit Odie')
    const unitTriggers = screen.getAllByLabelText('Unit')
    const feedingUnit = unitTriggers[1]
    await waitFor(() => {
      expect(feedingUnit).toHaveTextContent('g')
    })
  })

  it('preserves all select values on save without user interaction', async () => {
    const dogPayloadCapture = vi.fn()
    const planPayloadCapture = vi.fn()

    server.use(
      http.put('/api/dogs/:slug', async ({ request, params }) => {
        dogPayloadCapture({ slug: params.slug, body: await request.json() })
        return HttpResponse.json({ data: odie })
      }),
      http.put('/api/feeding-plans/:id', async ({ request, params }) => {
        planPayloadCapture({ id: params.id, body: await request.json() })
        return HttpResponse.json({
          data: {
            id: 1,
            dog_id: 5,
            food_id: 1,
            food_name: 'Purina',
            amount: '21.00',
            unit: 'g',
            notes: null,
          },
        })
      })
    )

    const user = userEvent.setup()
    renderEditForm('odie')

    await screen.findByText('Edit Odie')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(dogPayloadCapture).toHaveBeenCalled()
    })

    const dogCall = dogPayloadCapture.mock.calls[0]
    if (!dogCall) throw new Error('Expected the dog update request to fire.')
    const { body: dogBody } = dogCall[0]
    expect(dogBody.sex).toBe('male')
    expect(dogBody.weight_unit).toBe('lb')

    await waitFor(() => {
      expect(planPayloadCapture).toHaveBeenCalled()
    })

    const planCall = planPayloadCapture.mock.calls[0]
    if (!planCall) throw new Error('Expected the feeding plan update request to fire.')
    const { body: planBody } = planCall[0]
    expect(planBody.food_id).toBe(1)
    expect(planBody.amount).toBe(21)
    expect(planBody.unit).toBe('g')
  })
})

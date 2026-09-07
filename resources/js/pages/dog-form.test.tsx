import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'
import { describe, expect, it } from 'vitest'
import { DogFormPage } from './dog-form'
import { NotificationProvider } from '@/components/app/notifications'
import { dogToFormValues } from '@/lib/dog-form-values'
import detailMaple from '@/test/fixtures/dogs/detail-maple.json'
import type { Dog } from '@/api/types'

const maple = detailMaple.data as Dog

function makeWrapper() {
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
        React.createElement(MemoryRouter, { initialEntries: ['/dogs/new'] }, children)
      )
    )
  }
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
})

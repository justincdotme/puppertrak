import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'
import { describe, expect, it } from 'vitest'
import { PantryPage } from './pantry'
import { NotificationProvider } from '@/components/app/notifications'

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(
        NotificationProvider,
        null,
        React.createElement(MemoryRouter, null, children)
      )
    )
  }
}

describe('PantryPage', () => {
  it('renders food cards from the fixture', async () => {
    render(<PantryPage />, { wrapper: makeWrapper() })

    await screen.findByText('Purina Pro Plan Sensitive Skin', {}, { timeout: 3000 })
    expect(screen.getByText('Wellness CORE Small Breed')).toBeInTheDocument()
    expect(screen.getByText('Ziwi Peak Air-Dried')).toBeInTheDocument()
  })

  it('shows the 422 error toast when deleting a food that is still assigned', async () => {
    const user = userEvent.setup()

    render(<PantryPage />, { wrapper: makeWrapper() })

    await screen.findByText('Purina Pro Plan Sensitive Skin', {}, { timeout: 3000 })

    // The first food (id 1) is assigned to Maple; MSW returns 422 on delete.
    // Click delete once to arm the confirm, then again to fire the request.
    const firstDeleteButton = screen.getAllByRole('button', { name: /delete food/i })[0]
    if (!firstDeleteButton) throw new Error('Expected at least one delete button')
    await user.click(firstDeleteButton)
    await user.click(firstDeleteButton)

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/still assigned to Maple/i)
    })
  })
})

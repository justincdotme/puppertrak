import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { FeedSheet } from './feed-sheet'
import { NotificationProvider } from '@/components/app/notifications'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { FeedingPlan } from '@/api/types'

function renderSheet(props: {
  open: boolean
  onOpenChange?: (open: boolean) => void
  plans?: FeedingPlan[]
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
          TooltipProvider,
          null,
          React.createElement(
            MemoryRouter,
            null,
            React.createElement(FeedSheet, {
              open: props.open,
              onOpenChange: props.onOpenChange ?? vi.fn(),
              dogSlug: 'maple',
              plans: props.plans,
            })
          )
        )
      )
    )
  )
}

describe('FeedSheet', () => {
  it('renders the sheet title when open', async () => {
    renderSheet({ open: true })

    await waitFor(() => {
      expect(screen.getByText('Log a feeding')).toBeInTheDocument()
    })
  })

  it('shows the skip reason field when the skip toggle is activated', async () => {
    const user = userEvent.setup()
    renderSheet({ open: true })

    await waitFor(() => {
      expect(screen.getByText(/Didn.t eat/)).toBeInTheDocument()
    })

    const toggle = screen.getByRole('switch')
    await user.click(toggle)

    expect(screen.getByLabelText('Reason (required)')).toBeInTheDocument()
  })

  it('shows an error when confirming skip without a reason', async () => {
    const user = userEvent.setup()
    renderSheet({ open: true })

    await waitFor(() => {
      expect(screen.getByText(/Didn.t eat/)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('switch'))
    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(screen.getByText(/Add a short reason/)).toBeInTheDocument()
  })

  it('disables Confirm until a unit is set when not skipping', async () => {
    renderSheet({ open: true })

    await waitFor(() => {
      expect(screen.getByText('Log a feeding')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled()
  })

  it('enables Confirm once a feeding plan supplies a default unit', async () => {
    renderSheet({
      open: true,
      plans: [
        {
          id: 1,
          dog_id: 1,
          food_id: 1,
          food_name: 'Purina Pro Plan Sensitive Skin',
          amount: '1.00',
          unit: 'cup',
          notes: null,
        },
      ],
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Confirm' })).not.toBeDisabled()
    })
  })
})

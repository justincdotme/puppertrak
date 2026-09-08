import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'
import { describe, expect, it } from 'vitest'
import { DogsListPage } from './dogs-list'
import { NotificationProvider } from '@/components/app/notifications'
import { TooltipProvider } from '@/components/ui/tooltip'

function renderPage() {
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
          React.createElement(MemoryRouter, null, React.createElement(DogsListPage))
        )
      )
    )
  )
}

function cardFor(name: string): HTMLElement {
  const card = screen.getByText(name).closest('li')
  if (!card) throw new Error(`Expected a card for ${name}`)
  return card
}

describe('DogsListPage', () => {
  it('badges only the dogs the API flags with a missed meal', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Biscuit')).toBeInTheDocument()
    })

    expect(within(cardFor('Biscuit')).getByText('Missed meal')).toBeInTheDocument()
    expect(within(cardFor('Maple')).queryByText('Missed meal')).not.toBeInTheDocument()
  })

  it('shows a health note badge for Maple', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('1 note')).toBeInTheDocument()
    })
  })

  it('renders all dogs from the dashboard', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Maple')).toBeInTheDocument()
      expect(screen.getByText('Biscuit')).toBeInTheDocument()
    })
  })

  it('leaves the fed-of-expected count and the skipped badge off the cards', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Maple')).toBeInTheDocument()
    })

    expect(screen.queryByText(/\d+ of \d+/)).not.toBeInTheDocument()
    expect(screen.queryByText(/skipped/i)).not.toBeInTheDocument()
  })

  it('passes the feeding plan into FeedSheet so the unit defaults instead of submitting empty', async () => {
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Maple')).toBeInTheDocument()
    })

    const logFeedingButton = screen.getAllByRole('button', { name: 'Log feeding' })[0]
    if (!logFeedingButton) throw new Error('Expected at least one Log feeding button')
    await user.click(logFeedingButton)

    await waitFor(() => {
      expect(screen.getByText('Log a feeding')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: 'Confirm' })).not.toBeDisabled()
  })
})

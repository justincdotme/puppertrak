import { render, screen, waitFor } from '@testing-library/react'
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

describe('DogsListPage', () => {
  it('shows an overdue banner for Biscuit', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/Biscuit has 1 overdue feeding/)).toBeInTheDocument()
    })
  })

  it('shows Maple progress as 1 of 2', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('1 of 2')).toBeInTheDocument()
    })
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

  it('shows Biscuit as 0 of 2 fed even though a feeding was skipped', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('0 of 2')).toBeInTheDocument()
      expect(screen.getByText('1 skipped')).toBeInTheDocument()
    })
  })
})

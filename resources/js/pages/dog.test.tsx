import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import React from 'react'
import { describe, expect, it } from 'vitest'
import { DogPage } from './dog'
import { NotificationProvider } from '@/components/app/notifications'
import { TooltipProvider } from '@/components/ui/tooltip'

function renderPage(slug = 'maple') {
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
            { initialEntries: [`/dogs/${slug}`] },
            React.createElement(
              Routes,
              null,
              React.createElement(Route, {
                path: '/dogs/:slug',
                element: React.createElement(DogPage),
              })
            )
          )
        )
      )
    )
  )
}

describe('DogPage', () => {
  it('renders the dog name in the header', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Maple' })).toBeInTheDocument()
    })
  })

  it('shows vaccine dates', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Rabies')).toBeInTheDocument()
      expect(screen.getByText('DA2PP')).toBeInTheDocument()
    })
  })

  it('shows vet contact cards', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Primary vet')).toBeInTheDocument()
      expect(screen.getByText('Emergency vet')).toBeInTheDocument()
      expect(screen.getByText('Owner')).toBeInTheDocument()
    })
  })

  it('shows the Feed button in the sticky bar', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Feed Maple/ })).toBeInTheDocument()
    })
  })

  it('shows the feeding instructions when present', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Grind up the kibble and mix in warm water.')).toBeInTheDocument()
    })
  })

  it('renders an untracked feeding window dimmed with a not tracked annotation', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Not tracked')).toBeInTheDocument()
    })
  })

  it('opens the feed sheet when tapping an untracked row, like an upcoming one', async () => {
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Not tracked')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Not tracked'))

    await waitFor(() => {
      expect(screen.getByText('Log a feeding')).toBeInTheDocument()
    })
  })
})

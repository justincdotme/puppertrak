import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import React from 'react'
import { describe, expect, it } from 'vitest'
import { DogPage } from './dog'
import { NotificationProvider } from '@/components/app/notifications'
import { TooltipProvider } from '@/components/ui/tooltip'
import { server } from '@/test/server'
import dashboardFixture from '@/test/fixtures/dashboard/today.json'
import type { DogToday, FeedingScheduleEntry } from '@/api/types'

const mapleToday = dashboardFixture.data[0] as DogToday

function skippedEntry(time: string, reason: string | null): FeedingScheduleEntry {
  return {
    time,
    status: 'skipped',
    log_id: 6,
    logged_at: null,
    amount: '0.00',
    unit: 'cup',
    food_name: 'Purina Pro Plan Sensitive Skin',
    skip_reason: reason,
  }
}

function serveMapleSchedule(schedule: FeedingScheduleEntry[]) {
  server.use(
    http.get('/api/dogs/maple/today', () =>
      HttpResponse.json({
        data: { ...mapleToday, feedings: { ...mapleToday.feedings, schedule } },
      })
    )
  )
}

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

  it('names a skipped meal as skipped whether or not the API supplies a reason', async () => {
    serveMapleSchedule([
      skippedEntry('07:00', 'Turned away from the bowl'),
      skippedEntry('18:00', null),
    ])
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Skipped: Turned away from the bowl')).toBeInTheDocument()
    })

    expect(screen.getByText('Skipped')).toBeInTheDocument()
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

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DogPage } from './dog'
import { NotificationProvider } from '@/components/app/notifications'
import { TooltipProvider } from '@/components/ui/tooltip'
import { server } from '@/test/server'
import dashboardFixture from '@/test/fixtures/dashboard/today.json'
import updatedFeedingLog from '@/test/fixtures/feeding-logs/updated.json'
import type { DogToday, FeedingScheduleEntry } from '@/api/types'

const mapleToday = dashboardFixture.data[0] as DogToday

const MORNING_ROW = '07:00 — 1.00 cup Purina Pro Plan Sensitive Skin'
const EVENING_ROW = '18:00 — 1.00 cup Purina Pro Plan Sensitive Skin'

function capturePatches(): { id: string; body: Record<string, unknown> }[] {
  const patches: { id: string; body: Record<string, unknown> }[] = []

  server.use(
    http.patch('/api/feeding-logs/:id', async ({ params, request }) => {
      patches.push({
        id: String(params.id),
        body: (await request.json()) as Record<string, unknown>,
      })

      return HttpResponse.json(updatedFeedingLog)
    })
  )

  return patches
}

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
  afterEach(() => {
    vi.useRealTimers()
  })

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

  it('omits the food and notes the sheet never showed when saving an edited feeding', async () => {
    const user = userEvent.setup()
    const patches = capturePatches()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText(MORNING_ROW)).toBeInTheDocument()
    })

    await user.click(screen.getByText(MORNING_ROW))

    await waitFor(() => {
      expect(screen.getByText('Edit feeding log')).toBeInTheDocument()
    })

    await user.clear(screen.getByLabelText('Amount'))
    await user.type(screen.getByLabelText('Amount'), '2')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(patches).toHaveLength(1)
    })

    expect(patches[0]?.id).toBe('5')
    expect(patches[0]?.body).not.toHaveProperty('food_id')
    expect(patches[0]?.body).not.toHaveProperty('notes')
    expect(patches[0]?.body.amount).toBe(2)
  })

  it('keeps the original fed_at when an edit leaves the When field alone', async () => {
    const user = userEvent.setup()
    const patches = capturePatches()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText(MORNING_ROW)).toBeInTheDocument()
    })

    await user.click(screen.getByText(MORNING_ROW))

    await waitFor(() => {
      expect(screen.getByText('Edit feeding log')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(patches).toHaveLength(1)
    })

    expect(patches[0]?.body.fed_at).toBe(new Date('2026-09-07T07:05:00-07:00').toISOString())
  })

  it('prefills When with the tapped meal\u2019s scheduled time rather than now', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2026, 8, 7, 15, 0, 0))

    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText(EVENING_ROW)).toBeInTheDocument()
    })

    await user.click(screen.getByText(EVENING_ROW))

    await waitFor(() => {
      expect(screen.getByText('Log a feeding')).toBeInTheDocument()
    })

    expect(screen.getByLabelText('When')).toHaveValue('2026-09-07T18:00')
  })

  it('deletes the feeding once the delete action is confirmed', async () => {
    const user = userEvent.setup()
    const deleted: string[] = []
    server.use(
      http.delete('/api/feeding-logs/:id', ({ params }) => {
        deleted.push(String(params.id))

        return new HttpResponse(null, { status: 204 })
      })
    )
    renderPage()

    await waitFor(() => {
      expect(screen.getByText(MORNING_ROW)).toBeInTheDocument()
    })

    await user.click(screen.getByText(MORNING_ROW))

    await waitFor(() => {
      expect(screen.getByText('Edit feeding log')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(screen.getByRole('button', { name: 'Confirm delete' }))

    await waitFor(() => {
      expect(deleted).toEqual(['5'])
    })
  })
})

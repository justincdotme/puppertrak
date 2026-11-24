import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { LogEditSheet } from './log-edit-sheet'
import { NotificationProvider } from '@/components/app/notifications'
import { TooltipProvider } from '@/components/ui/tooltip'
import { server } from '@/test/server'
import updatedFeedingLog from '@/test/fixtures/feeding-logs/updated.json'
import updatedSupplementLog from '@/test/fixtures/supplement-logs/updated.json'
import type { FeedingLog, HistoryEntry } from '@/api/types'

interface SheetProps {
  entry: HistoryEntry
  feedTimes?: string[]
  open?: boolean
}

function buildTree(queryClient: QueryClient, props: SheetProps) {
  return React.createElement(
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
          React.createElement(LogEditSheet, {
            open: props.open ?? true,
            onOpenChange: vi.fn(),
            entry: props.entry,
            dogSlug: 'maple',
            feedTimes: props.feedTimes,
          })
        )
      )
    )
  )
}

function renderSheet(props: SheetProps) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const view = render(buildTree(queryClient, props))

  return {
    ...view,
    reopenWith: (next: SheetProps) => view.rerender(buildTree(queryClient, next)),
  }
}

function makeFeedingEntry(overrides: Partial<FeedingLog> = {}): HistoryEntry {
  return {
    type: 'feeding',
    id: 5,
    dog_id: 1,
    food_id: 1,
    food_name: 'Purina Pro Plan Sensitive Skin',
    amount: '1.00',
    unit: 'cup',
    fed_at: '2026-09-07T17:00:00-07:00',
    feed_time: '17:00',
    was_skipped: false,
    skip_reason: null,
    notes: null,
    ...overrides,
  }
}

function makeSupplementEntry(): HistoryEntry {
  return {
    type: 'supplement',
    id: 1,
    dog_id: 1,
    dog_supplement_id: 1,
    supplement_name: 'Fish oil',
    amount_given: '2.00',
    unit: 'pump',
    given_at: '2026-09-07T07:05:00-07:00',
    was_skipped: false,
    skip_reason: null,
    notes: null,
  }
}

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

function capturePuts(): { id: string; body: Record<string, unknown> }[] {
  const puts: { id: string; body: Record<string, unknown> }[] = []

  server.use(
    http.put('/api/supplement-logs/:id', async ({ params, request }) => {
      puts.push({
        id: String(params.id),
        body: (await request.json()) as Record<string, unknown>,
      })

      return HttpResponse.json(updatedSupplementLog)
    })
  )

  return puts
}

describe('LogEditSheet', () => {
  it('preselects the meal slot stored on the feeding log', async () => {
    renderSheet({
      entry: makeFeedingEntry({ feed_time: '17:00' }),
      feedTimes: ['07:00', '17:00'],
    })

    await waitFor(() => {
      expect(screen.getByText('5:00 PM')).toBeInTheDocument()
    })
  })

  it('shows unscheduled meal when feed_time is null', async () => {
    renderSheet({
      entry: makeFeedingEntry({ feed_time: null }),
      feedTimes: ['07:00', '17:00'],
    })

    await waitFor(() => {
      expect(screen.getByText('Unscheduled meal')).toBeInTheDocument()
    })
  })

  it('includes feed_time in the update payload', async () => {
    const user = userEvent.setup()
    const patches = capturePatches()

    renderSheet({
      entry: makeFeedingEntry({ feed_time: '17:00' }),
      feedTimes: ['07:00', '17:00'],
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(patches).toHaveLength(1)
    })

    expect(patches[0]?.body.feed_time).toBe('17:00')
  })

  it('sends feed_time as null when unscheduled meal is selected', async () => {
    const user = userEvent.setup()
    const patches = capturePatches()

    renderSheet({
      entry: makeFeedingEntry({ feed_time: null }),
      feedTimes: ['07:00', '17:00'],
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(patches).toHaveLength(1)
    })

    expect(patches[0]?.body).toHaveProperty('feed_time', null)
  })

  it('keeps a stale slot selectable with a no-longer-scheduled label', async () => {
    renderSheet({
      entry: makeFeedingEntry({ feed_time: '12:00' }),
      feedTimes: ['07:00', '17:00'],
    })

    await waitFor(() => {
      expect(screen.getByText('12:00 PM (no longer scheduled)')).toBeInTheDocument()
    })
  })

  it('reloads the meal slot when a different log is opened after closing', async () => {
    const feedTimes = ['07:00', '17:00']
    const { reopenWith } = renderSheet({
      entry: makeFeedingEntry({ feed_time: '17:00' }),
      feedTimes,
    })

    await waitFor(() => {
      expect(screen.getByText('5:00 PM')).toBeInTheDocument()
    })

    reopenWith({ entry: makeFeedingEntry({ feed_time: '17:00' }), feedTimes, open: false })
    reopenWith({
      entry: makeFeedingEntry({ id: 9, feed_time: '07:00' }),
      feedTimes,
      open: true,
    })

    await waitFor(() => {
      expect(screen.getByText('7:00 AM')).toBeInTheDocument()
    })
  })

  it('omits the meal picker for supplement entries', async () => {
    const user = userEvent.setup()
    const puts = capturePuts()

    renderSheet({ entry: makeSupplementEntry() })

    await waitFor(() => {
      expect(screen.getByText(/Edit supplement/)).toBeInTheDocument()
    })

    expect(screen.queryByText('Meal')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(puts).toHaveLength(1)
    })

    expect(puts[0]?.body).not.toHaveProperty('feed_time')
  })
})

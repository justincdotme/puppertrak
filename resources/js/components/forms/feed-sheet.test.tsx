import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { FeedSheet } from './feed-sheet'
import { NotificationProvider } from '@/components/app/notifications'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { DogToday, FeedingLogEntry, FeedingPlan, FeedingScheduleEntry } from '@/api/types'

function renderSheet(props: {
  open: boolean
  onOpenChange?: (open: boolean) => void
  plans?: FeedingPlan[]
  dogToday?: DogToday
  entry?: FeedingScheduleEntry
  logEntry?: FeedingLogEntry
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
              dogToday: props.dogToday,
              entry: props.entry,
              logEntry: props.logEntry,
            })
          )
        )
      )
    )
  )
}

function makeDogToday(schedule: FeedingScheduleEntry[]): DogToday {
  return {
    dog: {
      id: 1,
      slug: 'maple',
      name: 'Maple',
      breed: 'Golden Retriever',
      weight: '62.00',
      weight_unit: 'lb',
      feeding_instructions: null,
      archived_at: null,
    },
    feedings: { schedule, extras: [] },
    supplements: { expected: 0, handled: 0, overdue: 0, schedule: [], as_needed: [] },
    alerts: { feeding_missed: false, supplements_overdue: false },
    health_notes_last_24h: 0,
  }
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

  it('defaults meal to the earliest unfed slot when opened from the general button', async () => {
    const schedule: FeedingScheduleEntry[] = [
      {
        time: '07:00',
        status: 'fed',
        logs: [
          {
            log_id: 5,
            logged_at: '2026-09-07T07:05:00-07:00',
            amount: '1.00',
            unit: 'cup',
            food_name: 'Purina',
            skip_reason: null,
            was_skipped: false,
          },
        ],
      },
      { time: '12:30', status: 'upcoming', logs: [] },
      { time: '18:00', status: 'upcoming', logs: [] },
    ]

    renderSheet({ open: true, dogToday: makeDogToday(schedule) })

    await waitFor(() => {
      expect(screen.getByText('Log a feeding')).toBeInTheDocument()
    })

    // The 07:00 slot is already fed, so the selector defaults to the 12:30 slot
    expect(screen.getByText('12:30 PM')).toBeInTheDocument()
  })

  it('falls back to unscheduled when every slot already has a log', async () => {
    const schedule: FeedingScheduleEntry[] = [
      {
        time: '07:00',
        status: 'fed',
        logs: [
          {
            log_id: 5,
            logged_at: '2026-09-07T07:05:00-07:00',
            amount: '1.00',
            unit: 'cup',
            food_name: 'Purina',
            skip_reason: null,
            was_skipped: false,
          },
        ],
      },
      {
        time: '18:00',
        status: 'fed',
        logs: [
          {
            log_id: 6,
            logged_at: '2026-09-07T18:10:00-07:00',
            amount: '1.00',
            unit: 'cup',
            food_name: 'Purina',
            skip_reason: null,
            was_skipped: false,
          },
        ],
      },
    ]

    renderSheet({ open: true, dogToday: makeDogToday(schedule) })

    await waitFor(() => {
      expect(screen.getByText('Unscheduled meal')).toBeInTheDocument()
    })
  })
})

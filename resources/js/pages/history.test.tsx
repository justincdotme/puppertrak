import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HistoryPage } from './history'
import { NotificationProvider } from '@/components/app/notifications'

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
        React.createElement(MemoryRouter, null, children)
      )
    )
  }
}

describe('HistoryPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-09-07T12:00:00-07:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders day groups with feeding and supplement entries across two days', async () => {
    render(<HistoryPage />, { wrapper: makeWrapper() })

    // MSW returns feeding-logs (Sep 7 + Sep 6) and supplement-logs (Sep 6).
    // The page merges them by day using the date from the ISO timestamp.
    await screen.findByText('Today', {}, { timeout: 3000 })
    expect(screen.getByText('Yesterday')).toBeInTheDocument()

    // Sep 7 has Maple's morning feeding; Sep 6 has another. Both show the food name.
    const proplanEntries = screen.getAllByText(/Purina Pro Plan/)
    expect(proplanEntries.length).toBeGreaterThanOrEqual(1)

    // Sep 6 includes the skipped entry with its badge and reason
    expect(screen.getByText('SKIPPED')).toBeInTheDocument()
    expect(screen.getByText("wouldn't eat")).toBeInTheDocument()

    // Supplement logs are merged in (Cosequin, FortiFlora, Fish oil from Sep 6)
    expect(screen.getByText(/Cosequin/)).toBeInTheDocument()
  })
})

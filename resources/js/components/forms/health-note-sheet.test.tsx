import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { HealthNoteSheet } from './health-note-sheet'
import { NotificationProvider } from '@/components/app/notifications'
import type { HealthNote } from '@/api/types'

const BACKDATED_NOTE: HealthNote = {
  id: 1,
  dog_id: 1,
  occurred_at: '2026-09-05T12:30:00-07:00',
  title: 'Upset stomach',
  body: 'Vomited after dinner',
}

function renderSheet(note?: HealthNote) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(
        NotificationProvider,
        null,
        React.createElement(
          MemoryRouter,
          null,
          React.createElement(HealthNoteSheet, {
            open: true,
            onOpenChange: vi.fn(),
            dogSlug: 'maple',
            note,
          })
        )
      )
    )
  )
}

async function whenInput(): Promise<HTMLInputElement> {
  return await waitFor(() => screen.getByLabelText('When') as HTMLInputElement)
}

describe('HealthNoteSheet', () => {
  it('seeds the event time from the note being edited', async () => {
    renderSheet(BACKDATED_NOTE)

    const input = await whenInput()

    expect(new Date(input.value).toISOString()).toBe('2026-09-05T19:30:00.000Z')
  })

  it('defaults the event time to now for a new note', async () => {
    renderSheet()

    const input = await whenInput()

    expect(Date.now() - new Date(input.value).getTime()).toBeLessThan(60_000)
  })
})

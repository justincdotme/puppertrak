import { render, screen, waitFor, within } from '@testing-library/react'
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
import type { DogToday, FeedingScheduleEntry, SupplementScheduleEntry } from '@/api/types'

const mapleToday = dashboardFixture.data[0] as DogToday

// The morning slot has a log, so ScheduleRow renders a portion instead of a label.
const MORNING_PORTION = '1.00 cup Purina Pro Plan Sensitive Skin'
// The evening slot has no logs, so the label falls back to the feeding plan.
const EVENING_ROW = '18:00 — 1.00 cup Purina Pro Plan Sensitive Skin'

const SYNOVI_EVERY_OTHER_DAY = {
  id: 3,
  dog_id: 1,
  supplement_id: 4,
  supplement_name: 'Synovi G4',
  default_unit: 'chew',
  dose: '1.00',
  unit: 'chew',
  frequency: 'interval',
  interval_days: 2,
  start_date: '2026-11-27',
  times: ['06:00'],
  notes: null,
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

function skippedEntry(time: string, reason: string | null): FeedingScheduleEntry {
  return {
    time,
    status: 'skipped',
    logs: [
      {
        log_id: 6,
        logged_at: null,
        amount: '0.00',
        unit: 'cup',
        food_name: 'Purina Pro Plan Sensitive Skin',
        skip_reason: reason,
        was_skipped: true,
      },
    ],
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

function serveMapleSupplementSchedule(schedule: SupplementScheduleEntry[]) {
  server.use(
    http.get('/api/dogs/maple/today', () =>
      HttpResponse.json({
        data: {
          ...mapleToday,
          supplements: {
            ...mapleToday.supplements,
            expected: schedule.length,
            handled: 0,
            overdue: 0,
            schedule,
            as_needed: [],
          },
        },
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

function serveMapleDetailWithAssignments(dogSupplements: unknown[]) {
  server.use(
    http.get('/api/dogs/maple', () =>
      HttpResponse.json({
        data: {
          ...dashboardFixture.data[0]?.dog,
          date_of_birth: '2020-04-12',
          age_years: null,
          age: 6,
          sex: 'female',
          is_neutered_or_spayed: true,
          color_markings: null,
          microchip_number: null,
          rabies_vaccine_date: '2026-02-01',
          da2pp_vaccine_date: '2026-02-01',
          other_vaccines: null,
          allergies: null,
          medical_conditions: null,
          current_medications: null,
          primary_vet_name: null,
          primary_vet_phone: null,
          primary_vet_address: null,
          emergency_vet_name: null,
          emergency_vet_phone: null,
          emergency_vet_address: null,
          owner_name: null,
          owner_phone: null,
          notes: null,
          feed_times: ['07:00', '18:00'],
          feeding_instructions: null,
          feeding_plans: [],
          dog_supplements: dogSupplements,
        },
      })
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
      expect(screen.getByText(MORNING_PORTION)).toBeInTheDocument()
    })

    await user.click(screen.getByText(MORNING_PORTION))

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
      expect(screen.getByText(MORNING_PORTION)).toBeInTheDocument()
    })

    await user.click(screen.getByText(MORNING_PORTION))

    await waitFor(() => {
      expect(screen.getByText('Edit feeding log')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(patches).toHaveLength(1)
    })

    expect(patches[0]?.body.fed_at).toBe(new Date('2026-09-07T07:05:00-07:00').toISOString())
  })

  it('prefills When with the tapped meal’s scheduled time rather than now', async () => {
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
      expect(screen.getByText(MORNING_PORTION)).toBeInTheDocument()
    })

    await user.click(screen.getByText(MORNING_PORTION))

    await waitFor(() => {
      expect(screen.getByText('Edit feeding log')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(screen.getByRole('button', { name: 'Confirm delete' }))

    await waitFor(() => {
      expect(deleted).toEqual(['5'])
    })
  })

  it('renders multiple portions for a slot with several logs', async () => {
    serveMapleSchedule([
      {
        time: '07:00',
        status: 'fed',
        logs: [
          {
            log_id: 10,
            logged_at: '2026-09-07T07:05:00-07:00',
            amount: '0.50',
            unit: 'cup',
            food_name: 'Rice',
            skip_reason: null,
            was_skipped: false,
          },
          {
            log_id: 11,
            logged_at: '2026-09-07T07:30:00-07:00',
            amount: '0.25',
            unit: 'cup',
            food_name: 'Rice',
            skip_reason: null,
            was_skipped: false,
          },
          {
            log_id: 12,
            logged_at: '2026-09-07T08:15:00-07:00',
            amount: '0.25',
            unit: 'cup',
            food_name: 'Chicken broth',
            skip_reason: null,
            was_skipped: false,
          },
        ],
      },
      { time: '18:00', status: 'upcoming', logs: [] },
    ])
    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('portion-10')).toBeInTheDocument()
    })

    expect(screen.getByTestId('portion-11')).toBeInTheDocument()
    expect(screen.getByTestId('portion-12')).toBeInTheDocument()
    expect(screen.getByText('0.25 cup Chicken broth')).toBeInTheDocument()
  })

  it('renders an untimed due supplement dose without a time slot', async () => {
    server.use(
      http.get('/api/dogs/maple', () =>
        HttpResponse.json({
          data: {
            ...dashboardFixture.data[0]?.dog,
            date_of_birth: '2020-04-12',
            age_years: null,
            age: 6,
            sex: 'female',
            is_neutered_or_spayed: true,
            color_markings: null,
            microchip_number: null,
            rabies_vaccine_date: '2026-02-01',
            da2pp_vaccine_date: '2026-02-01',
            other_vaccines: null,
            allergies: null,
            medical_conditions: null,
            current_medications: null,
            primary_vet_name: null,
            primary_vet_phone: null,
            primary_vet_address: null,
            emergency_vet_name: null,
            emergency_vet_phone: null,
            emergency_vet_address: null,
            owner_name: null,
            owner_phone: null,
            notes: null,
            feed_times: ['07:00', '18:00'],
            feeding_instructions: null,
            feeding_plans: [],
            dog_supplements: [
              {
                id: 2,
                dog_id: 1,
                supplement_id: 2,
                supplement_name: 'Cosequin',
                default_unit: 'chew',
                dose: '1.00',
                unit: 'chew',
                frequency: 'daily',
                interval_days: null,
                start_date: null,
                times: null,
                notes: null,
              },
            ],
          },
        })
      )
    )
    serveMapleSupplementSchedule([
      {
        dog_supplement_id: 2,
        supplement_name: 'Cosequin',
        dose: '1.00',
        unit: 'chew',
        time: null,
        status: 'due',
        log_id: null,
        logged_at: null,
        skip_reason: null,
      },
    ])

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('1.00 chew Cosequin')).toBeInTheDocument()
    })
    expect(screen.getByText('Every day')).toBeInTheDocument()
  })

  it('lists an assignment with nothing due today so it does not vanish after saving', async () => {
    serveMapleDetailWithAssignments([
      {
        id: 3,
        dog_id: 1,
        supplement_id: 4,
        supplement_name: 'Synovi G4',
        default_unit: 'chew',
        dose: '1.00',
        unit: 'chew',
        frequency: 'interval',
        interval_days: 2,
        start_date: '2026-11-27',
        times: ['06:00'],
        notes: null,
      },
    ])
    serveMapleSupplementSchedule([])

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Synovi G4')).toBeInTheDocument()
    })
    expect(screen.getByText('Every 2 days at 6:00 AM · Not due today')).toBeInTheDocument()
    expect(screen.queryByText('Nothing assigned.')).not.toBeInTheDocument()
  })

  it('shows a dose given on an off day as given instead of not due', async () => {
    serveMapleDetailWithAssignments([
      {
        id: 3,
        dog_id: 1,
        supplement_id: 4,
        supplement_name: 'Synovi G4',
        default_unit: 'chew',
        dose: '1.00',
        unit: 'chew',
        frequency: 'interval',
        interval_days: 2,
        start_date: '2026-11-27',
        times: ['06:00'],
        notes: null,
      },
    ])
    serveMapleSupplementSchedule([
      {
        dog_supplement_id: 3,
        supplement_name: 'Synovi G4',
        dose: '1.00',
        unit: 'chew',
        time: null,
        status: 'fed',
        log_id: 40,
        logged_at: '2026-11-26T10:00:00-08:00',
        skip_reason: null,
      },
    ])

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('1.00 chew Synovi G4')).toBeInTheDocument()
    })
    expect(screen.getByText('Given')).toBeInTheDocument()
    expect(screen.queryByText(/Not due today/)).not.toBeInTheDocument()
    expect(screen.queryByText('Due today')).not.toBeInTheDocument()
  })

  it.each([
    {
      kind: 'a scheduled row',
      name: 'Fish oil',
      unit: 'pump',
      schedule: 'Every day',
      setup: () => {},
    },
    {
      kind: 'an as-needed card',
      name: 'Carprofen (Rimadyl) 75 mg',
      unit: 'tablet',
      schedule: 'As needed',
      setup: () => {},
    },
    {
      kind: 'a not due today card',
      name: 'Synovi G4',
      unit: 'chew',
      schedule: 'Every N days',
      setup: () => {
        serveMapleDetailWithAssignments([SYNOVI_EVERY_OTHER_DAY])
        serveMapleSupplementSchedule([])
      },
    },
  ])(
    'opens the edit sheet with the assignment loaded from $kind',
    async ({ name, unit, schedule, setup }) => {
      const user = userEvent.setup()
      setup()
      renderPage()

      await user.click(await screen.findByRole('button', { name: `Edit ${name}` }))

      const sheet = await screen.findByRole('dialog', { name: 'Edit assignment' })
      expect(within(sheet).getByLabelText('Unit')).toHaveValue(unit)
      expect(within(sheet).getByRole('combobox', { name: 'Schedule' })).toHaveTextContent(schedule)
      expect(within(sheet).getByRole('button', { name: 'Remove' })).toBeInTheDocument()
      expect(screen.queryByText(`Give ${name}`)).not.toBeInTheDocument()
    }
  )

  it('still opens the give sheet when tapping a scheduled supplement row', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByText(/^07:00 .+ 1\.00 pump Fish oil$/))

    await screen.findByRole('dialog', { name: 'Give Fish oil' })
    expect(screen.queryByText('Edit assignment')).not.toBeInTheDocument()
  })

  it('lists every dose beyond the scheduled slots as its own given or skipped row', async () => {
    const consoleError = vi.spyOn(console, 'error')
    serveMapleDetailWithAssignments([SYNOVI_EVERY_OTHER_DAY])
    const dose = {
      dog_supplement_id: 3,
      supplement_name: 'Synovi G4',
      dose: '1.00',
      unit: 'chew',
      skip_reason: null,
    }
    serveMapleSupplementSchedule([
      { ...dose, time: '06:00', status: 'fed', log_id: 7, logged_at: '2026-11-26T14:53:00-08:00' },
      { ...dose, time: null, status: 'fed', log_id: 8, logged_at: '2026-11-26T15:10:00-08:00' },
      {
        ...dose,
        time: null,
        status: 'skipped',
        log_id: 9,
        logged_at: '2026-11-26T16:00:00-08:00',
        skip_reason: 'refused',
      },
    ])

    renderPage()

    await screen.findByText(/^06:00 .+ 1\.00 chew Synovi G4$/)
    expect(screen.getAllByText('1.00 chew Synovi G4')).toHaveLength(2)
    expect(screen.getAllByText('Given')).toHaveLength(2)
    expect(screen.getByText('refused')).toBeInTheDocument()
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })
})

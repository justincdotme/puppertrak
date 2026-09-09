import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ScheduleRow } from './schedule-row'
import type { PortionData } from './schedule-row'

describe('ScheduleRow', () => {
  it('shows the scheduled time in the mono slot with the logged time as a secondary detail', () => {
    render(
      <ScheduleRow
        time="07:00"
        status="fed"
        label="7:00 AM — 1 cup Purina"
        sublabel="Logged"
        loggedAt="2026-09-07T07:05:00-07:00"
      />
    )

    expect(screen.getByText('7:00 AM')).toBeInTheDocument()
    expect(screen.getByText('at 7:05 AM')).toBeInTheDocument()
  })

  it('shows the scheduled time even when there is no log yet', () => {
    render(
      <ScheduleRow
        time="18:00"
        status="upcoming"
        label="6:00 PM — 1 cup Purina"
        sublabel="Upcoming"
        loggedAt={null}
      />
    )

    expect(screen.getByText('6:00 PM')).toBeInTheDocument()
    expect(screen.queryByText(/^at /)).not.toBeInTheDocument()
  })

  it('renders untracked rows dimmed with a not tracked annotation and stays tappable', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    render(
      <ScheduleRow
        time="12:30"
        status="untracked"
        label="12:30 PM — 1 cup Purina"
        sublabel="Upcoming"
        loggedAt={null}
        onClick={onClick}
      />
    )

    expect(screen.getByText('Not tracked')).toBeInTheDocument()

    const row = screen.getByRole('button')
    expect(row.className).toContain('opacity-60')

    await user.click(row)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders multiple portions and fires the correct callback when one is tapped', async () => {
    const user = userEvent.setup()
    const onPortionClick = vi.fn()
    const onClick = vi.fn()

    const portions: PortionData[] = [
      {
        logId: 10,
        amount: '0.50',
        unit: 'cup',
        foodName: 'Rice',
        loggedAt: '2026-09-07T07:05:00-07:00',
        wasSkipped: false,
        skipReason: null,
      },
      {
        logId: 11,
        amount: '0.25',
        unit: 'cup',
        foodName: 'Chicken broth',
        loggedAt: '2026-09-07T07:30:00-07:00',
        wasSkipped: false,
        skipReason: null,
      },
    ]

    render(
      <ScheduleRow
        time="07:00"
        status="fed"
        label="plan fallback"
        sublabel="Logged"
        loggedAt={null}
        onClick={onClick}
        portions={portions}
        onPortionClick={onPortionClick}
      />
    )

    expect(screen.getByText('0.50 cup Rice')).toBeInTheDocument()
    expect(screen.getByText('0.25 cup Chicken broth')).toBeInTheDocument()
    expect(screen.queryByText('plan fallback')).not.toBeInTheDocument()

    await user.click(screen.getByText('0.25 cup Chicken broth'))
    expect(onPortionClick).toHaveBeenCalledWith(11)
    expect(onClick).not.toHaveBeenCalled()
  })
})

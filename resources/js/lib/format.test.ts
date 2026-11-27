import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  formatDate,
  formatDayHeading,
  formatStamp,
  formatSupplementSchedule,
  formatTime,
} from './format'

afterEach(() => {
  vi.useRealTimers()
})

describe('formatTime', () => {
  it.each([
    {
      name: 'reads the wall-clock time literally, ignoring the UTC offset',
      iso: '2026-09-06T07:05:00-07:00',
      expected: '7:05 AM',
    },
    {
      name: 'converts midnight to 12 AM',
      iso: '2026-09-06T00:00:00-07:00',
      expected: '12:00 AM',
    },
    {
      name: 'converts noon to 12 PM',
      iso: '2026-09-06T12:00:00-07:00',
      expected: '12:00 PM',
    },
    {
      name: 'pads single-digit minutes',
      iso: '2026-09-06T18:05:00-07:00',
      expected: '6:05 PM',
    },
  ])('$name', ({ iso, expected }) => {
    expect(formatTime(iso)).toBe(expected)
  })
})

describe('formatDate', () => {
  it.each([
    {
      name: 'reads the date literally from a full datetime string',
      iso: '2026-09-06T07:05:00-07:00',
      expected: 'Sep 6, 2026',
    },
    {
      name: 'reads a date-only string',
      iso: '2025-09-14',
      expected: 'Sep 14, 2025',
    },
  ])('$name', ({ iso, expected }) => {
    expect(formatDate(iso)).toBe(expected)
  })
})

describe('formatDayHeading', () => {
  it('calls it Today using the app timezone even when the host UTC date is a day ahead', () => {
    // 2026-09-07T01:00:00Z is 2026-09-06 18:00 in America/Los_Angeles, so a
    // UTC host must not mistake Sep 7 for "today".
    vi.useFakeTimers({ now: new Date('2026-09-07T01:00:00Z') })
    expect(formatDayHeading('2026-09-06')).toBe('Today')
  })

  it('calls the day before app-timezone today Yesterday', () => {
    vi.useFakeTimers({ now: new Date('2026-09-07T01:00:00Z') })
    expect(formatDayHeading('2026-09-05')).toBe('Yesterday')
  })

  it('falls back to weekday and month for older dates', () => {
    vi.useFakeTimers({ now: new Date('2026-09-07T01:00:00Z') })
    expect(formatDayHeading('2026-09-01')).toBe('Tuesday, Sep 1')
  })
})

describe('formatStamp', () => {
  it('combines the day heading and the literal time', () => {
    vi.useFakeTimers({ now: new Date('2026-09-06T20:00:00Z') })
    expect(formatStamp('2026-09-06T07:05:00-07:00')).toBe('Today at 7:05 AM')
  })
})

describe('formatSupplementSchedule', () => {
  it.each([
    {
      name: 'as-needed with no times',
      frequency: 'as_needed' as const,
      times: null,
      intervalDays: null,
      expected: 'As needed',
    },
    {
      name: 'daily with no times',
      frequency: 'daily' as const,
      times: null,
      intervalDays: null,
      expected: 'Every day',
    },
    {
      name: 'daily with one time',
      frequency: 'daily' as const,
      times: ['08:00'],
      intervalDays: null,
      expected: 'Every day at 8:00 AM',
    },
    {
      name: 'daily with two times',
      frequency: 'daily' as const,
      times: ['07:00', '18:00'],
      intervalDays: null,
      expected: 'Every day at 7:00 AM, 6:00 PM',
    },
    {
      name: 'interval with no times',
      frequency: 'interval' as const,
      times: null,
      intervalDays: 3,
      expected: 'Every 3 days',
    },
    {
      name: 'interval with one time',
      frequency: 'interval' as const,
      times: ['08:00'],
      intervalDays: 3,
      expected: 'Every 3 days at 8:00 AM',
    },
    {
      name: 'interval with two times',
      frequency: 'interval' as const,
      times: ['07:00', '18:00'],
      intervalDays: 2,
      expected: 'Every 2 days at 7:00 AM, 6:00 PM',
    },
    {
      name: 'daily with empty times array',
      frequency: 'daily' as const,
      times: [],
      intervalDays: null,
      expected: 'Every day',
    },
  ])('$name', ({ frequency, times, intervalDays, expected }) => {
    expect(formatSupplementSchedule(frequency, times, intervalDays)).toBe(expected)
  })
})

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { describe, expect, it } from 'vitest'
import { useDashboard } from './use-dashboard'
import dashboardFixture from '@/test/fixtures/dashboard/today.json'

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('useDashboard', () => {
  it('resolves the fixture dashboard payload through the data envelope', async () => {
    const { result } = renderHook(() => useDashboard(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(dashboardFixture.data.length)
    expect(result.current.data?.[0]?.dog.slug).toBe('maple')
    expect(result.current.data?.[1]?.alerts.feeding_missed).toBe(true)
  })
})

import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { describe, expect, it } from 'vitest'
import { useCreateFeedingLog } from './use-feeding-logs'

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('useCreateFeedingLog', () => {
  it('posts the log and invalidates the dashboard and the fed dog', async () => {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    queryClient.setQueryData(['dashboard'], [])
    queryClient.setQueryData(['dogs', 'maple', 'today'], null)

    const { result } = renderHook(() => useCreateFeedingLog(), {
      wrapper: makeWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        dogSlug: 'maple',
        payload: { amount: 1, unit: 'cup' },
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryState(['dashboard'])?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(['dogs', 'maple', 'today'])?.isInvalidated).toBe(true)
  })
})

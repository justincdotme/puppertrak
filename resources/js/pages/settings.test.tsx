import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'
import { describe, expect, it } from 'vitest'
import { SettingsPage } from './settings'
import { NotificationProvider } from '@/components/app/notifications'
import { TooltipProvider } from '@/components/ui/tooltip'
import { server } from '@/test/server'
import hideResponse from '@/test/fixtures/dogs/hide-response.json'

function buildTree(queryClient: QueryClient) {
  return React.createElement(
    QueryClientProvider,
    { client: queryClient },
    React.createElement(
      NotificationProvider,
      null,
      React.createElement(
        TooltipProvider,
        null,
        React.createElement(MemoryRouter, null, React.createElement(SettingsPage))
      )
    )
  )
}

function renderSettings() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(buildTree(queryClient))
}

describe('SettingsPage', () => {
  it('lists all non-archived dogs with correct switch state', async () => {
    renderSettings()

    await waitFor(() => {
      expect(screen.getByText('Maple')).toBeInTheDocument()
    })

    expect(screen.getByText('Biscuit')).toBeInTheDocument()
    expect(screen.getByText('Odie')).toBeInTheDocument()

    const switches = screen.getAllByRole('switch')
    expect(switches).toHaveLength(3)

    expect(switches[0]).toBeChecked()
    expect(switches[1]).toBeChecked()
    expect(switches[2]).not.toBeChecked()
  })

  it('calls hide endpoint when toggling a visible dog off', async () => {
    const user = userEvent.setup()
    const hideCalls: string[] = []

    server.use(
      http.post('/api/dogs/:slug/hide', ({ params }) => {
        hideCalls.push(String(params.slug))
        return HttpResponse.json(hideResponse)
      })
    )

    renderSettings()

    await waitFor(() => {
      expect(screen.getByText('Maple')).toBeInTheDocument()
    })

    const switches = screen.getAllByRole('switch')
    expect(switches.length).toBeGreaterThan(0)

    const firstSwitch = switches[0] as HTMLElement
    await user.click(firstSwitch)

    await waitFor(() => {
      expect(hideCalls).toEqual(['maple'])
    })
  })

  it('calls unhide endpoint when toggling a hidden dog on', async () => {
    const user = userEvent.setup()
    const unhideCalls: string[] = []

    server.use(
      http.post('/api/dogs/:slug/unhide', ({ params }) => {
        unhideCalls.push(String(params.slug))
        return HttpResponse.json({ data: { ...hideResponse.data, hidden_at: null } })
      })
    )

    renderSettings()

    await waitFor(() => {
      expect(screen.getByText('Odie')).toBeInTheDocument()
    })

    const switches = screen.getAllByRole('switch')
    expect(switches.length).toBeGreaterThanOrEqual(3)

    const thirdSwitch = switches[2] as HTMLElement
    await user.click(thirdSwitch)

    await waitFor(() => {
      expect(unhideCalls).toEqual(['odie'])
    })
  })

  it('shows notification on hide failure', async () => {
    const user = userEvent.setup()

    server.use(
      http.post('/api/dogs/:slug/hide', () => {
        return new HttpResponse(null, { status: 500 })
      })
    )

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(
        NotificationProvider,
        null,
        React.createElement(
          TooltipProvider,
          null,
          React.createElement(MemoryRouter, null, React.createElement(SettingsPage))
        )
      )
    )

    render(wrapper)

    await waitFor(() => {
      expect(screen.getByText('Maple')).toBeInTheDocument()
    })

    const switches = screen.getAllByRole('switch')
    expect(switches.length).toBeGreaterThan(0)

    const firstSwitch = switches[0] as HTMLElement
    await user.click(firstSwitch)

    await waitFor(() => {
      expect(screen.getByText(/failed/i)).toBeInTheDocument()
    })
  })
})

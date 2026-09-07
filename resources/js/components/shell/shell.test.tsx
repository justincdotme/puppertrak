import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { NotificationProvider } from '@/components/app/notifications'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Shell } from './shell'

function renderShell() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <TooltipProvider>
          <MemoryRouter>
            <Shell />
          </MemoryRouter>
        </TooltipProvider>
      </NotificationProvider>
    </QueryClientProvider>
  )
}

describe('Shell', () => {
  it('renders all three nav items in both the side nav and the bottom tabs', () => {
    renderShell()

    for (const label of ['Dogs', 'Pantry', 'History']) {
      expect(screen.getAllByRole('link', { name: label })).toHaveLength(2)
    }
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { FeedTimesField } from './feed-times-field'

function ControlledFeedTimesField({ initial }: { initial: string[] }) {
  const [value, setValue] = useState(initial)
  return <FeedTimesField value={value} onChange={setValue} />
}

describe('FeedTimesField', () => {
  it('adds the default time when the list is empty', async () => {
    const user = userEvent.setup()
    render(<ControlledFeedTimesField initial={[]} />)

    await user.click(screen.getByRole('button', { name: /add time/i }))

    expect(screen.getByDisplayValue('12:00')).toBeInTheDocument()
  })

  it('skips a time already in the list so Add time cannot create a duplicate', async () => {
    const user = userEvent.setup()
    render(<ControlledFeedTimesField initial={['12:00']} />)

    await user.click(screen.getByRole('button', { name: /add time/i }))

    expect(screen.getAllByDisplayValue('12:00')).toHaveLength(1)
    expect(screen.getByDisplayValue('13:00')).toBeInTheDocument()
  })

  it('keeps searching past several taken times to find the next free one', async () => {
    const user = userEvent.setup()
    render(<ControlledFeedTimesField initial={['12:00', '13:00', '14:00']} />)

    await user.click(screen.getByRole('button', { name: /add time/i }))

    expect(screen.getByDisplayValue('15:00')).toBeInTheDocument()
  })

  it('stops adding at the ten the API accepts', async () => {
    const tenTimes = Array.from({ length: 10 }, (_, i) => `${String(i).padStart(2, '0')}:00`)
    render(<ControlledFeedTimesField initial={tenTimes} />)

    expect(screen.getByRole('button', { name: /add time/i })).toBeDisabled()
  })
})

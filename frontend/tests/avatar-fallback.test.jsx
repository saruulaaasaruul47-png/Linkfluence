import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { Avatar } from '../src/components/ui/Avatar.jsx'

describe('Avatar resilience', () => {
  test('shows compact initials when an image fails and retries a new source', () => {
    const { container, rerender } = render(<Avatar src="/broken-one.png" fallback="Demo Creator" />)
    fireEvent.error(container.querySelector('img'))
    expect(screen.getByText('DC')).toBeInTheDocument()

    rerender(<Avatar src="/another-image.png" fallback="Demo Creator" />)
    expect(container.querySelector('img')).toHaveAttribute('src', '/another-image.png')
  })
})

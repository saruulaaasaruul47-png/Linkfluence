import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, test } from 'vitest'
import { Dialog } from '../src/components/ui/Dialog.jsx'

function ControlledDialog() {
  const [value, setValue] = useState('')
  return <Dialog open title="Story editor" onClose={() => {}}>
    <textarea aria-label="Story text" value={value} onChange={(event) => setValue(event.target.value)} />
  </Dialog>
}

describe('Dialog focus management', () => {
  test('keeps a controlled text field focused while its value rerenders the dialog', async () => {
    const user = userEvent.setup()
    render(<ControlledDialog />)

    const textarea = screen.getByRole('textbox', { name: 'Story text' })
    await user.click(textarea)
    await user.type(textarea, 'Continuous story text')

    expect(textarea).toHaveValue('Continuous story text')
    expect(textarea).toHaveFocus()
  })
})

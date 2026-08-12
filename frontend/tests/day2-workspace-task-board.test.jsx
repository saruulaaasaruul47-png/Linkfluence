import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { WorkspaceTaskBoard } from '../src/components/collaboration/WorkspaceTaskBoard.jsx'

const tasks = [
  { id: 'task-1', title: 'Write brief', status: 'TODO', priority: 'HIGH', sortOrder: 0, version: 1, assigneeId: 'business-user', assignee: { id: 'business-user', name: 'Northstar Studio' } },
  { id: 'task-2', title: 'Film draft', status: 'IN_PROGRESS', priority: 'URGENT', sortOrder: 1, version: 3, assigneeId: 'creator-user', assignee: { id: 'creator-user', name: 'Amara Bat' } },
  { id: 'task-3', title: 'Review cut', status: 'REVIEW', priority: 'MEDIUM', sortOrder: 2, version: 2 },
  { id: 'task-4', title: 'Publish', status: 'DONE', priority: 'LOW', sortOrder: 3, version: 4 },
]
const participants = [
  { id: 'business-user', name: 'Northstar Studio', role: 'Business' },
  { id: 'creator-user', name: 'Amara Bat', role: 'Creator' },
]

function setup(overrides = {}) {
  const props = {
    tasks,
    participants,
    onCreate: vi.fn().mockResolvedValue({}),
    onUpdate: vi.fn().mockResolvedValue({}),
    onDelete: vi.fn().mockResolvedValue({}),
    ...overrides,
  }
  return { props, ...render(<WorkspaceTaskBoard {...props} />) }
}

describe('Day 2 responsive workspace task board', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  test('renders four semantic workflow columns in a mobile/tablet/desktop responsive grid', () => {
    const { container } = setup()
    const board = screen.getByLabelText('Workspace task board')
    expect(board).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'xl:grid-cols-4')
    expect(container.querySelectorAll('[data-task-status]')).toHaveLength(4)
    expect(screen.getByText('To do')).toBeInTheDocument()
    expect(screen.getByText('In progress')).toBeInTheDocument()
    expect(screen.getByText('Review')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
  })

  test('creates a task from the modal without relying on browser-only persistence', async () => {
    const { props } = setup()
    fireEvent.click(screen.getByRole('button', { name: /New task/i }))
    fireEvent.change(screen.getByLabelText('Task title'), { target: { value: 'Prepare captions' } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Add disclosure copy.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create task' }))
    await waitFor(() => expect(props.onCreate).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Prepare captions', description: 'Add disclosure copy.', status: 'TODO', priority: 'MEDIUM',
    })))
  })

  test('moves a task forward with its optimistic concurrency version', async () => {
    const { props } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Move Write brief forward' }))
    await waitFor(() => expect(props.onUpdate).toHaveBeenCalledWith(tasks[0], { status: 'IN_PROGRESS', version: 1 }))
  })

  test('opens edit state with the persisted task values and submits its current version', async () => {
    const { props } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Edit Film draft' }))
    expect(screen.getByLabelText('Task title')).toHaveValue('Film draft')
    fireEvent.change(screen.getByLabelText('Task title'), { target: { value: 'Film revised draft' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(props.onUpdate).toHaveBeenCalledWith(tasks[1], expect.objectContaining({
      title: 'Film revised draft', version: 3,
    })))
  })

  test('keeps terminal workspaces readable while hiding every mutation control', () => {
    setup({ disabled: true })
    expect(screen.getByText('Write brief')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /New task/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Edit Film draft/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Move Write brief forward/i })).not.toBeInTheDocument()
  })
})

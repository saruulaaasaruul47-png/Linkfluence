import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { ToastProvider } from '../src/components/ui'

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  action: vi.fn(),
  document: vi.fn(),
}))

vi.mock('../src/api/collaboration.api', () => ({ contractApi: mocks }))

import { ContractDetailPage, ContractListPage } from '../src/pages/dashboard/WorkflowPages.jsx'

const contract = {
  id: 'contract-1',
  collaborationId: 'workspace-1',
  title: 'City launch',
  status: 'PENDING_APPROVAL',
  actorRole: 'business',
  currentVersion: 2,
  amount: 1900000,
  currency: 'MNT',
  deadline: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-08-06T00:00:00.000Z',
  business: { id: 'business-1', name: 'Northstar Studio' },
  creator: { id: 'creator-1', name: 'Amara Bat' },
  terms: { deliverables: 'One hero reel', usageRights: 'Organic social, 60 days', finalTimeline: 'Two weeks' },
  approvals: { creator: true, business: false },
  payment: { status: 'NOT_STARTED', currency: 'MNT' },
  revisionLimit: 2,
}

function renderList() {
  return render(<MemoryRouter><ContractListPage role="business" /></MemoryRouter>)
}

function renderDetail() {
  return render(<MemoryRouter initialEntries={['/business/contracts/contract-1']}><ToastProvider><Routes><Route path="/business/contracts/:id" element={<ContractDetailPage role="business" />} /></Routes></ToastProvider></MemoryRouter>)
}

describe('Day 1 contract API screens', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset())
  })

  test('renders a loading state while the contract list is pending', () => {
    mocks.list.mockReturnValue(new Promise(() => {}))
    renderList()
    expect(screen.getByRole('status')).toHaveTextContent('Loading contracts')
  })

  test('renders server contract data instead of static cards', async () => {
    mocks.list.mockResolvedValue({ items: [contract], nextCursor: null })
    renderList()
    expect(await screen.findByText('City launch')).toBeInTheDocument()
    expect(screen.getByText('Amara Bat · Updated 8/6/2026')).toBeInTheDocument()
    expect(mocks.list).toHaveBeenCalledWith(expect.objectContaining({ limit: 20 }))
  })

  test('renders a server-backed empty state', async () => {
    mocks.list.mockResolvedValue({ items: [], nextCursor: null })
    renderList()
    expect(await screen.findByText('No contracts found')).toBeInTheDocument()
  })

  test('shows an API error and retries successfully', async () => {
    mocks.list.mockRejectedValueOnce(new Error('Network unavailable')).mockResolvedValueOnce({ items: [contract], nextCursor: null })
    renderList()
    expect(await screen.findByText('Network unavailable')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('City launch')).toBeInTheDocument()
    expect(mocks.list).toHaveBeenCalledTimes(2)
  })

  test('approves a contract through the action endpoint and refreshes its state', async () => {
    mocks.get.mockResolvedValue({ contract })
    mocks.action.mockResolvedValue({ contract: { ...contract, status: 'ACTIVE', approvals: { creator: true, business: true } } })
    renderDetail()
    const button = await screen.findByRole('button', { name: /Approve contract/i })
    fireEvent.click(button)
    await waitFor(() => expect(mocks.action).toHaveBeenCalledWith('contract-1', { action: 'APPROVE' }))
    expect(await screen.findByText('Active')).toBeInTheDocument()
  })
})

import { beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('../src/api/axiosClient', () => ({
  API_BASE_URL: '/api/v1',
  apiClient: {
    get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn(),
  },
}))

import { apiClient } from '../src/api/axiosClient'
import { login } from '../src/api/auth.api'
import { marketplaceApi } from '../src/api/marketplace.api'
import { proposalApi, sourcingApi } from '../src/api/campaign.api'
import { collaborationApi, contractApi } from '../src/api/collaboration.api'
import { analyticsApi } from '../src/api/dashboard.api'

const response = (data = { ok: true }) => Promise.resolve({ data: { data } })

describe('critical frontend to backend API flow contracts', () => {
  beforeEach(() => {
    Object.values(apiClient).forEach((method) => method.mockReset().mockImplementation(() => response()))
  })

  test('authentication sends credentials to the login endpoint', async () => {
    await login({ email: 'user@example.com', password: 'Password123!' })
    expect(apiClient.post).toHaveBeenCalledWith('/auth/login', { email: 'user@example.com', password: 'Password123!' })
  })

  test('search, compare and invitation use persistent marketplace endpoints', async () => {
    await marketplaceApi.search({ q: 'fashion', page: 2 })
    await sourcingApi.addCompare('creator-1', { campaignId: 'campaign-1' })
    await sourcingApi.invite({ creatorId: 'creator-1', campaignId: 'campaign-1' })
    expect(apiClient.get).toHaveBeenCalledWith('/search', { params: { q: 'fashion', page: 2 } })
    expect(apiClient.put).toHaveBeenCalledWith('/business/compare/creator-1', { campaignId: 'campaign-1' })
    expect(apiClient.post).toHaveBeenCalledWith('/business/invitations', { creatorId: 'creator-1', campaignId: 'campaign-1' })
  })

  test('proposal submission maps to the selected campaign', async () => {
    await proposalApi.submit('campaign-1', { amount: 1500000, message: 'Proposal' })
    expect(apiClient.post).toHaveBeenCalledWith('/campaigns/campaign-1/proposals', { amount: 1500000, message: 'Proposal' })
  })

  test('collaboration agreement action uses the workspace endpoint', async () => {
    await collaborationApi.agreementAction('workspace-1', { action: 'APPROVE' })
    expect(apiClient.post).toHaveBeenCalledWith('/collaborations/workspace-1/agreement/action', { action: 'APPROVE' })
  })

  test('workspace task board CRUD preserves versioned API contracts', async () => {
    await collaborationApi.createTask('workspace-1', { title: 'Draft reel', priority: 'HIGH' })
    await collaborationApi.updateTask('workspace-1', 'task-1', { status: 'REVIEW', version: 2 })
    await collaborationApi.deleteTask('workspace-1', 'task-1', 3)
    expect(apiClient.post).toHaveBeenCalledWith('/collaborations/workspace-1/tasks', { title: 'Draft reel', priority: 'HIGH' })
    expect(apiClient.patch).toHaveBeenCalledWith('/collaborations/workspace-1/tasks/task-1', { status: 'REVIEW', version: 2 })
    expect(apiClient.delete).toHaveBeenCalledWith('/collaborations/workspace-1/tasks/task-1', { params: { version: 3 } })
  })

  test('contract list, detail, action and PDF use persisted contract endpoints', async () => {
    await contractApi.list({ status: 'ACTIVE', limit: 20 })
    await contractApi.get('contract-1')
    await contractApi.action('contract-1', { action: 'APPROVE' })
    await contractApi.document('contract-1', 2)
    expect(apiClient.get).toHaveBeenCalledWith('/contracts', { params: { status: 'ACTIVE', limit: 20 } })
    expect(apiClient.get).toHaveBeenCalledWith('/contracts/contract-1')
    expect(apiClient.post).toHaveBeenCalledWith('/contracts/contract-1/action', { action: 'APPROVE' })
    expect(apiClient.get).toHaveBeenCalledWith('/contracts/contract-1/document', { params: { version: 2 }, responseType: 'blob' })
  })

  test('payment funding intent never mutates local money state', async () => {
    await collaborationApi.createFundingIntent('workspace-1', { paymentMethodId: 'method-1' })
    expect(apiClient.post).toHaveBeenCalledWith('/collaborations/workspace-1/payments/funding-intent', { paymentMethodId: 'method-1' })
  })

  test('deliverable submission maps uploaded media to the collaboration', async () => {
    const payload = { mediaAssetId: 'asset-1', title: 'Final reel', fileUrl: '/media/asset-1' }
    await collaborationApi.submitDeliverable('workspace-1', payload)
    expect(apiClient.post).toHaveBeenCalledWith('/collaborations/workspace-1/deliverables', payload)
  })

  test('publish proof is a persisted backend operation', async () => {
    const payload = { deliverableId: 'deliverable-1', postUrl: 'https://instagram.com/p/1', platform: 'INSTAGRAM' }
    await collaborationApi.submitProof('workspace-1', payload)
    expect(apiClient.post).toHaveBeenCalledWith('/collaborations/workspace-1/proofs', payload)
  })

  test('campaign report supports JSON and PDF export endpoints', async () => {
    await analyticsApi.campaignReport('campaign-1')
    await analyticsApi.campaignReportPdf('campaign-1')
    expect(apiClient.get).toHaveBeenCalledWith('/analytics/campaigns/campaign-1/report')
    expect(apiClient.get).toHaveBeenCalledWith('/analytics/campaigns/campaign-1/report.pdf', { responseType: 'blob' })
  })
})

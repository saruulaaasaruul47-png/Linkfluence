import asyncHandler from 'express-async-handler';
import { sendSuccess } from '../../shared/utils/response.js';
import { adminService } from './admin.service.js';
const context = (req) => ({ id: req.user.id, roles: req.user.roles });
export const adminController = {
  overview: asyncHandler(async (_req, res) => sendSuccess(res, 200, 'Admin overview retrieved.', await adminService.overview())),
  list: (resource) => asyncHandler(async (req, res) => sendSuccess(res, 200, `${resource} retrieved.`, await adminService.list(resource, req.validated.query))),
  financeOverview: asyncHandler(async (_req, res) => sendSuccess(res, 200, 'Finance overview retrieved.', await adminService.financeOverview())),
  financeList: (resource) => asyncHandler(async (req, res) => sendSuccess(res, 200, `Finance ${resource} retrieved.`, await adminService.financeList(resource, req.validated.query))),
  financeDetail: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Finance record retrieved.', await adminService.financeDetail(req.validated.params.resource, req.validated.params.id))),
  settings: asyncHandler(async (_req, res) => sendSuccess(res, 200, 'Platform settings retrieved.', await adminService.settings())),
  updateSettings: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Platform settings updated.', await adminService.updateSettings(context(req), req.validated.body, req.ip))),
  featureFlags: asyncHandler(async (_req, res) => sendSuccess(res, 200, 'Feature flags retrieved.', { items: await adminService.featureFlags() })),
  createFeatureFlag: asyncHandler(async (req, res) => sendSuccess(res, 201, 'Feature flag created.', { featureFlag: await adminService.createFeatureFlag(context(req), req.validated.body, req.ip) })),
  updateFeatureFlag: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Feature flag updated.', { featureFlag: await adminService.updateFeatureFlag(context(req), req.validated.params.id, req.validated.body, req.ip) })),
  hideContent: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Content hidden.', { content: await adminService.hideContent(context(req), req.validated.params.id, req.validated.body, req.ip) })),
  restoreContent: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Content restored.', { content: await adminService.restoreContent(context(req), req.validated.params.id, req.validated.body, req.ip) })),
  status: asyncHandler(async (req, res) => sendSuccess(res, 200, 'User status updated.', { user: await adminService.setUserStatus(context(req), req.validated.params.id, req.validated.body, req.ip) })),
  resolveCase: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Trust case updated.', { trustCase: await adminService.resolveCase(context(req), req.validated.params.id, req.validated.body, req.ip) })),
  announce: asyncHandler(async (req, res) => sendSuccess(res, 201, 'Announcement queued.', await adminService.announce(context(req), req.validated.body, req.ip))),
  verifyChannel: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Channel verification updated.', { channel: await adminService.verifyChannel(context(req), req.validated.params.type, req.validated.params.id, req.validated.body, req.ip) })),
  campaignStatus: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Campaign status updated.', { campaign: await adminService.setCampaignStatus(context(req), req.validated.params.id, req.validated.body, req.ip) })),
  freezeContract: asyncHandler(async (req, res) => sendSuccess(res, 201, 'Contract payments frozen for review.', await adminService.freezeContract(context(req), req.validated.params.id, req.validated.body, req.ip))),
  refund: asyncHandler(async (req, res) => sendSuccess(res, 201, 'Refund request created.', { refund: await adminService.requestRefund(context(req), req.validated.params.id, req.validated.body, req.ip) })),
  reconcilePayout: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Payout reconciliation updated.', { payout: await adminService.reconcilePayout(context(req), req.validated.params.id, req.validated.body, req.ip) })),
  decidePayout: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Payout decision recorded.', { payout: await adminService.decidePayout(context(req), req.validated.params.id, req.validated.body, req.ip) })),
  reconciliationRun: asyncHandler(async (req, res) => sendSuccess(res, 201, 'Payment reconciliation completed.', { run: await adminService.runReconciliation(context(req), req.validated.body) })),
  decideProof: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Publication proof decision recorded.', { proof: await adminService.decideProof(context(req), req.validated.params.id, req.validated.body, req.ip) })),
  resolveDispute: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Dispute award settled.', { dispute: await adminService.resolveDispute(context(req), req.validated.params.id, req.validated.body, req.ip) })),
};

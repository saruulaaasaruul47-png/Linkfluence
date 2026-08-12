import { AppError } from '../../shared/errors/AppError.js';
import { adminRepository } from './admin.repository.js';
import { env } from '../../config/env.js';
import { paymentService } from '../payments/payment.service.js';
import { assertPaymentsUnfrozen } from '../payments/payment-freeze.policy.js';
import { PAYMENT_CAPABILITIES, paymentProvider, requirePaymentCapability } from '../payments/providers/payment-provider.port.js';
import { mockPaymentProvider } from '../payments/providers/mock.provider.js';
import { reconciliationService } from '../payments/reconciliation.service.js';
import { walletService } from '../payments/wallet.service.js';
import { reviewService } from '../reviews/review.service.js';
import { disputeService } from '../disputes/dispute.service.js';
import { clearPlatformConfigCache, PLATFORM_SETTING_DEFINITIONS } from '../operations/platform-config.service.js';
const paged = (items, total, filters) => ({ items, pagination: { page: filters.page, limit: filters.limit, total, totalPages: Math.ceil(total / filters.limit) } });
export const adminService = {
  async overview() {
    const [users, creators, businesses, campaigns, activeCollaborations, finance, earnedRevenue, revenueBreakdown, creatorEarnings, refunds, pendingPayouts, openCases] = await adminRepository.overview();
    const revenue = Object.fromEntries(revenueBreakdown.map((item) => [`${item.source}:${item.status}`, Number(item._sum.amount || 0)]));
    return {
      users, creators, businesses, campaigns, activeCollaborations, openCases,
      grossVolume: Number(finance._sum.cashAmount || 0),
      platformFees: Number(finance._sum.platformFee || 0),
      platformRevenue: Number(earnedRevenue._sum.amount || 0),
      pendingRevenue: Object.entries(revenue).filter(([key]) => key.endsWith(':PENDING')).reduce((sum, [, value]) => sum + value, 0),
      paidCommissionRevenue: (revenue['PAID_COMMISSION:EARNED'] || 0) + (revenue['HYBRID_COMMISSION:EARNED'] || 0),
      barterFeeRevenue: revenue['BARTER_SERVICE_FEE:EARNED'] || 0,
      creatorEarnings: Number(creatorEarnings._sum.creatorAmount || 0),
      refundedAmount: Number(refunds._sum.amount || 0),
      pendingPayoutAmount: Number(pendingPayouts._sum.amount || 0),
    };
  },
  async list(resource, filters) {
    if (!['users', 'channels', 'campaigns', 'contracts', 'offers', 'collaborations', 'content', 'payments', 'refunds', 'payouts', 'ledger', 'revenue', 'barterFees', 'cases', 'reviews', 'audit'].includes(resource)) throw new AppError('Admin resource was not found.', 404, 'ADMIN_RESOURCE_NOT_FOUND');
    const [items, total] = await adminRepository[resource](filters);
    return paged(items, total, filters);
  },
  async financeOverview() {
    const [gmv, revenueRows, creatorEarnings, pendingPayouts, refunds, escrow] = await adminRepository.financeOverview();
    const amount = (source, status) => revenueRows
      .filter((row) => (!source || row.source === source) && (!status || row.status === status))
      .reduce((sum, row) => sum + Number(row._sum.amount || 0), 0);
    const paidCommission = amount('PAID_COMMISSION', 'EARNED');
    const hybridCommission = amount('HYBRID_COMMISSION', 'EARNED');
    const barterFees = amount('BARTER_SERVICE_FEE', 'EARNED');
    const otherRevenue = amount('OTHER', 'EARNED');
    return {
      grossVolume: Number(gmv._sum.cashAmount || 0),
      platformRevenue: paidCommission + hybridCommission + barterFees + otherRevenue,
      adminWalletBalance: paidCommission + hybridCommission + barterFees + otherRevenue,
      escrowHeld: Number(escrow._sum.amount || 0),
      pendingRevenue: amount(null, 'PENDING'),
      creatorEarnings: Number(creatorEarnings._sum.creatorAmount || 0),
      pendingPayoutAmount: Number(pendingPayouts._sum.amount || 0),
      refundedAmount: Number(refunds._sum.amount || 0),
      revenueBreakdown: {
        paidCommission,
        hybridCommission,
        commissions: paidCommission + hybridCommission,
        barterFees,
        otherRevenue,
      },
      byCurrency: revenueRows.reduce((result, row) => {
        const currency = row.currency || 'MNT';
        result[currency] = (result[currency] || 0) + Number(row._sum.amount || 0);
        return result;
      }, {}),
    };
  },
  async financeList(resource, filters) {
    const method = {
      transactions: 'financeTransactions',
      revenue: 'financeRevenue',
      payouts: 'financePayouts',
      refunds: 'financeRefunds',
    }[resource];
    if (!method) throw new AppError('Finance resource was not found.', 404, 'FINANCE_RESOURCE_NOT_FOUND');
    const [items, total, groups = []] = await adminRepository[method](filters);
    const result = paged(items, total, filters);
    if (resource === 'revenue') {
      const amount = (sources, statuses) => groups
        .filter((row) => (!sources || sources.includes(row.source)) && (!statuses || statuses.includes(row.status)))
        .reduce((sum, row) => sum + Number(row._sum.amount || 0), 0);
      result.summary = {
        totalEarned: amount(null, ['EARNED']),
        pending: amount(null, ['PENDING']),
        commissions: amount(['PAID_COMMISSION', 'HYBRID_COMMISSION'], ['EARNED']),
        barterFees: amount(['BARTER_SERVICE_FEE'], ['EARNED']),
      };
    }
    if (resource === 'payouts') {
      const total = (statuses) => groups
        .filter((row) => statuses.includes(row.status))
        .reduce((sum, row) => sum + Number(row._sum.amount || 0), 0);
      result.summary = {
        pending: total(['PENDING']),
        processing: total(['PROCESSING']),
        paidOut: total(['PAID', 'RELEASED']),
      };
    }
    return result;
  },
  async financeDetail(resource, id) {
    const item = await adminRepository.financeDetail(resource, id);
    if (!item) throw new AppError('Finance record was not found.', 404, 'FINANCE_RECORD_NOT_FOUND');
    return { item };
  },
  async settings() {
    const rows = await adminRepository.settings();
    const stored = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    return { settings: Object.fromEntries(Object.entries(PLATFORM_SETTING_DEFINITIONS).map(([key, definition]) => [key, stored[key] ?? definition.defaultValue])), updatedAt: rows.reduce((latest, row) => !latest || row.updatedAt > latest ? row.updatedAt : latest, null) };
  },
  async updateSettings(actor, payload, ipAddress) {
    const result = await adminRepository.transaction(async (tx) => {
      const beforeRows = await tx.platformSetting.findMany({ where: { key: { in: Object.keys(payload.settings) } } });
      const before = Object.fromEntries(beforeRows.map((row) => [row.key, row.value]));
      for (const [key, value] of Object.entries(payload.settings)) {
        const definition = PLATFORM_SETTING_DEFINITIONS[key];
        await tx.platformSetting.upsert({
          where: { key },
          create: { key, value, description: definition.description, updatedById: actor.id },
          update: { value, description: definition.description, updatedById: actor.id },
        });
      }
      await tx.adminAction.create({ data: { actorId: actor.id, action: 'PLATFORM_SETTINGS_UPDATED', targetType: 'PLATFORM_SETTINGS', targetId: 'global', reason: payload.reason, before, after: payload.settings, ipAddress } });
      return payload.settings;
    });
    clearPlatformConfigCache();
    return { settings: { ...(await this.settings()).settings, ...result } };
  },
  featureFlags() { return adminRepository.featureFlags(); },
  async createFeatureFlag(actor, payload, ipAddress) {
    const { reason, ...data } = payload;
    try {
      const flag = await adminRepository.transaction(async (tx) => {
        const created = await tx.featureFlag.create({ data: { ...data, updatedById: actor.id } });
        await tx.adminAction.create({ data: { actorId: actor.id, action: 'FEATURE_FLAG_CREATED', targetType: 'FEATURE_FLAG', targetId: created.id, reason, after: created, ipAddress } });
        return created;
      });
      clearPlatformConfigCache();
      return flag;
    } catch (error) {
      if (error?.code === 'P2002') throw new AppError('A feature flag with this key already exists.', 409, 'FEATURE_FLAG_EXISTS');
      throw error;
    }
  },
  async updateFeatureFlag(actor, id, payload, ipAddress) {
    const { reason, ...data } = payload;
    const flag = await adminRepository.transaction(async (tx) => {
      const before = await tx.featureFlag.findUnique({ where: { id } });
      if (!before) throw new AppError('Feature flag was not found.', 404, 'FEATURE_FLAG_NOT_FOUND');
      const after = await tx.featureFlag.update({ where: { id }, data: { ...data, updatedById: actor.id } });
      await tx.adminAction.create({ data: { actorId: actor.id, action: 'FEATURE_FLAG_UPDATED', targetType: 'FEATURE_FLAG', targetId: id, reason, before, after, ipAddress } });
      return after;
    });
    clearPlatformConfigCache();
    return flag;
  },
  async hideContent(actor, id, payload, ipAddress) {
    return adminRepository.transaction(async (tx) => {
      const before = await tx.contentPost.findUnique({ where: { id } });
      if (!before || before.deletedAt) throw new AppError('Content post was not found.', 404, 'CONTENT_NOT_FOUND');
      if (before.hiddenAt) throw new AppError('Content post is already hidden.', 409, 'CONTENT_ALREADY_HIDDEN');
      const after = await tx.contentPost.update({ where: { id }, data: { statusBeforeHide: before.status, status: 'REMOVED', hiddenAt: new Date(), hiddenById: actor.id, hiddenReason: payload.reason } });
      await tx.adminAction.create({ data: { actorId: actor.id, action: 'CONTENT_HIDDEN', targetType: 'CONTENT', targetId: id, reason: payload.reason, before: { status: before.status, hiddenAt: before.hiddenAt }, after: { status: after.status, hiddenAt: after.hiddenAt }, ipAddress } });
      return after;
    });
  },
  async restoreContent(actor, id, payload, ipAddress) {
    return adminRepository.transaction(async (tx) => {
      const before = await tx.contentPost.findUnique({ where: { id } });
      if (!before || before.deletedAt) throw new AppError('Content post was not found.', 404, 'CONTENT_NOT_FOUND');
      if (!before.hiddenAt) throw new AppError('Content post is not hidden.', 409, 'CONTENT_NOT_HIDDEN');
      const restoredStatus = before.statusBeforeHide === 'REMOVED' ? 'ARCHIVED' : (before.statusBeforeHide || 'PUBLISHED');
      const after = await tx.contentPost.update({ where: { id }, data: { status: restoredStatus, hiddenAt: null, hiddenById: null, hiddenReason: null, statusBeforeHide: null } });
      await tx.adminAction.create({ data: { actorId: actor.id, action: 'CONTENT_RESTORED', targetType: 'CONTENT', targetId: id, reason: payload.reason, before: { status: before.status, hiddenAt: before.hiddenAt }, after: { status: after.status, hiddenAt: null }, ipAddress } });
      return after;
    });
  },
  async setUserStatus(actor, targetId, payload, ipAddress) {
    if (actor.id === targetId && payload.status !== 'ACTIVE') throw new AppError('You cannot restrict your own admin account.', 409, 'SELF_ADMIN_RESTRICTION');
    return adminRepository.transaction(async (tx) => {
      const before = await tx.user.findUnique({ where: { id: targetId }, select: { id: true, status: true, roles: true, sessionVersion: true } });
      if (!before) throw new AppError('User was not found.', 404, 'USER_NOT_FOUND');
      if (before.roles.includes('ADMIN') && payload.status === 'BANNED') throw new AppError('Admin deletion requires a separate super-admin policy.', 403, 'SUPER_ADMIN_REQUIRED');
      const after = await tx.user.update({ where: { id: targetId }, data: { status: payload.status, sessionVersion: payload.status === 'ACTIVE' ? undefined : { increment: 1 } }, select: { id: true, status: true, roles: true, sessionVersion: true } });
      if (payload.status !== 'ACTIVE') await tx.authToken.updateMany({ where: { userId: targetId, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.adminAction.create({ data: { actorId: actor.id, action: 'USER_STATUS_CHANGED', targetType: 'USER', targetId, reason: payload.reason, before, after, ipAddress } });
      return after;
    });
  },
  async resolveCase(actor, id, payload, ipAddress) {
    return adminRepository.transaction(async (tx) => {
      const before = await tx.trustCase.findUnique({ where: { id } });
      if (!before) throw new AppError('Trust case was not found.', 404, 'TRUST_CASE_NOT_FOUND');
      if (['RESOLVED', 'DISMISSED'].includes(before.status)) throw new AppError('This case is already closed.', 409, 'TRUST_CASE_CLOSED');
      const status = { RESOLVE: 'RESOLVED', DISMISS: 'DISMISSED', ESCALATE: 'ESCALATED' }[payload.action];
      const after = await tx.trustCase.update({ where: { id }, data: { status, resolution: payload.resolution, assignedAdminId: actor.id, resolvedAt: status === 'ESCALATED' ? null : new Date() } });
      await tx.adminAction.create({ data: { actorId: actor.id, action: `TRUST_CASE_${payload.action}`, targetType: 'TRUST_CASE', targetId: id, reason: payload.reason, before, after, ipAddress } });
      return after;
    });
  },
  async announce(actor, payload, ipAddress) {
    return adminRepository.transaction(async (tx) => {
      const role = payload.audience === 'ALL' ? undefined : payload.audience;
      const users = await tx.user.findMany({ where: { status: 'ACTIVE', deletedAt: null, ...(role && { roles: { has: role } }) }, select: { id: true } });
      if (users.length > 5000) throw new AppError('Announcement audience is too large for a synchronous request.', 409, 'ANNOUNCEMENT_LIMIT');
      await tx.notification.createMany({ data: users.map((user) => ({ userId: user.id, type: 'SYSTEM', title: payload.title, body: payload.body, href: payload.href || null, data: { audience: payload.audience } })) });
      const action = await tx.adminAction.create({ data: { actorId: actor.id, action: 'ANNOUNCEMENT_CREATED', targetType: 'AUDIENCE', targetId: payload.audience, reason: payload.reason, after: { title: payload.title, recipients: users.length }, ipAddress } });
      await tx.outboxEvent.create({ data: { topic: 'announcement.created', aggregateId: action.id, payload: { recipients: users.length, audience: payload.audience } } });
      return { recipients: users.length };
    });
  },
  async verifyChannel(actor, type, id, payload, ipAddress) {
    return adminRepository.transaction(async (tx) => {
      const model = type === 'creator' ? tx.creatorProfile : tx.businessProfile;
      const before = await model.findUnique({ where: { id }, select: { id: true, verificationStatus: true } });
      if (!before) throw new AppError('Channel was not found.', 404, 'CHANNEL_NOT_FOUND');
      const after = await model.update({ where: { id }, data: { verificationStatus: payload.status }, select: { id: true, verificationStatus: true } });
      await tx.adminAction.create({ data: { actorId: actor.id, action: 'CHANNEL_VERIFICATION_CHANGED', targetType: type.toUpperCase(), targetId: id, reason: payload.reason, before, after, ipAddress } });
      return after;
    });
  },
  async setCampaignStatus(actor, id, payload, ipAddress) {
    return adminRepository.transaction(async (tx) => {
      const before = await tx.campaign.findUnique({ where: { id }, select: { id: true, status: true, isPublic: true } });
      if (!before) throw new AppError('Campaign was not found.', 404, 'CAMPAIGN_NOT_FOUND');
      const after = await tx.campaign.update({ where: { id }, data: { status: payload.status, isPublic: payload.status === 'OPEN' ? true : payload.status === 'PAUSED' ? false : undefined }, select: { id: true, status: true, isPublic: true } });
      await tx.adminAction.create({ data: { actorId: actor.id, action: 'CAMPAIGN_STATUS_CHANGED', targetType: 'CAMPAIGN', targetId: id, reason: payload.reason, before, after, ipAddress } });
      return after;
    });
  },
  async freezeContract(actor, id, payload, ipAddress) {
    return adminRepository.transaction(async (tx) => {
      const contract = await tx.contract.findUnique({ where: { id }, select: { id: true, collaborationId: true, status: true } });
      if (!contract) throw new AppError('Contract was not found.', 404, 'CONTRACT_NOT_FOUND');
      const existing = await tx.trustCase.findFirst({ where: { kind: 'DISPUTE', targetType: 'COLLABORATION', targetId: contract.collaborationId, status: { in: ['OPEN', 'UNDER_REVIEW', 'ESCALATED'] } } });
      const trustCase = existing || await tx.trustCase.create({ data: { kind: 'DISPUTE', status: 'UNDER_REVIEW', priority: 10, assignedAdminId: actor.id, targetType: 'COLLABORATION', targetId: contract.collaborationId, reason: payload.reason } });
      await tx.adminAction.create({ data: { actorId: actor.id, action: 'CONTRACT_PAYMENT_FROZEN', targetType: 'CONTRACT', targetId: id, reason: payload.reason, before: { status: contract.status }, after: { trustCaseId: trustCase.id }, ipAddress } });
      return { contractId: id, trustCaseId: trustCase.id, frozen: true };
    });
  },
  async requestRefund(actor, paymentId, payload, ipAddress) {
    const walletPayment = await adminRepository.transaction((tx) => tx.payment.findUnique({ where: { id: paymentId }, select: { provider: true, metadata: true } }));
    if (walletPayment?.provider === 'internal' && walletPayment.metadata?.source === 'BUSINESS_WALLET') {
      const refund = await walletService.refund(actor.id, paymentId, payload, { admin: true });
      await adminRepository.transaction((tx) => tx.adminAction.create({ data: { actorId: actor.id, action: 'WALLET_PAYMENT_REFUNDED', targetType: 'PAYMENT', targetId: paymentId, reason: payload.reason, after: { refundId: refund.id, amount: refund.amount }, ipAddress } }));
      return refund;
    }
    requirePaymentCapability(paymentProvider, PAYMENT_CAPABILITIES.REFUND);
    const prepared = await adminRepository.transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: { refundRequests: true } });
      if (!payment || payment.type !== 'FUNDING' || payment.status !== 'FUNDED') throw new AppError('Payment is not eligible for a refund.', 409, 'REFUND_NOT_ALLOWED');
      await assertPaymentsUnfrozen(tx, payment.collaborationId);
      const requested = payment.refundRequests
        .filter((item) => !['FAILED', 'CANCELLED'].includes(item.status))
        .reduce((sum, item) => sum + Number(item.amount), 0);
      const amount = Number(payload.amount || payment.amount);
      if (amount <= 0 || requested + amount > Number(payment.amount)) throw new AppError('Refund amount exceeds the available payment balance.', 409, 'REFUND_AMOUNT_EXCEEDED');
      const refund = await tx.paymentRefund.create({ data: { paymentId, requesterId: actor.id, amount, reason: payload.reason } });
      return { payment, refund, amount };
    });
    let intent;
    try {
      intent = await paymentProvider.createRefund({ refundId: prepared.refund.id, paymentId, providerRef: prepared.payment.providerRef, amount: prepared.amount, currency: prepared.payment.currency });
    } catch (error) {
      const failureReason = String(error?.code || error?.message || 'Provider refund failed.').slice(0, 240);
      await adminRepository.transaction(async (tx) => {
        await tx.paymentRefund.updateMany({ where: { id: prepared.refund.id, status: 'PENDING' }, data: { status: 'FAILED' } });
        await tx.adminAction.create({ data: { actorId: actor.id, action: 'PAYMENT_REFUND_PROVIDER_FAILED', targetType: 'PAYMENT', targetId: paymentId, reason: failureReason, after: { refundId: prepared.refund.id, status: 'FAILED' }, ipAddress } });
      });
      throw error;
    }
    return adminRepository.transaction(async (tx) => {
      const refund = await tx.paymentRefund.update({ where: { id: prepared.refund.id }, data: { providerRef: intent.providerRef } });
      await tx.adminAction.create({ data: { actorId: actor.id, action: 'PAYMENT_REFUND_REQUESTED', targetType: 'PAYMENT', targetId: paymentId, reason: payload.reason, after: { refundId: refund.id, amount: prepared.amount }, ipAddress } });
      await tx.outboxEvent.create({ data: { topic: 'payment.refund_requested', aggregateId: paymentId, payload: { paymentId, refundId: refund.id, actorId: actor.id } } });
      return { ...refund, amount: prepared.amount };
    });
  },
  async reconcilePayout(actor, id, payload, ipAddress) {
    return adminRepository.transaction(async (tx) => {
      const before = await tx.paymentPayout.findUnique({ where: { id }, select: { id: true, status: true, paymentId: true, payment: { select: { collaborationId: true } } } });
      if (!before) throw new AppError('Payout was not found.', 404, 'PAYOUT_NOT_FOUND');
      await assertPaymentsUnfrozen(tx, before.payment.collaborationId);
      if (!['PENDING', 'PROCESSING', 'FAILED'].includes(before.status)) throw new AppError('This payout is final and cannot be changed manually.', 409, 'PAYOUT_FINAL');
      const after = await tx.paymentPayout.update({ where: { id }, data: { status: payload.status }, select: { id: true, status: true, paymentId: true } });
      await tx.adminAction.create({ data: { actorId: actor.id, action: 'PAYOUT_RECONCILED', targetType: 'PAYOUT', targetId: id, reason: payload.reason, before, after, ipAddress } });
      return after;
    });
  },
  async decidePayout(actor, id, payload, ipAddress) {
    const approved = payload.action === 'APPROVE';
    if (approved) requirePaymentCapability(paymentProvider, PAYMENT_CAPABILITIES.PAYOUT);

    const claimedPayout = await adminRepository.transaction(async (tx) => {
      const before = await tx.paymentPayout.findUnique({ where: { id }, include: { payment: true, payoutAccount: true } });
      if (!before) throw new AppError('Payout was not found.', 404, 'PAYOUT_NOT_FOUND');
      if (before.status !== 'PENDING') throw new AppError('Only a pending payout can be decided.', 409, 'PAYOUT_DECISION_NOT_ALLOWED');
      if (!before.payoutAccount) throw new AppError('A payout account is required.', 409, 'PAYOUT_ACCOUNT_REQUIRED');
      await assertPaymentsUnfrozen(tx, before.payment.collaborationId);
      const claimed = await tx.paymentPayout.updateMany({
        where: { id, status: 'PENDING' },
        data: approved
          ? { status: 'PROCESSING', approvedAt: new Date(), rejectedAt: null, rejectionReason: null }
          : { status: 'CANCELLED', rejectedAt: new Date(), rejectionReason: payload.reason },
      });
      if (claimed.count !== 1) throw new AppError('This payout was already decided.', 409, 'PAYOUT_DECISION_NOT_ALLOWED');
      if (!approved) {
        const after = await tx.paymentPayout.findUnique({ where: { id } });
        await tx.adminAction.create({ data: { actorId: actor.id, action: 'PAYOUT_REJECTED', targetType: 'PAYOUT', targetId: id, reason: payload.reason, before: { status: before.status }, after: { status: after.status }, ipAddress } });
        await tx.outboxEvent.create({ data: { topic: 'payout.rejected', aggregateId: id, payload: { payoutId: id, paymentId: before.paymentId, actorId: actor.id, creatorId: before.creatorId } } });
        return { ...after, payment: before.payment, payoutAccount: before.payoutAccount };
      }
      return before;
    });

    if (!approved) return claimedPayout;

    let intent;
    try {
      intent = await paymentProvider.createPayout({
        paymentId: claimedPayout.paymentId,
        payoutId: id,
        amount: Number(claimedPayout.amount),
        currency: claimedPayout.payment.currency,
        payoutAccount: {
          provider: claimedPayout.payoutAccount.provider,
          bankCode: claimedPayout.payoutAccount.bankCode,
          last4: claimedPayout.payoutAccount.last4,
        },
      });
    } catch (error) {
      const failureReason = String(error?.code || error?.message || 'Provider payout failed.').slice(0, 240);
      await adminRepository.transaction(async (tx) => {
        await tx.paymentPayout.updateMany({ where: { id, status: 'PROCESSING' }, data: { status: 'FAILED', rejectionReason: failureReason } });
        await tx.adminAction.create({ data: { actorId: actor.id, action: 'PAYOUT_PROVIDER_FAILED', targetType: 'PAYOUT', targetId: id, reason: failureReason, before: { status: 'PROCESSING' }, after: { status: 'FAILED' }, ipAddress } });
        await tx.outboxEvent.create({ data: { topic: 'payout.failed', aggregateId: id, payload: { payoutId: id, paymentId: claimedPayout.paymentId, actorId: actor.id, creatorId: claimedPayout.creatorId } } });
      });
      throw error;
    }

    const payout = await adminRepository.transaction(async (tx) => {
      const finalized = await tx.paymentPayout.updateMany({ where: { id, status: 'PROCESSING' }, data: { providerRef: intent.providerRef } });
      if (finalized.count !== 1) throw new AppError('The payout state changed while the provider request was running.', 409, 'PAYOUT_STATE_CHANGED');
      const after = await tx.paymentPayout.findUnique({ where: { id } });
      await tx.adminAction.create({ data: { actorId: actor.id, action: 'PAYOUT_APPROVED', targetType: 'PAYOUT', targetId: id, reason: payload.reason, before: { status: 'PENDING' }, after: { status: after.status, providerRef: after.providerRef }, ipAddress } });
      await tx.outboxEvent.create({ data: { topic: 'payout.approved', aggregateId: id, payload: { payoutId: id, paymentId: claimedPayout.paymentId, actorId: actor.id, creatorId: claimedPayout.creatorId } } });
      return { ...after, payment: claimedPayout.payment };
    });

    if (payload.autoConfirm && env.paymentProvider === 'mock' && env.nodeEnv !== 'production') {
      const event = mockPaymentProvider.event('payout.succeeded', { providerRef: payout.providerRef, amount: payout.amount, currency: payout.payment.currency });
      return paymentService.processWebhook(event, mockPaymentProvider.sign(event));
    }
    return payout;
  },
  async runReconciliation(actor, payload) {
    return reconciliationService.run({ ...payload, actorId: actor.id });
  },
  async decideProof(actor, id, payload, ipAddress) {
    return reviewService.moderateProof(actor.id, id, payload, ipAddress);
  },
  async resolveDispute(actor, id, payload, ipAddress) {
    return disputeService.resolveAward(actor.id, id, payload, ipAddress);
  },
};

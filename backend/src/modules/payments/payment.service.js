import crypto from 'node:crypto';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';
import { mockPaymentProvider } from './providers/mock.provider.js';
import { PAYMENT_CAPABILITIES, paymentProvider, requirePaymentCapability } from './providers/payment-provider.port.js';
import { qpayPaymentProvider } from './providers/qpay.provider.js';
import { stripePaymentProvider } from './providers/stripe.provider.js';
import { ledgerRules, postLedgerBatch } from './ledger.service.js';
import { toMethod, toPayment } from './payment.mapper.js';
import { assertPaymentsUnfrozen } from './payment-freeze.policy.js';
import { paymentRepository } from './payment.repository.js';
import { getSetting } from '../operations/platform-config.service.js';
import { walletService } from './wallet.service.js';

const moneyEqual = (a, b) => Math.abs(Number(a) - Number(b)) < 0.001;
const round2 = (value) => Math.round(Number(value) * 100) / 100;
const missing = () => new AppError('Payment was not found.', 404, 'PAYMENT_NOT_FOUND');
async function creatorFor(userId) {
  const creator = await paymentRepository.findCreatorByUserId(userId);
  if (!creator) throw new AppError('Create a creator channel first.', 403, 'CREATOR_PROFILE_REQUIRED');
  return creator;
}
function participant(collaboration, userId) {
  if (!collaboration) throw new AppError('Collaboration was not found.', 404, 'COLLABORATION_NOT_FOUND');
  if (collaboration.business.userId === userId) return 'business';
  if (collaboration.creator.userId === userId) return 'creator';
  throw new AppError('Collaboration was not found.', 404, 'COLLABORATION_NOT_FOUND');
}

async function autoConfirm(payment, eventType) {
  if (env.paymentProvider !== 'mock' && payment.type === 'FUNDING') return payment;
  const event = mockPaymentProvider.event(eventType, payment);
  return paymentService.processWebhook(event, mockPaymentProvider.sign(event));
}

function secureEqual(left, right) {
  if (!left || !right) return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export const paymentService = {
  async createFundingIntent(userId, collaborationId, payload) {
    const result = await walletService.fundCollaboration(userId, collaborationId, {
      paymentMethod: 'WALLET',
      idempotencyKey: payload.idempotencyKey || `legacy-wallet-funding-${collaborationId}`,
    });
    return { payment: toPayment(result.payment), intent: null, duplicate: result.duplicate };
  },

  async processWebhook(payload, signature) {
    requirePaymentCapability(mockPaymentProvider, PAYMENT_CAPABILITIES.WEBHOOK);
    if (!mockPaymentProvider.verify(payload, signature)) {
      throw new AppError('Webhook signature is invalid.', 401, 'INVALID_WEBHOOK_SIGNATURE');
    }
    return this.processVerifiedEvent(payload, mockPaymentProvider.name);
  },

  async processVerifiedEvent(payload, providerName) {
    if (!payload.id || !payload.type || !payload.data?.providerRef) {
      throw new AppError('Webhook payload is invalid.', 400, 'INVALID_WEBHOOK_PAYLOAD');
    }
    const payloadHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    const walletTopUp = await paymentRepository.transaction((tx) => tx.walletTopUp.findUnique({ where: { providerRef: payload.data.providerRef }, select: { id: true } }));
    if (walletTopUp) return walletService.processVerifiedTopUp(payload, providerName, payloadHash);
    try {
      return await paymentRepository.transaction(async (tx) => {
      const duplicate = await tx.paymentProviderEvent.findUnique({ where: { providerEventId: payload.id } });
      if (duplicate) {
        if (duplicate.payloadHash !== payloadHash) {
          throw new AppError('A provider event id was replayed with a different payload.', 409, 'PAYMENT_EVENT_REPLAY_MISMATCH');
        }
        if (duplicate.failureReason) {
          throw new AppError('This provider event was already rejected.', 409, 'PAYMENT_EVENT_PREVIOUSLY_REJECTED', { failureReason: duplicate.failureReason });
        }
        if (duplicate.paymentId) return tx.payment.findUnique({ where: { id: duplicate.paymentId } });
        return { duplicate: true, status: 'PROCESSED' };
      }

      const payment = await tx.payment.findUnique({ where: { providerRef: payload.data.providerRef } });
      if (payment) {
        if (payment.provider !== providerName && !(payment.provider === 'internal' && providerName === 'mock')) {
          throw new AppError('Provider reference belongs to a different provider.', 409, 'PAYMENT_PROVIDER_MISMATCH');
        }
        if (!moneyEqual(payment.amount, payload.data.amount) || payment.currency !== payload.data.currency) {
          throw new AppError('Provider amount or currency does not match.', 409, 'PAYMENT_EVENT_MISMATCH');
        }
        const rules = {
          'funding.succeeded': { type: 'FUNDING', from: ['PENDING', 'PROCESSING'], to: 'FUNDED' },
          'release.succeeded': { type: 'MILESTONE_RELEASE', from: ['PENDING', 'PROCESSING'], to: 'RELEASED' },
          'payment.failed': { type: payment.type, from: ['PENDING', 'PROCESSING'], to: 'FAILED' },
        };
        const rule = rules[payload.type];
        if (!rule || rule.type !== payment.type || !rule.from.includes(payment.status)) {
          throw new AppError('Provider event is not allowed for this payment state.', 409, 'INVALID_PAYMENT_TRANSITION');
        }
        if (payload.type === 'release.succeeded') {
          await assertPaymentsUnfrozen(tx, payment.collaborationId);
          const collaboration = await tx.collaboration.findUnique({ where: { id: payment.collaborationId } });
          if (collaboration.status !== 'SETTLEMENT_PENDING' || !collaboration.settlementDueAt || collaboration.settlementDueAt > new Date()) {
            throw new AppError('Funds cannot be released before the verified settlement window ends.', 409, 'EARLY_RELEASE_NOT_ALLOWED');
          }
        }
        const updated = await tx.payment.update({
          where: { id: payment.id },
          data: { status: rule.to, processedAt: new Date(), failureReason: payload.data.failureReason || null },
        });
        if (rule.to === 'FUNDED') {
          await tx.collaboration.update({
            where: { id: payment.collaborationId },
            data: { status: 'IN_PROGRESS', progress: 70, version: { increment: 1 } },
          });
        }
        if (rule.to === 'FUNDED') {
          await postLedgerBatch(tx, ledgerRules.funding({ eventId: payload.id, payment: updated }));
        }
        if (rule.to === 'RELEASED') {
          const settlement = await tx.collaboration.findUnique({
            where: { id: payment.collaborationId },
            include: { creator: { select: { userId: true } }, payments: { where: { type: 'FUNDING' }, take: 1 } },
          });
          await postLedgerBatch(tx, ledgerRules.settlement({ eventId: payload.id, payment: updated, creatorUserId: settlement.creator.userId, fee: Number(settlement.payments[0]?.platformFee || 0) }));
          await tx.collaboration.update({ where: { id: payment.collaborationId }, data: { status: 'COMPLETED', progress: 100, completedAt: new Date(), version: { increment: 1 } } });
        }
        await tx.paymentProviderEvent.create({
          data: {
            providerEventId: payload.id,
            paymentId: payment.id,
            provider: providerName,
            eventType: payload.type,
            payload,
            payloadHash,
            processedAt: new Date(),
          },
        });
        await tx.collaborationActivity.create({
          data: {
            collaborationId: payment.collaborationId,
            type: `PAYMENT_${rule.to}`,
            message: rule.to === 'FUNDED' ? 'Verified project funding was received.' : rule.to === 'RELEASED' ? 'Verified payment release completed.' : 'Payment provider reported a failure.',
            metadata: { paymentId: payment.id, providerEventId: payload.id },
          },
        });
        await tx.outboxEvent.create({ data: { topic: `payment.${rule.to.toLowerCase()}`, aggregateId: updated.id, payload: { paymentId: updated.id, collaborationId: updated.collaborationId } } });
        return updated;
      }

      const refund = await tx.paymentRefund.findUnique({ where: { providerRef: payload.data.providerRef }, include: { payment: true } });
      if (refund && payload.type === 'refund.succeeded') {
        if (refund.payment.provider !== providerName && !(refund.payment.provider === 'internal' && providerName === 'mock')) {
          throw new AppError('Refund reference belongs to a different provider.', 409, 'PAYMENT_PROVIDER_MISMATCH');
        }
        if (!moneyEqual(refund.amount, payload.data.amount) || refund.payment.currency !== payload.data.currency) {
          throw new AppError('Refund amount or currency does not match.', 409, 'PAYMENT_EVENT_MISMATCH');
        }
        const updated = await tx.paymentRefund.update({ where: { id: refund.id }, data: { status: 'REFUNDED', processedAt: new Date() } });
        await tx.payment.update({ where: { id: refund.paymentId }, data: { status: 'REFUNDED', processedAt: new Date() } });
        await tx.paymentProviderEvent.create({
          data: { providerEventId: payload.id, paymentId: refund.paymentId, provider: providerName, eventType: payload.type, payload, payloadHash, processedAt: new Date() },
        });
        await postLedgerBatch(tx, ledgerRules.refund({ eventId: payload.id, payment: refund.payment, amount: refund.amount }));
        return updated;
      }

      const payout = await tx.paymentPayout.findUnique({ where: { providerRef: payload.data.providerRef }, include: { payment: true } });
      if (payout && payload.type === 'payout.succeeded') {
        if (payout.payment.provider !== providerName && !(payout.payment.provider === 'internal' && providerName === 'mock')) {
          throw new AppError('Payout reference belongs to a different provider.', 409, 'PAYMENT_PROVIDER_MISMATCH');
        }
        if (!moneyEqual(payout.amount, payload.data.amount) || payout.payment.currency !== payload.data.currency) {
          throw new AppError('Payout amount or currency does not match.', 409, 'PAYMENT_EVENT_MISMATCH');
        }
        const updated = await tx.paymentPayout.update({ where: { id: payout.id }, data: { status: 'PAID', processedAt: new Date() } });
        await tx.paymentProviderEvent.create({
          data: { providerEventId: payload.id, paymentId: payout.paymentId, provider: providerName, eventType: payload.type, payload, payloadHash, processedAt: new Date() },
        });
        const payoutRule = payout.payment.provider === 'internal' && payout.payment.metadata?.source === 'BUSINESS_WALLET'
          ? ledgerRules.walletPayout
          : ledgerRules.payout;
        await postLedgerBatch(tx, payoutRule({ eventId: payload.id, payment: payout.payment, creatorUserId: payout.creatorId, amount: payout.amount }));
        return updated;
      }
      throw missing();
      });
    } catch (error) {
      if (!['PAYMENT_EVENT_REPLAY_MISMATCH'].includes(error?.code)) {
        await paymentRepository.transaction(async (tx) => {
          await tx.paymentProviderEvent.upsert({
            where: { providerEventId: payload.id },
            create: {
              providerEventId: payload.id,
              provider: providerName,
              eventType: payload.type,
              payload,
              payloadHash,
              failureReason: error?.code || error?.message || 'PROCESSING_FAILED',
            },
            update: { failureReason: error?.code || error?.message || 'PROCESSING_FAILED' },
          });
        }).catch(() => {});
      }
      throw error;
    }
  },

  async processQPayCallback(paymentId, callbackToken, rawCallback = {}) {
    if (env.paymentProvider !== 'qpay' || !secureEqual(callbackToken, env.qpayCallbackToken)) {
      throw new AppError('QPay callback token is invalid.', 401, 'INVALID_QPAY_CALLBACK');
    }
    const payment = await paymentRepository.findPayment(paymentId);
    if (!payment || payment.provider !== 'qpay' || payment.type !== 'FUNDING') throw missing();
    const checked = await qpayPaymentProvider.checkIntent(payment.providerRef);
    const callbackProviderRef = rawCallback.invoice_id || rawCallback.object_id || rawCallback.invoiceId || null;
    if (checked.providerRef !== payment.providerRef || (callbackProviderRef && callbackProviderRef !== payment.providerRef)) {
      throw new AppError('QPay callback provider reference does not match.', 409, 'PAYMENT_PROVIDER_MISMATCH');
    }
    if (!checked.paid || !moneyEqual(checked.amount, payment.amount) || checked.currency !== payment.currency) {
      throw new AppError('QPay invoice is not fully paid.', 409, 'QPAY_PAYMENT_NOT_CONFIRMED');
    }
    const event = {
      id: `qpay_${checked.providerPaymentId || payment.providerRef}`,
      type: 'funding.succeeded',
      createdAt: new Date().toISOString(),
      data: { providerRef: payment.providerRef, amount: Number(payment.amount), currency: payment.currency, rawCallback, providerCheck: checked.raw },
    };
    return this.processVerifiedEvent(event, qpayPaymentProvider.name);
  },

  async processStripeWebhook(rawBody, signature) {
    requirePaymentCapability(stripePaymentProvider, PAYMENT_CAPABILITIES.WEBHOOK);
    if (!stripePaymentProvider.verifyWebhook(rawBody, signature)) {
      throw new AppError('Stripe webhook signature is invalid.', 401, 'INVALID_WEBHOOK_SIGNATURE');
    }
    let payload;
    try { payload = JSON.parse(Buffer.from(rawBody).toString('utf8')); }
    catch { throw new AppError('Stripe webhook payload is invalid.', 400, 'INVALID_WEBHOOK_PAYLOAD'); }
    return this.processVerifiedEvent(stripePaymentProvider.normalizeEvent(payload), stripePaymentProvider.name);
  },

  async mockConfirm(userId, paymentId) {
    if (env.nodeEnv === 'production') throw new AppError('Mock confirmation is disabled.', 404, 'NOT_FOUND');
    const payment = await paymentRepository.findPayment(paymentId);
    if (!payment) throw missing();
    participant(payment.collaboration, userId);
    const type = payment.type === 'FUNDING' ? 'funding.succeeded' : payment.type === 'MILESTONE_RELEASE' ? 'release.succeeded' : null;
    if (!type) throw new AppError('This payment cannot be mock-confirmed.', 409, 'MOCK_CONFIRM_NOT_ALLOWED');
    return toPayment(await autoConfirm(payment, type));
  },

  async list(userId, filters) {
    const result = await paymentRepository.listForUser(userId, filters);
    return {
      items: result.items.map(toPayment),
      pagination: { page: filters.page, limit: filters.limit, total: result.total, totalPages: Math.ceil(result.total / filters.limit) },
    };
  },

  async listMethods(userId) {
    const methods = await paymentRepository.transaction((tx) => tx.paymentMethod.findMany({ where: { userId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] }));
    return methods.map(toMethod);
  },
  async addMethod(userId, payload) {
    const method = await paymentRepository.transaction(async (tx) => {
      if (payload.isDefault) await tx.paymentMethod.updateMany({ where: { userId }, data: { isDefault: false } });
      return tx.paymentMethod.create({ data: { userId, provider: 'mock', ...payload } });
    });
    return toMethod(method);
  },
  async removeMethod(userId, id) {
    const removed = await paymentRepository.transaction((tx) => tx.paymentMethod.deleteMany({ where: { id, userId } }));
    if (!removed.count) throw new AppError('Payment method was not found.', 404, 'PAYMENT_METHOD_NOT_FOUND');
  },

  async requestRefund(userId, paymentId, payload) {
    const payment = await paymentRepository.findPayment(paymentId);
    if (!payment) throw missing();
    if (payment.provider === 'internal' && payment.metadata?.source === 'BUSINESS_WALLET') {
      return walletService.refund(userId, paymentId, payload);
    }
    const role = participant(payment.collaboration, userId);
    if (role !== 'business' || payment.type !== 'FUNDING' || payment.status !== 'FUNDED') {
      throw new AppError('This payment is not eligible for a refund.', 409, 'REFUND_NOT_ALLOWED');
    }
    await paymentRepository.transaction((tx) => assertPaymentsUnfrozen(tx, payment.collaborationId));
    const release = await paymentRepository.transaction((tx) => tx.payment.findFirst({
      where: { collaborationId: payment.collaborationId, type: 'MILESTONE_RELEASE', status: { in: ['RELEASED', 'PAID'] } },
    }));
    if (release) throw new AppError('Released funds cannot be refunded through this flow.', 409, 'REFUND_NOT_ALLOWED');
    const amount = payload.amount || Number(payment.amount);
    if (amount > Number(payment.amount)) throw new AppError('Refund exceeds the funded amount.', 409, 'REFUND_AMOUNT_EXCEEDED');
    requirePaymentCapability(paymentProvider, PAYMENT_CAPABILITIES.REFUND);
    let refund = await paymentRepository.transaction(async (tx) => {
      const current = await tx.payment.findUnique({ where: { id: paymentId }, include: { refundRequests: true } });
      if (!current || current.status !== 'FUNDED') throw new AppError('This payment is not eligible for a refund.', 409, 'REFUND_NOT_ALLOWED');
      await assertPaymentsUnfrozen(tx, current.collaborationId);
      const alreadyRequested = current.refundRequests
        .filter((item) => !['FAILED', 'CANCELLED'].includes(item.status))
        .reduce((sum, item) => sum + Number(item.amount), 0);
      if (alreadyRequested + Number(amount) > Number(current.amount)) {
        throw new AppError('Refund exceeds the available funded balance.', 409, 'REFUND_AMOUNT_EXCEEDED');
      }
      return tx.paymentRefund.create({ data: { paymentId, requesterId: userId, amount, reason: payload.reason } });
    });
    let intent;
    try {
      intent = await paymentProvider.createRefund({ refundId: refund.id, paymentId, providerRef: payment.providerRef, amount, currency: payment.currency });
    } catch (error) {
      await paymentRepository.transaction((tx) => tx.paymentRefund.updateMany({ where: { id: refund.id, status: 'PENDING' }, data: { status: 'FAILED' } }));
      throw error;
    }
    refund = await paymentRepository.transaction(async (tx) => {
      const updated = await tx.paymentRefund.update({ where: { id: refund.id }, data: { providerRef: intent.providerRef } });
      await tx.outboxEvent.create({ data: { topic: 'payment.refund_requested', aggregateId: paymentId, payload: { paymentId, refundId: updated.id, collaborationId: payment.collaborationId, actorId: userId } } });
      return updated;
    });
    if (payload.autoConfirm && env.paymentProvider === 'mock' && env.nodeEnv !== 'production') {
      const eventRecord = { providerRef: refund.providerRef, amount: refund.amount, currency: payment.currency };
      const event = mockPaymentProvider.event('refund.succeeded', eventRecord);
      refund = await this.processWebhook(event, mockPaymentProvider.sign(event));
    }
    return { ...refund, amount: Number(refund.amount) };
  },

  async requestPayout(userId, paymentId, payload) {
    const payment = await paymentRepository.findPayment(paymentId);
    if (!payment) throw missing();
    const role = participant(payment.collaboration, userId);
    const walletRelease = payment.provider === 'internal' && payment.metadata?.source === 'BUSINESS_WALLET' && payment.type === 'FUNDING' && Number(payment.creatorAmount) > 0;
    if (role !== 'creator' || (!walletRelease && payment.type !== 'MILESTONE_RELEASE') || payment.status !== 'RELEASED') {
      throw new AppError('This payment is not eligible for payout.', 409, 'PAYOUT_NOT_ALLOWED');
    }
    await paymentRepository.transaction((tx) => assertPaymentsUnfrozen(tx, payment.collaborationId));
    const minimumPayout = Number(await getSetting('minimumPayout'));
    const payoutAmount = walletRelease ? Number(payment.creatorAmount) : Number(payment.amount);
    if (payoutAmount < minimumPayout) {
      throw new AppError(`Payout minimum is ${minimumPayout} ${payment.currency}.`, 409, 'PAYOUT_BELOW_MINIMUM');
    }
    const existing = await paymentRepository.transaction((tx) => tx.paymentPayout.findFirst({
      where: { paymentId, status: { in: ['PENDING', 'PROCESSING', 'PAID'] } },
    }));
    if (existing) return { ...existing, amount: Number(existing.amount) };
    let payout = await paymentRepository.transaction(async (tx) => {
      const payoutAccount = await tx.payoutAccount.findFirst({ where: { id: payload.payoutAccountId, userId, currency: payment.currency } });
      if (!payoutAccount) throw new AppError('Payout account was not found.', 404, 'PAYOUT_ACCOUNT_NOT_FOUND');
      const available = walletRelease ? await tx.ledgerAccount.findUnique({ where: { ownerId_type_currency: { ownerId: userId, type: 'CREATOR_AVAILABLE', currency: payment.currency } } }) : null;
      if (walletRelease && -Number(available?.balance || 0) < payoutAmount) throw new AppError('Available creator earnings are insufficient.', 409, 'PAYOUT_BALANCE_INSUFFICIENT');
      const created = await tx.paymentPayout.create({ data: { paymentId, creatorId: userId, payoutAccountId: payoutAccount.id, amount: payoutAmount } });
      await tx.outboxEvent.create({ data: { topic: 'payout.requested', aggregateId: created.id, payload: { payoutId: created.id, paymentId, collaborationId: payment.collaborationId, actorId: userId } } });
      return created;
    });
    return { ...payout, amount: Number(payout.amount) };
  },

  async earningsSummary(userId) {
    await creatorFor(userId);
    const entries = await paymentRepository.earningsLedger(userId, null);
    const currency = entries[0]?.currency || 'MNT';
    const [payable, pendingAccount, availableAccount] = await Promise.all([
      paymentRepository.creatorPayableBalance(userId, currency),
      paymentRepository.creatorBalance(userId, 'CREATOR_PENDING', currency),
      paymentRepository.creatorBalance(userId, 'CREATOR_AVAILABLE', currency),
    ]);
    const byYear = new Map();
    let grossEarned = 0;
    let totalPaidOut = 0;
    for (const entry of entries) {
      const amount = Number(entry.amount);
      const year = entry.occurredAt.getUTCFullYear();
      const bucket = byYear.get(year) || { year, earned: 0, paidOut: 0 };
      if (['CREATOR_EARNED', 'CREATOR_RELEASE'].includes(entry.type)) {
        grossEarned = round2(grossEarned + amount);
        bucket.earned = round2(bucket.earned + amount);
      }
      if (['PAYOUT_SENT', 'PAYOUT'].includes(entry.type)) {
        totalPaidOut = round2(totalPaidOut + amount);
        bucket.paidOut = round2(bucket.paidOut + amount);
      }
      byYear.set(year, bucket);
    }
    return {
      currency,
      grossEarned,
      totalPaidOut,
      // LedgerAccount.balance is debit-normal (see ledger.service.js postLedgerBatch): a liability
      // account like CREATOR_PAYABLE is credited as it grows, so its stored balance goes negative.
      // The amount actually owed to the creator is the negation of that stored balance.
      pendingEarnings: pendingAccount ? round2(-Number(pendingAccount.balance)) : 0,
      availableEarnings: availableAccount ? round2(-Number(availableAccount.balance)) : payable ? round2(-Number(payable.balance)) : round2(grossEarned - totalPaidOut),
      pendingBalance: pendingAccount ? round2(-Number(pendingAccount.balance)) : 0,
      totalEarned: grossEarned,
      transactionCount: entries.length,
      byYear: [...byYear.values()].sort((a, b) => b.year - a.year),
    };
  },

  async earningsExport(userId, year) {
    await creatorFor(userId);
    const entries = await paymentRepository.earningsLedger(userId, year);
    return entries.map((entry) => ({
      date: entry.occurredAt,
      type: entry.type,
      description: entry.description,
      campaign: entry.collaboration?.campaign?.title || '',
      business: entry.collaboration?.business?.companyName || '',
      amount: ['PAYOUT_SENT', 'PAYOUT'].includes(entry.type) ? -Number(entry.amount) : Number(entry.amount),
      currency: entry.currency,
    }));
  },
};

export const paymentPort = {
  releaseWalletFunding: (payment, options) => walletService.release(payment.id, options),
  requestRelease: async (payment, autoConfirmRelease = false) => {
    await paymentRepository.transaction((tx) => assertPaymentsUnfrozen(tx, payment.collaborationId));
    if (autoConfirmRelease && env.nodeEnv !== 'production') return autoConfirm(payment, 'release.succeeded');
    return payment;
  },
};

import crypto from 'node:crypto';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';
import { mockPaymentProvider } from './providers/mock.provider.js';
import { toMethod, toPayment } from './payment.mapper.js';
import { paymentRepository } from './payment.repository.js';

const provider = mockPaymentProvider;
const moneyEqual = (a, b) => Math.abs(Number(a) - Number(b)) < 0.001;
const missing = () => new AppError('Payment was not found.', 404, 'PAYMENT_NOT_FOUND');

function participant(collaboration, userId) {
  if (!collaboration) throw new AppError('Collaboration was not found.', 404, 'COLLABORATION_NOT_FOUND');
  if (collaboration.business.userId === userId) return 'business';
  if (collaboration.creator.userId === userId) return 'creator';
  throw new AppError('Collaboration was not found.', 404, 'COLLABORATION_NOT_FOUND');
}

async function autoConfirm(payment, eventType) {
  if (env.paymentProvider !== 'mock') return payment;
  const event = provider.event(eventType, payment);
  return paymentService.processWebhook(event, provider.sign(event));
}

export const paymentService = {
  async createFundingIntent(userId, collaborationId, payload) {
    const collaboration = await paymentRepository.findCollaboration(collaborationId);
    const role = participant(collaboration, userId);
    if (role !== 'business') throw new AppError('Only the business can fund this collaboration.', 403, 'PAYMENT_FORBIDDEN');
    if (collaboration.status === 'IN_PROGRESS') {
      const existing = collaboration.payments.find((item) => item.type === 'FUNDING' && item.status === 'FUNDED');
      if (existing) return { payment: toPayment(existing), intent: null };
    }
    if (collaboration.status !== 'PAYMENT_PENDING' || collaboration.contract?.status !== 'ACTIVE') {
      throw new AppError('An active contract is required before funding.', 409, 'EARLY_FUNDING_NOT_ALLOWED');
    }
    const amount = Number(collaboration.terms?.budget);
    if (!Number.isFinite(amount) || amount <= 0) throw new AppError('The collaboration amount is invalid.', 409, 'INVALID_PAYMENT_AMOUNT');
    if (payload.paymentMethodId) {
      const method = await paymentRepository.transaction((tx) => tx.paymentMethod.findFirst({
        where: { id: payload.paymentMethodId, userId },
      }));
      if (!method) throw new AppError('Payment method was not found.', 404, 'PAYMENT_METHOD_NOT_FOUND');
    }
    let payment = collaboration.payments.find((item) => item.type === 'FUNDING' && ['PENDING', 'PROCESSING'].includes(item.status));
    if (!payment) {
      payment = await paymentRepository.transaction(async (tx) => {
        const created = await tx.payment.create({
          data: {
            collaborationId,
            type: 'FUNDING',
            status: 'PENDING',
            amount,
            currency: collaboration.terms?.currency || 'MNT',
            provider: env.paymentProvider,
            paymentMethodRef: payload.paymentMethodId || null,
          },
        });
        const intent = provider.createIntent({
          kind: 'funding',
          paymentId: created.id,
          amount,
          currency: created.currency,
        });
        return tx.payment.update({ where: { id: created.id }, data: { providerRef: intent.providerRef } });
      });
    }
    if (payload.autoConfirm && env.nodeEnv !== 'production') payment = await autoConfirm(payment, 'funding.succeeded');
    return {
      payment: toPayment(payment),
      intent: {
        provider: payment.provider,
        providerRef: payment.providerRef,
        amount: Number(payment.amount),
        currency: payment.currency,
      },
    };
  },

  async processWebhook(payload, signature) {
    if (!provider.verify(payload, signature)) {
      throw new AppError('Webhook signature is invalid.', 401, 'INVALID_WEBHOOK_SIGNATURE');
    }
    if (!payload.id || !payload.type || !payload.data?.providerRef) {
      throw new AppError('Webhook payload is invalid.', 400, 'INVALID_WEBHOOK_PAYLOAD');
    }
    const payloadHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    return paymentRepository.transaction(async (tx) => {
      const duplicate = await tx.paymentProviderEvent.findUnique({ where: { providerEventId: payload.id } });
      if (duplicate) {
        if (duplicate.paymentId) return tx.payment.findUnique({ where: { id: duplicate.paymentId } });
        return { duplicate: true, status: 'PROCESSED' };
      }

      const payment = await tx.payment.findUnique({ where: { providerRef: payload.data.providerRef } });
      if (payment) {
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
          const collaboration = await tx.collaboration.findUnique({ where: { id: payment.collaborationId } });
          if (collaboration.status !== 'COMPLETED') {
            throw new AppError('Funds cannot be released before completion.', 409, 'EARLY_RELEASE_NOT_ALLOWED');
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
        await tx.paymentProviderEvent.create({
          data: {
            providerEventId: payload.id,
            paymentId: payment.id,
            provider: 'mock',
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
        return updated;
      }

      const refund = await tx.paymentRefund.findUnique({ where: { providerRef: payload.data.providerRef }, include: { payment: true } });
      if (refund && payload.type === 'refund.succeeded') {
        if (!moneyEqual(refund.amount, payload.data.amount) || refund.payment.currency !== payload.data.currency) {
          throw new AppError('Refund amount or currency does not match.', 409, 'PAYMENT_EVENT_MISMATCH');
        }
        const updated = await tx.paymentRefund.update({ where: { id: refund.id }, data: { status: 'REFUNDED', processedAt: new Date() } });
        await tx.payment.update({ where: { id: refund.paymentId }, data: { status: 'REFUNDED', processedAt: new Date() } });
        await tx.paymentProviderEvent.create({
          data: { providerEventId: payload.id, paymentId: refund.paymentId, provider: 'mock', eventType: payload.type, payload, payloadHash, processedAt: new Date() },
        });
        return updated;
      }

      const payout = await tx.paymentPayout.findUnique({ where: { providerRef: payload.data.providerRef }, include: { payment: true } });
      if (payout && payload.type === 'payout.succeeded') {
        if (!moneyEqual(payout.amount, payload.data.amount) || payout.payment.currency !== payload.data.currency) {
          throw new AppError('Payout amount or currency does not match.', 409, 'PAYMENT_EVENT_MISMATCH');
        }
        const updated = await tx.paymentPayout.update({ where: { id: payout.id }, data: { status: 'PAID', processedAt: new Date() } });
        await tx.paymentProviderEvent.create({
          data: { providerEventId: payload.id, paymentId: payout.paymentId, provider: 'mock', eventType: payload.type, payload, payloadHash, processedAt: new Date() },
        });
        return updated;
      }
      throw missing();
    });
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
    const role = participant(payment.collaboration, userId);
    if (role !== 'business' || payment.type !== 'FUNDING' || payment.status !== 'FUNDED') {
      throw new AppError('This payment is not eligible for a refund.', 409, 'REFUND_NOT_ALLOWED');
    }
    const release = await paymentRepository.transaction((tx) => tx.payment.findFirst({
      where: { collaborationId: payment.collaborationId, type: 'MILESTONE_RELEASE', status: { in: ['RELEASED', 'PAID'] } },
    }));
    if (release) throw new AppError('Released funds cannot be refunded through this flow.', 409, 'REFUND_NOT_ALLOWED');
    const amount = payload.amount || Number(payment.amount);
    if (amount > Number(payment.amount)) throw new AppError('Refund exceeds the funded amount.', 409, 'REFUND_AMOUNT_EXCEEDED');
    let refund = await paymentRepository.transaction(async (tx) => {
      const created = await tx.paymentRefund.create({ data: { paymentId, requesterId: userId, amount, reason: payload.reason } });
      const intent = provider.createIntent({ kind: 'refund', paymentId, amount, currency: payment.currency });
      return tx.paymentRefund.update({ where: { id: created.id }, data: { providerRef: intent.providerRef } });
    });
    if (payload.autoConfirm && env.nodeEnv !== 'production') {
      const eventRecord = { providerRef: refund.providerRef, amount: refund.amount, currency: payment.currency };
      const event = provider.event('refund.succeeded', eventRecord);
      refund = await this.processWebhook(event, provider.sign(event));
    }
    return { ...refund, amount: Number(refund.amount) };
  },

  async requestPayout(userId, paymentId, payload) {
    const payment = await paymentRepository.findPayment(paymentId);
    if (!payment) throw missing();
    const role = participant(payment.collaboration, userId);
    if (role !== 'creator' || payment.type !== 'MILESTONE_RELEASE' || payment.status !== 'RELEASED') {
      throw new AppError('This payment is not eligible for payout.', 409, 'PAYOUT_NOT_ALLOWED');
    }
    const existing = await paymentRepository.transaction((tx) => tx.paymentPayout.findFirst({
      where: { paymentId, status: { in: ['PENDING', 'PROCESSING', 'PAID'] } },
    }));
    if (existing) return { ...existing, amount: Number(existing.amount) };
    let payout = await paymentRepository.transaction(async (tx) => {
      const created = await tx.paymentPayout.create({ data: { paymentId, creatorId: userId, amount: payment.amount } });
      const intent = provider.createIntent({ kind: 'payout', paymentId, amount: payment.amount, currency: payment.currency });
      return tx.paymentPayout.update({ where: { id: created.id }, data: { providerRef: intent.providerRef } });
    });
    if (payload.autoConfirm && env.nodeEnv !== 'production') {
      const eventRecord = { providerRef: payout.providerRef, amount: payout.amount, currency: payment.currency };
      const event = provider.event('payout.succeeded', eventRecord);
      payout = await this.processWebhook(event, provider.sign(event));
    }
    return { ...payout, amount: Number(payout.amount) };
  },
};

export const paymentPort = {
  requestRelease: async (payment, autoConfirmRelease = false) => {
    if (autoConfirmRelease && env.nodeEnv !== 'production') return autoConfirm(payment, 'release.succeeded');
    return payment;
  },
};

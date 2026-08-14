import crypto from 'node:crypto';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';
import { getSetting } from '../operations/platform-config.service.js';
import { calculateCollaborationFinance, roundMoney, walletAvailability } from './finance.rules.js';
import { ledgerRules, postLedgerBatch } from './ledger.service.js';
import { mockPaymentProvider } from './providers/mock.provider.js';
import { PAYMENT_CAPABILITIES, paymentProvider, requirePaymentCapability } from './providers/payment-provider.port.js';
import { walletRepository } from './wallet.repository.js';

const walletCode = (userId, currency) => `business-wallet:${userId}:${currency}`;
const paymentOperationType = (paymentType) => paymentType === 'BARTER' ? 'BARTER_PLATFORM_FEE' : 'FUNDING';
const serializableConflict = (error) => {
  if (error?.code === 'P2034') throw new AppError('The wallet changed during this request. Retry with the same idempotency key.', 409, 'WALLET_CONCURRENCY_CONFLICT');
  throw error;
};

function topUpDto(item) {
  return {
    id: item.id, amount: Number(item.amount), currency: item.currency, status: item.status,
    provider: item.provider, checkoutUrl: item.metadata?.checkoutUrl || null,
    expiresAt: item.metadata?.expiresAt || null, completedAt: item.completedAt, createdAt: item.createdAt,
  };
}

export const walletService = {
  async summary(userId, currency = 'MNT') {
    const business = await walletRepository.businessForUser(userId);
    if (!business) throw new AppError('Create a business channel first.', 403, 'BUSINESS_PROFILE_REQUIRED');
    const [account, topUps, entries] = await Promise.all([
      walletRepository.walletAccount(userId, currency),
      walletRepository.topUps(userId, 20),
      walletRepository.walletEntries(userId, currency, 30),
    ]);
    const completed = topUps.filter((item) => item.status === 'COMPLETED');
    const totalFunded = roundMoney(completed.reduce((sum, item) => sum + Number(item.amount), 0));
    const totalSpent = roundMoney(entries.filter((item) => ['COLLABORATION_FUNDING', 'BARTER_PLATFORM_FEE'].includes(item.type)).reduce((sum, item) => sum + Number(item.amount), 0));
    return {
      owner: { id: business.id, name: business.companyName, type: 'BUSINESS' },
      currency,
      availableBalance: walletAvailability(account?.balance),
      pendingBalance: 0,
      totalFunded,
      totalSpent,
      topUps: topUps.map(topUpDto),
      transactions: entries.map((entry) => ({
        id: entry.id,
        type: entry.type,
        amount: Number(entry.amount),
        direction: entry.creditAccount.code === walletCode(userId, currency) ? 'CREDIT' : 'DEBIT',
        description: entry.description,
        collaboration: entry.collaboration ? { id: entry.collaboration.id, title: entry.collaboration.campaign?.title || 'Direct collaboration' } : null,
        occurredAt: entry.occurredAt,
      })),
    };
  },

  async createTopUp(userId, payload) {
    const business = await walletRepository.businessForUser(userId);
    if (!business) throw new AppError('Create a business channel first.', 403, 'BUSINESS_PROFILE_REQUIRED');
    const developmentDemo = env.nodeEnv === 'development' && paymentProvider.name === 'mock';
    if (!developmentDemo && env.nodeEnv !== 'test' && paymentProvider.name !== 'stripe') {
      throw new AppError('Business wallet top-up requires Stripe Checkout.', 503, 'WALLET_TOP_UP_STRIPE_REQUIRED');
    }
    requirePaymentCapability(paymentProvider, PAYMENT_CAPABILITIES.FUNDING);
    const minimum = Number(await getSetting('minimumTopUp'));
    if (payload.amount < minimum) throw new AppError(`Minimum wallet top-up is ${minimum} ${payload.currency}.`, 409, 'TOP_UP_BELOW_MINIMUM');
    const key = `wallet-top-up:${userId}:${payload.idempotencyKey}`;
    let topUp = await walletRepository.topUpByIdempotency(key);
    if (!topUp) {
      topUp = await walletRepository.transaction((tx) => tx.walletTopUp.create({
        data: { userId, amount: payload.amount, currency: payload.currency, provider: paymentProvider.name, idempotencyKey: key },
      })).catch((error) => error?.code === 'P2002' ? walletRepository.topUpByIdempotency(key) : serializableConflict(error));
    }
    if (topUp.status === 'COMPLETED') return topUpDto(topUp);
    if (topUp.providerRef) {
      if (developmentDemo && topUp.status === 'PENDING') {
        const event = mockPaymentProvider.event('funding.succeeded', topUp);
        const completed = await this.processVerifiedTopUp(event, mockPaymentProvider.name);
        return topUpDto(completed);
      }
      return topUpDto(topUp);
    }
    let intent;
    try {
      intent = await paymentProvider.createFundingIntent({
        paymentId: topUp.id,
        amount: Number(topUp.amount),
        currency: topUp.currency,
        description: 'Influence Hub business wallet top-up',
        successUrl: `${env.clientUrl}/business/payments?topup=success`,
        cancelUrl: `${env.clientUrl}/business/payments?topup=cancelled`,
      });
    } catch (error) {
      await walletRepository.transaction((tx) => tx.walletTopUp.updateMany({ where: { id: topUp.id, status: 'PENDING' }, data: { status: 'FAILED', failureReason: String(error?.code || error?.message).slice(0, 240) } }));
      throw error;
    }
    topUp = await walletRepository.transaction(async (tx) => {
      await tx.walletTopUp.updateMany({
        where: { id: topUp.id, providerRef: null },
        data: { providerRef: intent.providerRef, metadata: { checkoutUrl: intent.checkoutUrl, expiresAt: intent.expiresAt || null } },
      });
      return tx.walletTopUp.findUnique({ where: { id: topUp.id } });
    });
    if (developmentDemo) {
      const event = mockPaymentProvider.event('funding.succeeded', topUp);
      const completed = await this.processVerifiedTopUp(event, mockPaymentProvider.name);
      return topUpDto(completed);
    }
    return topUpDto(topUp);
  },

  async reconcilePendingTopUps(userId) {
    const business = await walletRepository.businessForUser(userId);
    if (!business) throw new AppError('Create a business channel first.', 403, 'BUSINESS_PROFILE_REQUIRED');
    if (paymentProvider.name !== 'stripe' || typeof paymentProvider.checkIntent !== 'function') {
      return { checked: 0, completed: 0, failed: 0, pending: 0 };
    }

    const pendingTopUps = (await walletRepository.topUps(userId, 20))
      .filter((item) => item.status === 'PENDING' && item.provider === 'stripe' && item.providerRef)
      .slice(0, 5);
    const result = { checked: pendingTopUps.length, completed: 0, failed: 0, pending: 0 };

    for (const topUp of pendingTopUps) {
      const checked = await paymentProvider.checkIntent(topUp.providerRef);
      if (!checked.paid && !checked.failed) {
        result.pending += 1;
        continue;
      }

      const terminalState = checked.paid ? 'paid' : 'failed';
      const event = {
        id: `reconcile:${paymentProvider.name}:${topUp.providerRef}:${terminalState}`,
        type: checked.paid ? 'funding.succeeded' : 'payment.failed',
        createdAt: checked.createdAt,
        data: {
          providerRef: checked.providerRef,
          amount: checked.amount,
          currency: checked.currency,
          ...(checked.failed ? { failureReason: 'Stripe Checkout session expired before payment completed.' } : {}),
        },
      };
      await this.processVerifiedTopUp(event, paymentProvider.name);
      result[checked.paid ? 'completed' : 'failed'] += 1;
    }

    return result;
  },

  async processVerifiedTopUp(payload, providerName, payloadHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')) {
    try {
      return await walletRepository.transaction(async (tx) => {
      const duplicate = await tx.paymentProviderEvent.findUnique({ where: { providerEventId: payload.id } });
      if (duplicate) {
        if (duplicate.payloadHash !== payloadHash) throw new AppError('A provider event id was replayed with a different payload.', 409, 'PAYMENT_EVENT_REPLAY_MISMATCH');
        return duplicate.walletTopUpId ? tx.walletTopUp.findUnique({ where: { id: duplicate.walletTopUpId } }) : { duplicate: true };
      }
      const topUp = await tx.walletTopUp.findUnique({ where: { providerRef: payload.data.providerRef } });
      if (!topUp) return null;
      if (topUp.provider !== providerName || Number(topUp.amount) !== Number(payload.data.amount) || topUp.currency !== payload.data.currency) {
        throw new AppError('Top-up provider, amount or currency does not match.', 409, 'TOP_UP_EVENT_MISMATCH');
      }
      const success = payload.type === 'funding.succeeded';
      const failure = payload.type === 'payment.failed';
      if (!success && !failure) throw new AppError('Provider event cannot update a wallet top-up.', 409, 'INVALID_PAYMENT_TRANSITION');
      if (topUp.status !== 'PENDING') {
        const sameTerminalState = (topUp.status === 'COMPLETED' && success) || (topUp.status === 'FAILED' && failure);
        if (!sameTerminalState) throw new AppError('The wallet top-up is already in a terminal state.', 409, 'INVALID_TOP_UP_TRANSITION');
        await tx.paymentProviderEvent.create({
          data: { providerEventId: payload.id, walletTopUpId: topUp.id, provider: providerName, eventType: payload.type, payload, payloadHash, processedAt: new Date() },
        });
        return topUp;
      }
      if (payload.type === 'payment.failed') {
        const failed = await tx.walletTopUp.update({ where: { id: topUp.id }, data: { status: 'FAILED', failureReason: payload.data.failureReason || 'Provider payment failed.' } });
        await tx.paymentProviderEvent.create({ data: { providerEventId: payload.id, walletTopUpId: topUp.id, provider: providerName, eventType: payload.type, payload, payloadHash, processedAt: new Date() } });
        return failed;
      }
      const completed = await tx.walletTopUp.update({ where: { id: topUp.id }, data: { status: 'COMPLETED', completedAt: new Date(), failureReason: null } });
      await postLedgerBatch(tx, ledgerRules.walletTopUp({ eventId: payload.id, topUp: completed }));
      await tx.paymentProviderEvent.create({ data: { providerEventId: payload.id, walletTopUpId: topUp.id, provider: providerName, eventType: payload.type, payload, payloadHash, processedAt: new Date() } });
      await tx.outboxEvent.create({ data: { topic: 'wallet.top_up_completed', aggregateId: topUp.id, payload: { topUpId: topUp.id, userId: topUp.userId, amount: Number(topUp.amount), currency: topUp.currency } } });
      return completed;
      });
    } catch (error) {
      if (error?.code === 'P2002') {
        const duplicate = await walletRepository.providerEvent(payload.id);
        if (duplicate) {
          if (duplicate.payloadHash !== payloadHash) throw new AppError('A provider event id was replayed with a different payload.', 409, 'PAYMENT_EVENT_REPLAY_MISMATCH');
          if (duplicate.walletTopUpId) return walletRepository.transaction((tx) => tx.walletTopUp.findUnique({ where: { id: duplicate.walletTopUpId } }));
        }
      }
      return serializableConflict(error);
    }
  },

  async collaborationSummary(userId, collaborationId) {
    const collaboration = await walletRepository.collaboration(collaborationId);
    if (!collaboration) throw new AppError('Collaboration was not found.', 404, 'COLLABORATION_NOT_FOUND');
    if (![collaboration.business.userId, collaboration.creator.userId].includes(userId)) throw new AppError('Collaboration was not found.', 404, 'COLLABORATION_NOT_FOUND');
    const finance = calculateCollaborationFinance(collaboration, {
      commissionPercent: Number(await getSetting('commission')),
      barterPlatformFee: Number(await getSetting('barterPlatformFee')),
    });
    const account = await walletRepository.walletAccount(collaboration.business.userId, finance.currency);
    const payment = collaboration.payments[0] || null;
    const availableBalance = walletAvailability(account?.balance);
    return {
      ...finance,
      availableBalance,
      missingAmount: roundMoney(Math.max(0, finance.payableAmount - availableBalance)),
      canFund: collaboration.contract?.status === 'ACTIVE' && collaboration.status === 'PAYMENT_PENDING' && !payment,
      payment: payment ? {
        id: payment.id, status: payment.status, amount: Number(payment.amount), fundedAt: payment.fundedAt || payment.processedAt,
        releasedAt: payment.releasedAt,
      } : null,
    };
  },

  async fundCollaboration(userId, collaborationId, payload) {
    const commissionPercent = Number(await getSetting('commission'));
    const barterPlatformFee = Number(await getSetting('barterPlatformFee'));
    try {
      return await walletRepository.transaction(async (tx) => {
        const collaboration = await walletRepository.collaboration(collaborationId, tx);
        if (!collaboration || collaboration.business.userId !== userId) throw new AppError('Collaboration was not found.', 404, 'COLLABORATION_NOT_FOUND');
        const existing = collaboration.payments.find((item) => ['FUNDED', 'PARTIALLY_REFUNDED', 'IN_PROGRESS', 'READY_FOR_RELEASE', 'RELEASED'].includes(item.status));
        if (existing) return { payment: existing, duplicate: true };
        if (collaboration.contract?.status !== 'ACTIVE' || collaboration.status !== 'PAYMENT_PENDING') {
          throw new AppError('An active contract is required before wallet funding.', 409, 'EARLY_FUNDING_NOT_ALLOWED');
        }
        const finance = calculateCollaborationFinance(collaboration, { commissionPercent, barterPlatformFee });
        const idempotencyKey = `collaboration-funding:${collaborationId}:${payload.idempotencyKey}`;
        const prior = await tx.payment.findUnique({ where: { idempotencyKey } });
        if (prior) return { payment: prior, duplicate: true };
        await tx.ledgerAccount.upsert({
          where: { code: walletCode(userId, finance.currency) }, update: {},
          create: { code: walletCode(userId, finance.currency), ownerId: userId, type: 'BUSINESS_WALLET', currency: finance.currency },
        });
        await tx.$queryRaw`SELECT "id" FROM "LedgerAccount" WHERE "code" = ${walletCode(userId, finance.currency)} FOR UPDATE`;
        const wallet = await tx.ledgerAccount.findUnique({ where: { code: walletCode(userId, finance.currency) } });
        const availableBalance = walletAvailability(wallet.balance);
        if (availableBalance < finance.payableAmount) {
          throw new AppError('Business wallet balance is insufficient.', 409, 'INSUFFICIENT_WALLET_BALANCE', {
            required: finance.payableAmount, currentBalance: availableBalance, missing: roundMoney(finance.payableAmount - availableBalance), currency: finance.currency,
          });
        }
        const payment = await tx.payment.create({
          data: {
            collaborationId,
            type: paymentOperationType(finance.paymentType),
            compensationType: finance.paymentType,
            status: 'FUNDED',
            amount: finance.payableAmount,
            cashAmount: finance.cashAmount,
            barterEstimatedValue: finance.barterEstimatedValue,
            commissionRate: finance.commissionRate,
            commissionAmount: finance.commissionAmount,
            creatorAmount: finance.creatorAmount,
            platformFee: finance.platformFee,
            currency: finance.currency,
            provider: 'internal',
            idempotencyKey,
            fundedAt: new Date(),
            processedAt: new Date(),
            metadata: { source: 'BUSINESS_WALLET', barterDetails: finance.barterDetails },
          },
        });
        await postLedgerBatch(tx, ledgerRules.walletFunding({ payment, businessUserId: userId, creatorUserId: collaboration.creator.userId }));
        if (finance.platformFee > 0) await tx.platformRevenue.create({
          data: { paymentId: payment.id, collaborationId, source: finance.revenueSource, status: 'PENDING', amount: finance.platformFee, currency: finance.currency },
        });
        await tx.collaboration.update({ where: { id: collaborationId }, data: { status: 'IN_PROGRESS', progress: 70, version: { increment: 1 } } });
        await tx.collaborationActivity.create({ data: { collaborationId, actorId: userId, type: 'WALLET_FUNDED', message: finance.paymentType === 'BARTER' ? 'Barter platform fee was paid from the business wallet.' : 'Collaboration was funded from the business wallet.', metadata: { paymentId: payment.id, paymentType: finance.paymentType } } });
        await tx.outboxEvent.create({ data: { topic: 'payment.funded', aggregateId: payment.id, payload: { paymentId: payment.id, collaborationId, actorId: userId, paymentType: finance.paymentType } } });
        return { payment, duplicate: false };
      });
    } catch (error) {
      if (error?.code === 'P2002') {
        const collaboration = await walletRepository.collaboration(collaborationId);
        const payment = collaboration?.payments?.[0];
        if (payment) return { payment, duplicate: true };
      }
      return serializableConflict(error);
    }
  },

  async release(paymentId, { completeCollaboration = true } = {}) {
    try {
      return await walletRepository.transaction(async (tx) => {
        const payment = await tx.payment.findUnique({
          where: { id: paymentId },
          include: { collaboration: { include: { creator: { select: { userId: true } } } }, platformRevenue: true },
        });
        if (!payment) throw new AppError('Payment was not found.', 404, 'PAYMENT_NOT_FOUND');
        if (payment.status === 'RELEASED') {
          if (completeCollaboration && payment.collaboration.status !== 'COMPLETED') {
            await tx.collaboration.update({
              where: { id: payment.collaborationId },
              data: { status: 'COMPLETED', progress: 100, completedAt: new Date(), version: { increment: 1 } },
            });
            await tx.collaborationActivity.create({
              data: {
                collaborationId: payment.collaborationId,
                type: 'COLLABORATION_SETTLED',
                message: 'The business confirmed final acceptance and the collaboration was completed.',
              },
            });
          }
          return payment;
        }
        if (!['FUNDED', 'PARTIALLY_REFUNDED'].includes(payment.status)) throw new AppError('Only funded wallet payments can be released.', 409, 'PAYMENT_RELEASE_NOT_ALLOWED');
        const updated = await tx.payment.update({ where: { id: payment.id }, data: { status: 'RELEASED', releasedAt: new Date(), processedAt: new Date() } });
        await postLedgerBatch(tx, ledgerRules.walletSettlement({ payment: updated, creatorUserId: payment.collaboration.creator.userId }));
        if (payment.platformRevenue) await tx.platformRevenue.update({ where: { id: payment.platformRevenue.id }, data: { status: 'EARNED', earnedAt: new Date() } });
        if (completeCollaboration) {
          await tx.collaboration.update({ where: { id: payment.collaborationId }, data: { status: 'COMPLETED', progress: 100, completedAt: new Date(), version: { increment: 1 } } });
        }
        await tx.collaborationActivity.create({
          data: {
            collaborationId: payment.collaborationId,
            type: 'WALLET_SETTLED',
            message: completeCollaboration
              ? 'Creator earnings and platform revenue were released when the business accepted the final work.'
              : 'Approved work released creator earnings and platform revenue. Publication proof can continue separately.',
            metadata: {
              paymentId: payment.id,
              creatorAmount: Number(payment.creatorAmount),
              platformFee: Number(payment.platformFee),
              currency: payment.currency,
            },
          },
        });
        await tx.outboxEvent.create({ data: { topic: 'payment.released', aggregateId: payment.id, payload: { paymentId: payment.id, collaborationId: payment.collaborationId } } });
        return updated;
      });
    } catch (error) { return serializableConflict(error); }
  },

  async refund(userId, paymentId, payload, { admin = false } = {}) {
    const refundPolicy = await getSetting('refundPolicy');
    try {
      return await walletRepository.transaction(async (tx) => {
        const payment = await tx.payment.findUnique({
          where: { id: paymentId },
          include: {
            refundRequests: true,
            platformRevenue: true,
            collaboration: { include: { business: { select: { userId: true } }, creator: { select: { userId: true } }, deliverables: { select: { id: true }, take: 1 }, workspaceTasks: { where: { status: { in: ['IN_PROGRESS', 'REVIEW', 'DONE'] } }, select: { id: true }, take: 1 } } },
          },
        });
        if (!payment || (!admin && payment.collaboration.business.userId !== userId)) throw new AppError('Payment was not found.', 404, 'PAYMENT_NOT_FOUND');
        if (payment.provider !== 'internal' || payment.metadata?.source !== 'BUSINESS_WALLET' || payment.status === 'RELEASED') {
          throw new AppError('This wallet payment is not eligible for a refund.', 409, 'REFUND_NOT_ALLOWED');
        }
        await tx.$queryRaw`SELECT "id" FROM "Payment" WHERE "id" = ${payment.id} FOR UPDATE`;
        const alreadyRefunded = roundMoney(payment.refundRequests.filter((item) => item.status === 'REFUNDED').reduce((sum, item) => sum + Number(item.amount), 0));
        const remaining = roundMoney(Number(payment.amount) - alreadyRefunded);
        const amount = roundMoney(payload.amount || remaining);
        if (amount <= 0 || amount > remaining) throw new AppError('Refund exceeds the remaining funded amount.', 409, 'REFUND_AMOUNT_EXCEEDED');
        const workStarted = payment.collaboration.deliverables.length > 0 || payment.collaboration.workspaceTasks.length > 0;
        const policyPercent = Number(workStarted ? refundPolicy?.afterWorkPercent ?? 0 : refundPolicy?.beforeWorkPercent ?? 100);
        const policyMaximum = roundMoney(remaining * policyPercent / 100);
        if (amount > policyMaximum) throw new AppError('Requested refund exceeds the configured collaboration refund policy.', 409, 'REFUND_POLICY_LIMIT', { workStarted, policyPercent, maximum: policyMaximum, currency: payment.currency });
        const currentCreatorAmount = Number(payment.creatorAmount);
        const currentPlatformAmount = Number(payment.platformFee);
        const ratio = amount / remaining;
        const creatorAmount = amount === remaining
          ? currentCreatorAmount
          : roundMoney(Math.min(currentCreatorAmount, currentCreatorAmount * ratio));
        const platformAmount = roundMoney(amount - creatorAmount);
        if (platformAmount > currentPlatformAmount) {
          throw new AppError('Refund allocation exceeds pending platform revenue.', 409, 'INVALID_REFUND_ALLOCATION');
        }
        const refund = await tx.paymentRefund.create({
          data: { paymentId, requesterId: userId, amount, reason: payload.reason, status: 'REFUNDED', processedAt: new Date() },
        });
        await postLedgerBatch(tx, ledgerRules.walletRefund({
          refund,
          payment,
          businessUserId: payment.collaboration.business.userId,
          creatorUserId: payment.collaboration.creator.userId,
          creatorAmount,
          platformAmount,
        }));
        const full = roundMoney(alreadyRefunded + amount) === Number(payment.amount);
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: full ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
            creatorAmount: roundMoney(currentCreatorAmount - creatorAmount),
            platformFee: roundMoney(currentPlatformAmount - platformAmount),
            commissionAmount: payment.compensationType === 'BARTER' ? 0 : roundMoney(currentPlatformAmount - platformAmount),
            ...(full && { refundedAt: new Date() }),
            processedAt: new Date(),
          },
        });
        if (payment.platformRevenue && platformAmount > 0) {
          const remainingRevenue = roundMoney(Math.max(0, Number(payment.platformRevenue.amount) - platformAmount));
          await tx.platformRevenue.update({
            where: { id: payment.platformRevenue.id },
            data: full || remainingRevenue === 0
              ? { status: 'REFUNDED', amount: 0, refundedAt: new Date() }
              : { amount: remainingRevenue },
          });
        }
        if (full) await tx.collaboration.update({ where: { id: payment.collaborationId }, data: { status: 'CANCELLED', version: { increment: 1 } } });
        await tx.collaborationActivity.create({ data: { collaborationId: payment.collaborationId, actorId: userId, type: full ? 'PAYMENT_REFUNDED' : 'PAYMENT_PARTIALLY_REFUNDED', message: `${amount} ${payment.currency} was returned to the business wallet.`, metadata: { paymentId, refundId: refund.id } } });
        await tx.outboxEvent.create({ data: { topic: full ? 'payment.refunded' : 'payment.partially_refunded', aggregateId: payment.id, payload: { paymentId, refundId: refund.id, collaborationId: payment.collaborationId, amount } } });
        return { ...refund, amount };
      });
    } catch (error) { return serializableConflict(error); }
  },
};

import crypto from 'node:crypto';
import { AppError } from '../../shared/errors/AppError.js';

const money = (value) => Math.round(Number(value) * 100) / 100;

async function account(tx, { code, type, currency, ownerId = null }) {
  return tx.ledgerAccount.upsert({
    where: { code },
    update: {},
    create: { code, type, currency, ownerId },
  });
}

const canonicalBatch = (input, postings) => JSON.stringify({
  batchId: input.batchId,
  paymentId: input.paymentId || null,
  collaborationId: input.collaborationId || null,
  currency: input.currency,
  postings: postings.map((item) => ({
    type: item.type,
    amount: item.amount,
    debitAmount: item.debitAmount,
    creditAmount: item.creditAmount,
    debit: item.debit,
    credit: item.credit,
  })),
});

export function validateLedgerBatch(input) {
  if (!input?.batchId || !input.currency || !Array.isArray(input.postings)) {
    throw new AppError('Ledger batch id, currency and postings are required.', 409, 'INVALID_LEDGER_BATCH');
  }
  const postings = input.postings.map((posting) => ({
    ...posting,
    amount: money(posting.amount),
    debitAmount: money(posting.debitAmount ?? posting.amount),
    creditAmount: money(posting.creditAmount ?? posting.amount),
  }));
  if (!postings.length || postings.some((posting) => !Number.isFinite(posting.amount) || posting.amount <= 0)) {
    throw new AppError('Ledger postings require positive monetary amounts.', 409, 'INVALID_LEDGER_POSTING');
  }
  if (postings.some((posting) => !posting.type || !posting.debit?.code || !posting.debit?.type || !posting.credit?.code || !posting.credit?.type)) {
    throw new AppError('Every ledger posting requires typed debit and credit accounts.', 409, 'INVALID_LEDGER_POSTING');
  }
  const debitTotal = money(postings.reduce((sum, posting) => sum + posting.debitAmount, 0));
  const creditTotal = money(postings.reduce((sum, posting) => sum + posting.creditAmount, 0));
  if (debitTotal !== creditTotal) {
    throw new AppError('Ledger debit and credit totals do not balance.', 500, 'UNBALANCED_LEDGER_BATCH');
  }
  const fingerprint = crypto.createHash('sha256').update(canonicalBatch(input, postings)).digest('hex');
  return { postings, debitTotal, creditTotal, fingerprint };
}

export async function postLedgerBatch(tx, input) {
  const { postings, fingerprint } = validateLedgerBatch(input);
  const existing = await tx.ledgerEntry.findMany({
    where: { postingBatchId: input.batchId },
    include: { debitAccount: { select: { code: true } }, creditAccount: { select: { code: true } } },
  });
  if (existing.length) {
    const byKey = new Map(existing.map((entry) => [entry.idempotencyKey, entry]));
    const same = existing.length === postings.length && postings.every((posting, index) => {
      const entry = byKey.get(`${input.batchId}:${index}`);
      return entry
        && entry.type === posting.type
        && money(entry.amount) === posting.amount
        && entry.currency === input.currency
        && entry.debitAccount.code === posting.debit.code
        && entry.creditAccount.code === posting.credit.code
        && (!entry.metadata?.batchFingerprint || entry.metadata.batchFingerprint === fingerprint);
    });
    if (!same) throw new AppError('Ledger batch id was reused with different postings.', 409, 'LEDGER_BATCH_CONFLICT');
    return existing;
  }

  const entries = [];
  for (let index = 0; index < postings.length; index += 1) {
    const posting = postings[index];
    const debit = await account(tx, { ...posting.debit, currency: input.currency });
    const credit = await account(tx, { ...posting.credit, currency: input.currency });
    if (debit.id === credit.id) throw new AppError('A ledger posting cannot debit and credit the same account.', 500, 'INVALID_LEDGER_ACCOUNTS');
    const entry = await tx.ledgerEntry.create({
      data: {
        debitAccountId: debit.id,
        creditAccountId: credit.id,
        collaborationId: input.collaborationId || null,
        paymentId: input.paymentId || null,
        type: posting.type,
        amount: posting.amount,
        currency: input.currency,
        postingBatchId: input.batchId,
        idempotencyKey: `${input.batchId}:${index}`,
        description: posting.description,
        metadata: { ...(posting.metadata || {}), batchFingerprint: fingerprint },
      },
    });
    await tx.ledgerAccount.update({ where: { id: debit.id }, data: { balance: { increment: posting.amount } } });
    await tx.ledgerAccount.update({ where: { id: credit.id }, data: { balance: { decrement: posting.amount } } });
    entries.push(entry);
  }
  return entries;
}

export const ledgerRules = {
  walletTopUp({ eventId, topUp }) {
    return {
      batchId: `wallet-top-up:${eventId}`,
      currency: topUp.currency,
      postings: [{
        type: 'TOP_UP', amount: topUp.amount,
        debit: { code: `provider-clearing:${topUp.currency}`, type: 'PROVIDER_CLEARING' },
        credit: { code: `business-wallet:${topUp.userId}:${topUp.currency}`, type: 'BUSINESS_WALLET', ownerId: topUp.userId },
        description: 'Verified provider top-up credited to the business wallet.',
        metadata: { walletTopUpId: topUp.id },
      }],
    };
  },
  walletFunding({ payment, businessUserId, creatorUserId }) {
    const feeType = payment.compensationType === 'BARTER'
      ? 'PLATFORM_BARTER_FEE_PENDING'
      : 'PLATFORM_COMMISSION_PENDING';
    const fundingType = payment.compensationType === 'BARTER' ? 'BARTER_PLATFORM_FEE' : 'COLLABORATION_FUNDING';
    const postings = [{
      type: fundingType, amount: payment.amount,
      debit: { code: `business-wallet:${businessUserId}:${payment.currency}`, type: 'BUSINESS_WALLET', ownerId: businessUserId },
      credit: { code: `escrow:${payment.collaborationId}:${payment.currency}`, type: 'ESCROW_LIABILITY' },
      description: payment.compensationType === 'BARTER' ? 'Barter platform fee funded from the business wallet.' : 'Collaboration funded from the business wallet.',
    }];
    if (Number(payment.creatorAmount) > 0) postings.push({
      type: 'CREATOR_PENDING', amount: payment.creatorAmount,
      debit: { code: `escrow:${payment.collaborationId}:${payment.currency}`, type: 'ESCROW_LIABILITY' },
      credit: { code: `creator-pending:${creatorUserId}:${payment.currency}`, type: 'CREATOR_PENDING', ownerId: creatorUserId },
      description: 'Creator earnings recorded as pending until collaboration completion.',
    });
    if (Number(payment.platformFee) > 0) postings.push({
      type: feeType, amount: payment.platformFee,
      debit: { code: `escrow:${payment.collaborationId}:${payment.currency}`, type: 'ESCROW_LIABILITY' },
      credit: { code: `platform-pending:${payment.currency}`, type: 'PLATFORM_PENDING' },
      description: payment.compensationType === 'BARTER' ? 'Barter service fee recorded as pending revenue.' : 'Platform commission recorded as pending revenue.',
    });
    return {
      batchId: `wallet-funding:${payment.id}`,
      paymentId: payment.id,
      collaborationId: payment.collaborationId,
      currency: payment.currency,
      postings,
    };
  },
  walletSettlement({ payment, creatorUserId }) {
    const postings = [];
    if (Number(payment.creatorAmount) > 0) postings.push({
      type: 'CREATOR_RELEASE', amount: payment.creatorAmount,
      debit: { code: `creator-pending:${creatorUserId}:${payment.currency}`, type: 'CREATOR_PENDING', ownerId: creatorUserId },
      credit: { code: `creator-available:${creatorUserId}:${payment.currency}`, type: 'CREATOR_AVAILABLE', ownerId: creatorUserId },
      description: 'Completed collaboration moved creator earnings from pending to available.',
    });
    if (Number(payment.platformFee) > 0) postings.push({
      type: payment.compensationType === 'BARTER' ? 'PLATFORM_BARTER_FEE_EARNED' : 'PLATFORM_COMMISSION_EARNED',
      amount: payment.platformFee,
      debit: { code: `platform-pending:${payment.currency}`, type: 'PLATFORM_PENDING' },
      credit: { code: `platform-revenue:${payment.currency}`, type: 'PLATFORM_REVENUE' },
      description: payment.compensationType === 'BARTER' ? 'Barter service fee recognized after completion.' : 'Commission recognized after completion.',
    });
    return { batchId: `wallet-settlement:${payment.id}`, paymentId: payment.id, collaborationId: payment.collaborationId, currency: payment.currency, postings };
  },
  walletRefund({ refund, payment, businessUserId, creatorUserId, creatorAmount, platformAmount }) {
    const postings = [];
    if (creatorAmount > 0) postings.push({
      type: 'REFUND', amount: creatorAmount,
      debit: { code: `creator-pending:${creatorUserId}:${payment.currency}`, type: 'CREATOR_PENDING', ownerId: creatorUserId },
      credit: { code: `business-wallet:${businessUserId}:${payment.currency}`, type: 'BUSINESS_WALLET', ownerId: businessUserId },
      description: 'Unreleased creator funds returned to the business wallet.',
    });
    if (platformAmount > 0) postings.push({
      type: 'REFUND', amount: platformAmount,
      debit: { code: `platform-pending:${payment.currency}`, type: 'PLATFORM_PENDING' },
      credit: { code: `business-wallet:${businessUserId}:${payment.currency}`, type: 'BUSINESS_WALLET', ownerId: businessUserId },
      description: 'Pending platform revenue returned to the business wallet.',
    });
    return { batchId: `wallet-refund:${refund.id}`, paymentId: payment.id, collaborationId: payment.collaborationId, currency: payment.currency, postings };
  },
  walletDisputeSettlement({ disputeId, payment, businessUserId, creatorUserId, creatorAward, businessAward, platformFee }) {
    const originalCreatorAmount = money(payment.creatorAmount);
    const originalPlatformFee = money(payment.platformFee);
    const creatorRefund = money(Math.max(0, originalCreatorAmount - Number(creatorAward)));
    const platformRefund = money(Math.max(0, originalPlatformFee - Number(platformFee)));
    const postings = [];
    if (Number(creatorAward) > 0) postings.push({
      type: 'CREATOR_RELEASE', amount: creatorAward,
      debit: { code: `creator-pending:${creatorUserId}:${payment.currency}`, type: 'CREATOR_PENDING', ownerId: creatorUserId },
      credit: { code: `creator-available:${creatorUserId}:${payment.currency}`, type: 'CREATOR_AVAILABLE', ownerId: creatorUserId },
      description: 'Dispute award moved creator earnings from pending to available.',
      metadata: { disputeId },
    });
    if (Number(platformFee) > 0) postings.push({
      type: payment.compensationType === 'BARTER' ? 'PLATFORM_BARTER_FEE_EARNED' : 'PLATFORM_COMMISSION_EARNED',
      amount: platformFee,
      debit: { code: `platform-pending:${payment.currency}`, type: 'PLATFORM_PENDING' },
      credit: { code: `platform-revenue:${payment.currency}`, type: 'PLATFORM_REVENUE' },
      description: 'Dispute award recognized the earned platform revenue.',
      metadata: { disputeId },
    });
    if (creatorRefund > 0) postings.push({
      type: 'REFUND', amount: creatorRefund,
      debit: { code: `creator-pending:${creatorUserId}:${payment.currency}`, type: 'CREATOR_PENDING', ownerId: creatorUserId },
      credit: { code: `business-wallet:${businessUserId}:${payment.currency}`, type: 'BUSINESS_WALLET', ownerId: businessUserId },
      description: 'Dispute award returned unreleased creator funds to the business wallet.',
      metadata: { disputeId },
    });
    if (platformRefund > 0) postings.push({
      type: 'REFUND', amount: platformRefund,
      debit: { code: `platform-pending:${payment.currency}`, type: 'PLATFORM_PENDING' },
      credit: { code: `business-wallet:${businessUserId}:${payment.currency}`, type: 'BUSINESS_WALLET', ownerId: businessUserId },
      description: 'Dispute award returned unearned platform revenue to the business wallet.',
      metadata: { disputeId },
    });
    if (money(creatorRefund + platformRefund) !== money(businessAward)) {
      throw new AppError('The wallet dispute award does not balance with the funded allocation.', 409, 'INVALID_DISPUTE_ALLOCATION');
    }
    return {
      batchId: `wallet-dispute:${disputeId}`,
      paymentId: payment.id,
      collaborationId: payment.collaborationId,
      currency: payment.currency,
      postings,
    };
  },
  funding({ eventId, payment }) {
    return {
      batchId: `funding:${eventId}`,
      paymentId: payment.id,
      collaborationId: payment.collaborationId,
      currency: payment.currency,
      postings: [{
        type: 'ESCROW_FUNDED', amount: payment.amount,
        debit: { code: `provider-clearing:${payment.currency}`, type: 'PROVIDER_CLEARING' },
        credit: { code: `escrow:${payment.collaborationId}:${payment.currency}`, type: 'ESCROW_LIABILITY' },
        description: 'Verified provider funding moved into collaboration escrow.',
      }],
    };
  },
  settlement({ eventId, payment, creatorUserId, fee }) {
    const net = money(Number(payment.amount));
    const platformFee = money(fee);
    const postings = [{
      type: 'CREATOR_EARNED', amount: net,
      debit: { code: `escrow:${payment.collaborationId}:${payment.currency}`, type: 'ESCROW_LIABILITY' },
      credit: { code: `creator-payable:${creatorUserId}:${payment.currency}`, type: 'CREATOR_PAYABLE', ownerId: creatorUserId },
      description: 'Creator earning recognized after verified settlement.',
    }];
    if (platformFee > 0) postings.push({
      type: 'COMMISSION_EARNED', amount: platformFee,
      debit: { code: `escrow:${payment.collaborationId}:${payment.currency}`, type: 'ESCROW_LIABILITY' },
      credit: { code: `platform-revenue:${payment.currency}`, type: 'PLATFORM_REVENUE' },
      description: 'Platform commission recognized at settlement.',
    });
    return { batchId: `settlement:${eventId}`, paymentId: payment.id, collaborationId: payment.collaborationId, currency: payment.currency, postings };
  },
  refund({ eventId, payment, amount }) {
    return {
      batchId: `refund:${eventId}`, paymentId: payment.id, collaborationId: payment.collaborationId, currency: payment.currency,
      postings: [{
        type: 'REFUND_ISSUED', amount,
        debit: { code: `escrow:${payment.collaborationId}:${payment.currency}`, type: 'ESCROW_LIABILITY' },
        credit: { code: `refund-payable:${payment.collaborationId}:${payment.currency}`, type: 'REFUND_PAYABLE' },
        description: 'Escrow amount made payable as a refund.',
      }],
    };
  },
  payout({ eventId, payment, creatorUserId, amount }) {
    return {
      batchId: `payout:${eventId}`, paymentId: payment.id, collaborationId: payment.collaborationId, currency: payment.currency,
      postings: [{
        type: 'PAYOUT_SENT', amount,
        debit: { code: `creator-payable:${creatorUserId}:${payment.currency}`, type: 'CREATOR_PAYABLE', ownerId: creatorUserId },
        credit: { code: `provider-clearing:${payment.currency}`, type: 'PROVIDER_CLEARING' },
        description: 'Approved creator payout sent through the provider.',
      }],
    };
  },
  walletPayout({ eventId, payment, creatorUserId, amount }) {
    return {
      batchId: `wallet-payout:${eventId}`, paymentId: payment.id, collaborationId: payment.collaborationId, currency: payment.currency,
      postings: [{
        type: 'PAYOUT', amount,
        debit: { code: `creator-available:${creatorUserId}:${payment.currency}`, type: 'CREATOR_AVAILABLE', ownerId: creatorUserId },
        credit: { code: `provider-clearing:${payment.currency}`, type: 'PROVIDER_CLEARING' },
        description: 'Approved creator payout deducted from available earnings.',
      }],
    };
  },
};

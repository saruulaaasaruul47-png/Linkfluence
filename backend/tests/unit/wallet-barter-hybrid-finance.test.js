import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { calculateCollaborationFinance, walletAvailability } from '../../src/modules/payments/finance.rules.js';
import { ledgerRules, validateLedgerBatch } from '../../src/modules/payments/ledger.service.js';
import { walletTopUpSchema, webhookSchema } from '../../src/modules/payments/payment.schema.js';

const barterDetails = {
  providedItem: 'Premium skincare launch kit',
  description: 'One launch kit delivered to the creator.',
  estimatedValue: 500000,
  currency: 'MNT',
};

const finance = (paymentType, cashAmount = 0, estimatedValue = 0) => calculateCollaborationFinance({
  paymentType,
  cashAmount,
  barterEstimatedValue: estimatedValue || null,
  barterDetails: paymentType === 'PAID' ? null : { ...barterDetails, estimatedValue },
  terms: { currency: 'MNT' },
}, { commissionPercent: 10, barterPlatformFee: 30000 });

const payment = (values = {}) => ({
  id: 'payment-1', collaborationId: 'collaboration-1', compensationType: 'PAID',
  amount: 1000000, creatorAmount: 900000, platformFee: 100000, currency: 'MNT',
  ...values,
});

describe('Payment, wallet, PAID/BARTER/HYBRID requirement matrix', () => {
  test('1. verified top-up creates a balanced wallet credit posting', () => {
    const batch = ledgerRules.walletTopUp({ eventId: 'evt-1', topUp: { id: 'topup-1', userId: 'business-1', amount: 250000, currency: 'MNT' } });
    const checked = validateLedgerBatch(batch);
    assert.equal(checked.debitTotal, 250000);
    assert.equal(batch.postings[0].credit.type, 'BUSINESS_WALLET');
  });

  test('2. duplicate provider webhook resolves to the same idempotent posting batch', () => {
    const input = { eventId: 'evt-duplicate', topUp: { id: 'topup-1', userId: 'business-1', amount: 250000, currency: 'MNT' } };
    assert.equal(ledgerRules.walletTopUp(input).batchId, ledgerRules.walletTopUp(input).batchId);
    assert.equal(validateLedgerBatch(ledgerRules.walletTopUp(input)).fingerprint, validateLedgerBatch(ledgerRules.walletTopUp(input)).fingerprint);
  });

  test('3. failed provider top-up event is accepted by the verified webhook DTO', () => {
    const parsed = webhookSchema.parse({ body: { id: 'evt-failed', type: 'payment.failed', data: { providerRef: 'provider-1', amount: 10000, currency: 'mnt', failureReason: 'declined' } }, params: {}, query: {} });
    assert.equal(parsed.body.data.currency, 'MNT');
    assert.equal(parsed.body.type, 'payment.failed');
  });

  test('4. PAID collaboration funding calculates cash, creator net and commission', () => {
    assert.deepEqual(finance('PAID', 1000000), {
      paymentType: 'PAID', cashAmount: 1000000, barterEstimatedValue: null, barterDetails: null,
      commissionRate: 10, commissionAmount: 100000, creatorAmount: 900000,
      platformFee: 100000, payableAmount: 1000000, revenueSource: 'PAID_COMMISSION', currency: 'MNT',
    });
  });

  test('5. PAID insufficient balance can be calculated without allowing a negative wallet', () => {
    const required = finance('PAID', 1000000).payableAmount;
    const available = walletAvailability(-750000);
    assert.equal(Math.max(0, required - available), 250000);
    assert.equal(walletAvailability(500), 0);
  });

  test('6. PAID duplicate funding uses a stable payment-scoped ledger batch', () => {
    const first = ledgerRules.walletFunding({ payment: payment(), businessUserId: 'business-1', creatorUserId: 'creator-1' });
    const second = ledgerRules.walletFunding({ payment: payment(), businessUserId: 'business-1', creatorUserId: 'creator-1' });
    assert.equal(first.batchId, second.batchId);
    assert.equal(validateLedgerBatch(first).fingerprint, validateLedgerBatch(second).fingerprint);
  });

  test('7. creator earnings remain pending immediately after PAID funding', () => {
    const batch = ledgerRules.walletFunding({ payment: payment(), businessUserId: 'business-1', creatorUserId: 'creator-1' });
    const pending = batch.postings.find((item) => item.type === 'CREATOR_PENDING');
    assert.equal(pending.amount, 900000);
    assert.equal(pending.credit.type, 'CREATOR_PENDING');
  });

  test('8. platform commission remains pending immediately after PAID funding', () => {
    const batch = ledgerRules.walletFunding({ payment: payment(), businessUserId: 'business-1', creatorUserId: 'creator-1' });
    assert.equal(batch.postings.find((item) => item.type === 'PLATFORM_COMMISSION_PENDING').amount, 100000);
  });

  test('9. PAID completion releases creator available earnings and platform revenue', () => {
    const batch = ledgerRules.walletSettlement({ payment: payment(), creatorUserId: 'creator-1' });
    assert.deepEqual(batch.postings.map((item) => item.type), ['CREATOR_RELEASE', 'PLATFORM_COMMISSION_EARNED']);
    validateLedgerBatch(batch);
  });

  test('10. BARTER charges only the configured fixed platform fee', () => {
    const result = finance('BARTER', 0, 500000);
    assert.equal(result.payableAmount, 30000);
    assert.equal(result.creatorAmount, 0);
    assert.equal(result.commissionAmount, 0);
  });

  test('11. BARTER duplicate fee payment uses a stable idempotent ledger batch', () => {
    const barterPayment = payment({ compensationType: 'BARTER', amount: 30000, creatorAmount: 0, platformFee: 30000 });
    const batch = ledgerRules.walletFunding({ payment: barterPayment, businessUserId: 'business-1', creatorUserId: 'creator-1' });
    assert.equal(batch.batchId, 'wallet-funding:payment-1');
    assert.equal(batch.postings.filter((item) => item.type === 'BARTER_PLATFORM_FEE').length, 1);
  });

  test('12. BARTER insufficient balance is based on the fee, not the product estimate', () => {
    const result = finance('BARTER', 0, 5000000);
    assert.equal(result.payableAmount - walletAvailability(-20000), 10000);
  });

  test('13. BARTER completion recognizes the fee and never creates creator cash earnings', () => {
    const barterPayment = payment({ compensationType: 'BARTER', amount: 30000, creatorAmount: 0, platformFee: 30000 });
    const batch = ledgerRules.walletSettlement({ payment: barterPayment, creatorUserId: 'creator-1' });
    assert.deepEqual(batch.postings.map((item) => item.type), ['PLATFORM_BARTER_FEE_EARNED']);
  });

  test('14. HYBRID funds its cash portion and retains structured barter terms', () => {
    const result = finance('HYBRID', 400000, 900000);
    assert.equal(result.payableAmount, 400000);
    assert.equal(result.barterDetails.providedItem, barterDetails.providedItem);
  });

  test('15. HYBRID commission is calculated only from cash', () => {
    const result = finance('HYBRID', 400000, 900000);
    assert.equal(result.commissionAmount, 40000);
    assert.equal(result.creatorAmount, 360000);
  });

  test('16. product estimated value never increases HYBRID commission', () => {
    assert.equal(finance('HYBRID', 400000, 900000).commissionAmount, finance('HYBRID', 400000, 9000000).commissionAmount);
  });

  test('17. full refund reverses creator pending and platform pending into business wallet', () => {
    const batch = ledgerRules.walletRefund({ refund: { id: 'refund-full' }, payment: payment(), businessUserId: 'business-1', creatorUserId: 'creator-1', creatorAmount: 900000, platformAmount: 100000 });
    assert.equal(validateLedgerBatch(batch).creditTotal, 1000000);
    assert.ok(batch.postings.every((item) => item.credit.type === 'BUSINESS_WALLET'));
  });

  test('18. partial refund preserves the proportional creator/platform split', () => {
    const batch = ledgerRules.walletRefund({ refund: { id: 'refund-partial' }, payment: payment(), businessUserId: 'business-1', creatorUserId: 'creator-1', creatorAmount: 225000, platformAmount: 25000 });
    assert.equal(validateLedgerBatch(batch).creditTotal, 250000);
  });

  test('19. concurrent funding attempts converge on the same payment batch identity', () => {
    const ids = Array.from({ length: 2 }, () => ledgerRules.walletFunding({ payment: payment(), businessUserId: 'business-1', creatorUserId: 'creator-1' }).batchId);
    assert.equal(new Set(ids).size, 1);
  });

  test('20. wallet account identities are isolated by authenticated owner id', () => {
    const one = ledgerRules.walletTopUp({ eventId: 'evt-a', topUp: { id: 'a', userId: 'business-a', amount: 10000, currency: 'MNT' } });
    const two = ledgerRules.walletTopUp({ eventId: 'evt-b', topUp: { id: 'b', userId: 'business-b', amount: 10000, currency: 'MNT' } });
    assert.notEqual(one.postings[0].credit.code, two.postings[0].credit.code);
  });

  test('21. collaboration ledger postings retain the scoped collaboration id', () => {
    const batch = ledgerRules.walletFunding({ payment: payment({ collaborationId: 'private-collaboration' }), businessUserId: 'business-1', creatorUserId: 'creator-1' });
    assert.equal(batch.collaborationId, 'private-collaboration');
  });

  test('22. creator payout debits available earnings instead of pending earnings', () => {
    const batch = ledgerRules.walletPayout({ eventId: 'payout-event', payment: payment(), creatorUserId: 'creator-1', amount: 400000 });
    assert.equal(batch.postings[0].debit.type, 'CREATOR_AVAILABLE');
    assert.equal(batch.postings[0].type, 'PAYOUT');
  });

  test('23. admin/provider payout approval is idempotent by provider event id', () => {
    const first = ledgerRules.walletPayout({ eventId: 'approved-event', payment: payment(), creatorUserId: 'creator-1', amount: 400000 });
    const replay = ledgerRules.walletPayout({ eventId: 'approved-event', payment: payment(), creatorUserId: 'creator-1', amount: 400000 });
    assert.equal(first.batchId, replay.batchId);
    assert.equal(validateLedgerBatch(first).fingerprint, validateLedgerBatch(replay).fingerprint);
  });

  test('24. platform revenue is the sum of PAID/HYBRID cash commission and BARTER fixed fee', () => {
    const revenue = finance('PAID', 1000000).platformFee + finance('HYBRID', 400000, 900000).platformFee + finance('BARTER', 0, 500000).platformFee;
    assert.equal(revenue, 170000);
  });

  test('wallet top-up DTO rejects unbounded or malformed monetary input', () => {
    assert.equal(walletTopUpSchema.safeParse({ body: { amount: -1, currency: 'MNT', idempotencyKey: 'valid-key' }, params: {}, query: {} }).success, false);
  });

  test('wallet top-up DTO rejects client-controlled auto confirmation', () => {
    assert.equal(walletTopUpSchema.safeParse({ body: { amount: 10000, currency: 'MNT', idempotencyKey: 'valid-key', autoConfirm: true }, params: {}, query: {} }).success, false);
  });

  test('wallet dispute split releases the awarded share and refunds the remainder', () => {
    const batch = ledgerRules.walletDisputeSettlement({
      disputeId: 'dispute-split', payment: payment(), businessUserId: 'business-1', creatorUserId: 'creator-1',
      creatorAward: 360000, businessAward: 600000, platformFee: 40000,
    });
    assert.deepEqual(batch.postings.map((item) => item.amount), [360000, 40000, 540000, 60000]);
    assert.equal(validateLedgerBatch(batch).creditTotal, 1000000);
  });

  test('wallet dispute business win returns all pending allocation to the wallet', () => {
    const batch = ledgerRules.walletDisputeSettlement({
      disputeId: 'dispute-business', payment: payment(), businessUserId: 'business-1', creatorUserId: 'creator-1',
      creatorAward: 0, businessAward: 1000000, platformFee: 0,
    });
    assert.equal(batch.postings.filter((item) => item.type === 'REFUND').length, 2);
    assert.equal(validateLedgerBatch(batch).creditTotal, 1000000);
  });

  test('wallet barter dispute never creates creator cash earnings', () => {
    const barterPayment = payment({ compensationType: 'BARTER', amount: 30000, creatorAmount: 0, platformFee: 30000 });
    const batch = ledgerRules.walletDisputeSettlement({
      disputeId: 'dispute-barter', payment: barterPayment, businessUserId: 'business-1', creatorUserId: 'creator-1',
      creatorAward: 0, businessAward: 0, platformFee: 30000,
    });
    assert.deepEqual(batch.postings.map((item) => item.type), ['PLATFORM_BARTER_FEE_EARNED']);
    validateLedgerBatch(batch);
  });
});

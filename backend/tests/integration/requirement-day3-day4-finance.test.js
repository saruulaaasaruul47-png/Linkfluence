import 'dotenv/config';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET ||= 'test-access-secret-with-at-least-32-characters';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-with-at-least-32-characters';
process.env.JWT_PASSWORD_RESET_SECRET ||= 'test-reset-secret-with-at-least-32-characters';
process.env.PAYMENT_WEBHOOK_SECRET ||= 'test-payment-webhook-secret-32-characters';

const { ledgerRules } = await import('../../src/modules/payments/ledger.service.js');
const { calculateDisputeAward } = await import('../../src/modules/disputes/dispute.service.js');

const payment = { id: 'payment-1', collaborationId: 'collaboration-1', amount: 1_000_000, currency: 'MNT' };

describe('Requirement Day 3 ledger and Day 4 dispute invariants', () => {
  test('defines the five required balanced ledger scenarios', () => {
    const funding = ledgerRules.funding({ eventId: 'fund', payment });
    const settlement = ledgerRules.settlement({ eventId: 'settle', payment: { ...payment, amount: 900_000 }, creatorUserId: 'creator-1', fee: 100_000 });
    const refund = ledgerRules.refund({ eventId: 'refund', payment, amount: 250_000 });
    const payout = ledgerRules.payout({ eventId: 'payout', payment, creatorUserId: 'creator-1', amount: 900_000 });
    const postings = [...funding.postings, ...settlement.postings, ...refund.postings, ...payout.postings];
    assert.deepEqual(postings.map((item) => item.type), ['ESCROW_FUNDED', 'CREATOR_EARNED', 'COMMISSION_EARNED', 'REFUND_ISSUED', 'PAYOUT_SENT']);
    assert.ok(postings.every((item) => item.amount > 0 && item.debit.code !== item.credit.code));
    assert.equal(settlement.postings.reduce((sum, item) => sum + item.amount, 0), 1_000_000);
  });

  test('calculates creator-wins award without leaking escrow cents', () => {
    assert.deepEqual(calculateDisputeAward({ total: 1_000_000, fee: 100_000, award: 'CREATOR_WINS' }), { creatorPercent: 100, creatorAward: 900_000, businessAward: 0, platformFee: 100_000 });
  });

  test('calculates business-wins award without platform commission', () => {
    assert.deepEqual(calculateDisputeAward({ total: 1_000_000, fee: 100_000, award: 'BUSINESS_WINS' }), { creatorPercent: 0, creatorAward: 0, businessAward: 1_000_000, platformFee: 0 });
  });

  test('calculates a proportional split award', () => {
    assert.deepEqual(calculateDisputeAward({ total: 1_000_000, fee: 100_000, award: 'SPLIT', creatorPercent: 40 }), { creatorPercent: 40, creatorAward: 360_000, businessAward: 600_000, platformFee: 40_000 });
  });
});

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { describe, test } from 'node:test';
import { assertRequiredDisclosure } from '../../src/modules/content/content.service.js';
import { validateLedgerBatch } from '../../src/modules/payments/ledger.service.js';
import { assertPaymentsUnfrozen } from '../../src/modules/payments/payment-freeze.policy.js';
import { PAYMENT_CAPABILITIES, assertPaymentProvider, requirePaymentCapability } from '../../src/modules/payments/providers/payment-provider.port.js';
import { mockPaymentProvider } from '../../src/modules/payments/providers/mock.provider.js';
import { qpayPaymentProvider } from '../../src/modules/payments/providers/qpay.provider.js';
import { createStripePaymentProvider, stripeMajorAmount, stripeMinorAmount, stripePaymentProvider, verifyStripeSignature } from '../../src/modules/payments/providers/stripe.provider.js';

const posting = (amount, extra = {}) => ({
  type: 'TEST_POSTING', amount,
  debit: { code: 'cash:MNT', type: 'ASSET' },
  credit: { code: 'escrow:MNT', type: 'LIABILITY' },
  ...extra,
});
const batch = (postings) => ({ batchId: 'day5-batch', currency: 'MNT', postings });

describe('Requirement Day 5 payment and disclosure hardening', () => {
  test('validates the explicit mock provider contract', () => assert.equal(assertPaymentProvider(mockPaymentProvider).name, 'mock'));
  test('rejects providers without a typed capability contract', () => assert.throws(() => assertPaymentProvider({ createIntent() {} }), TypeError));
  test('declares mock funding, refund, payout and webhook capabilities', () => assert.deepEqual(mockPaymentProvider.capabilities, { funding: true, refund: true, payout: true, webhook: true }));
  test('declares QPay funding but never fakes refund or payout support', () => assert.deepEqual(qpayPaymentProvider.capabilities, { funding: true, refund: false, payout: false, webhook: true }));
  test('declares Stripe Checkout and refund support without pretending Connect payout exists', () => assert.deepEqual(stripePaymentProvider.capabilities, { funding: true, refund: true, payout: false, webhook: true }));
  test('blocks an unsupported Stripe payout with a stable capability error', () => assert.throws(() => requirePaymentCapability(stripePaymentProvider, PAYMENT_CAPABILITIES.PAYOUT), { code: 'PAYMENT_PROVIDER_OPERATION_UNSUPPORTED' }));
  test('QPay without credentials fails closed before a network request', async () => assert.rejects(() => qpayPaymentProvider.createFundingIntent({ paymentId: 'p1', amount: 1000, currency: 'MNT' }), { code: 'QPAY_NOT_CONFIGURED' }));
  test('Stripe without credentials fails closed before a network request', async () => {
    const unconfiguredStripe = createStripePaymentProvider({ secretKey: '', webhookSecret: '', clientUrl: 'http://localhost:5173' });
    await assert.rejects(() => unconfiguredStripe.createFundingIntent({ paymentId: 'p1', amount: 1000, currency: 'MNT' }), { code: 'STRIPE_NOT_CONFIGURED' });
  });
  test('converts MNT and USD to Stripe minor units', () => { assert.equal(stripeMinorAmount(1900000, 'MNT'), 190000000); assert.equal(stripeMinorAmount(10.25, 'USD'), 1025); });
  test('keeps Stripe zero-decimal currency amounts unchanged', () => assert.equal(stripeMinorAmount(500, 'JPY'), 500));
  test('round-trips Stripe amount conversion', () => assert.equal(stripeMajorAmount(stripeMinorAmount(1234.56, 'MNT'), 'MNT'), 1234.56));
  test('normalizes a successful Stripe Checkout event to the internal funding event', () => {
    const event = stripePaymentProvider.normalizeEvent({ id: 'evt_1', type: 'checkout.session.completed', created: 1700000000, data: { object: { id: 'cs_1', amount_total: 250000, currency: 'mnt', payment_status: 'paid' } } });
    assert.deepEqual(event.data, { providerRef: 'cs_1', amount: 2500, currency: 'MNT' });
    assert.equal(event.type, 'funding.succeeded');
  });
  test('normalizes successful Stripe refunds using the refund provider reference', () => {
    const event = stripePaymentProvider.normalizeEvent({ id: 'evt_2', type: 'refund.updated', data: { object: { id: 're_1', status: 'succeeded', amount: 50000, currency: 'mnt' } } });
    assert.deepEqual(event.data, { providerRef: 're_1', amount: 500, currency: 'MNT' });
    assert.equal(event.type, 'refund.succeeded');
  });
  test('rejects Stripe event types that are not part of the money state machine', () => assert.throws(() => stripePaymentProvider.normalizeEvent({ id: 'evt_3', type: 'customer.created', data: { object: { id: 'cus_1' } } }), { code: 'INVALID_PAYMENT_TRANSITION' }));
  test('does not normalize an unpaid completed Stripe Checkout session as wallet money', () => assert.throws(() => stripePaymentProvider.normalizeEvent({ id: 'evt_unpaid', type: 'checkout.session.completed', data: { object: { id: 'cs_unpaid', amount_total: 1000, currency: 'mnt', payment_status: 'unpaid' } } }), { code: 'STRIPE_PAYMENT_NOT_CONFIRMED' }));
  test('accepts an authentic Stripe webhook inside the replay window', () => {
    const body = Buffer.from('{"id":"evt_signed"}'); const timestamp = 1700000000; const secret = 'whsec_day5_test_secret';
    const signature = crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
    assert.equal(verifyStripeSignature(body, `t=${timestamp},v1=${signature}`, timestamp * 1000, secret), true);
  });
  test('rejects a tampered or expired Stripe webhook signature', () => {
    const body = Buffer.from('{"id":"evt_signed"}'); const timestamp = 1700000000; const secret = 'whsec_day5_test_secret';
    const signature = crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
    assert.equal(verifyStripeSignature(Buffer.from('{"id":"tampered"}'), `t=${timestamp},v1=${signature}`, timestamp * 1000, secret), false);
    assert.equal(verifyStripeSignature(body, `t=${timestamp},v1=${signature}`, (timestamp + 301) * 1000, secret), false);
  });
  test('property-checks 100 generated ledger batches as exactly balanced', () => {
    for (let value = 1; value <= 100; value += 1) {
      const result = validateLedgerBatch(batch([posting(value / 10), posting(value * 13.37)]));
      assert.equal(result.debitTotal, result.creditTotal);
    }
  });
  test('rejects a ledger batch whose debit and credit totals differ', () => assert.throws(() => validateLedgerBatch(batch([posting(100, { debitAmount: 100, creditAmount: 99 })])), { code: 'UNBALANCED_LEDGER_BATCH' }));
  test('freezes payment operations for a disputed collaboration state', async () => {
    const db = { collaboration: { findUnique: async () => ({ status: 'DISPUTED' }) }, trustCase: { findFirst: async () => null } };
    await assert.rejects(() => assertPaymentsUnfrozen(db, 'c1'), { code: 'PAYMENT_FROZEN_BY_DISPUTE' });
  });
  test('freezes payment operations when an active trust case exists', async () => {
    const db = { collaboration: { findUnique: async () => ({ status: 'IN_PROGRESS' }) }, trustCase: { findFirst: async () => ({ id: 'case1' }) } };
    await assert.rejects(() => assertPaymentsUnfrozen(db, 'c1'), { code: 'PAYMENT_FROZEN_BY_DISPUTE' });
  });
  test('allows money operations only when collaboration and trust-case state are clear', async () => {
    const db = { collaboration: { findUnique: async () => ({ status: 'IN_PROGRESS' }) }, trustCase: { findFirst: async () => null } };
    await assert.doesNotReject(() => assertPaymentsUnfrozen(db, 'c1'));
  });
  test('prevents a required paid-partnership disclosure from being bypassed', () => assert.throws(() => assertRequiredDisclosure({ status: 'PUBLISHED', paidPartnership: false }, { contract: { disclosureRequired: true } }), { code: 'PARTNERSHIP_DISCLOSURE_REQUIRED' }));
  test('allows publishing after the required paid-partnership disclosure is confirmed', () => assert.doesNotThrow(() => assertRequiredDisclosure({ status: 'PUBLISHED', paidPartnership: true }, { contract: { disclosureRequired: true } })));
});

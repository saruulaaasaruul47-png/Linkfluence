import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  assertCollaborationTransition,
  canTransitionCollaboration,
  COLLABORATION_TRANSITIONS,
} from '../../src/modules/collaborations/collaboration.state.js';
import { contractSnapshotFromTerms } from '../../src/modules/contracts/contract.snapshot.js';
import {
  emailDomain,
  isReservedEmailRecipient,
  shouldUseLocalEmailDelivery,
} from '../../src/infrastructure/email/email.policy.js';

describe('Requirement Day 1 collaboration state matrix', () => {
  test('defines every lifecycle state and permits the intended production path', () => {
    const path = [
      'NEGOTIATION', 'AGREEMENT_REVIEW', 'CONTRACT_REVIEW', 'PAYMENT_PENDING',
      'IN_PROGRESS', 'PUBLISHED', 'PROVEN', 'SETTLEMENT_PENDING', 'COMPLETED',
    ];
    for (let index = 0; index < path.length - 1; index += 1) {
      assert.equal(canTransitionCollaboration(path[index], path[index + 1]), true);
      assert.doesNotThrow(() => assertCollaborationTransition(path[index], path[index + 1]));
    }
    for (const state of ['DISPUTED', 'CANCELLED', 'IN_REVIEW']) {
      assert.ok(Object.hasOwn(COLLABORATION_TRANSITIONS, state));
    }
  });

  test('rejects at least twelve unsafe lifecycle jumps with a stable conflict code', () => {
    const invalid = [
      ['NEGOTIATION', 'COMPLETED'],
      ['NEGOTIATION', 'PAYMENT_PENDING'],
      ['AGREEMENT_REVIEW', 'IN_PROGRESS'],
      ['CONTRACT_REVIEW', 'COMPLETED'],
      ['PAYMENT_PENDING', 'PROVEN'],
      ['IN_PROGRESS', 'SETTLEMENT_PENDING'],
      ['IN_REVIEW', 'PROVEN'],
      ['PUBLISHED', 'COMPLETED'],
      ['PROVEN', 'COMPLETED'],
      ['SETTLEMENT_PENDING', 'IN_PROGRESS'],
      ['COMPLETED', 'IN_PROGRESS'],
      ['CANCELLED', 'NEGOTIATION'],
      ['UNKNOWN', 'NEGOTIATION'],
    ];
    for (const [from, to] of invalid) {
      assert.equal(canTransitionCollaboration(from, to), false);
      assert.throws(
        () => assertCollaborationTransition(from, to),
        (error) => error.statusCode === 409
          && error.code === 'INVALID_COLLABORATION_TRANSITION'
          && error.details.from === from
          && error.details.to === to,
      );
    }
  });

  test('normalizes mutable agreement terms into bounded typed contract fields', () => {
    const snapshot = contractSnapshotFromTerms({
      revisionLimit: '50 revision rounds',
      publishDate: '2026-09-01T00:00:00.000Z',
      retentionDays: 0,
      disputeWindowDays: 120,
      paidPartnershipDisclosure: false,
    });
    assert.equal(snapshot.revisionLimit, 20);
    assert.equal(snapshot.retentionDays, 1);
    assert.equal(snapshot.disputeWindowDays, 90);
    assert.equal(snapshot.disclosureRequired, false);
    assert.equal(snapshot.publishBy.toISOString(), '2026-09-01T00:00:00.000Z');
  });

  test('keeps reserved development recipients away from Resend', () => {
    assert.equal(emailDomain('Demo.User@Example.COM'), 'example.com');
    assert.equal(isReservedEmailRecipient('demo@example.com'), true);
    assert.equal(isReservedEmailRecipient('demo@subdomain.test'), true);
    assert.equal(shouldUseLocalEmailDelivery('development', 'demo@example.com'), true);
    assert.equal(shouldUseLocalEmailDelivery('production', 'demo@example.com'), false);
    assert.equal(shouldUseLocalEmailDelivery('development', 'real-user@gmail.com'), false);
  });
});

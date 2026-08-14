import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  conversationIdSchema,
  messageDeleteSchema,
  sendMessageSchema,
} from '../../src/modules/messaging/messaging.schema.js';

const envelope = (body = {}, params = {}, query = {}) => ({ body, params, query });

describe('Messaging identifier and message validation', () => {
  test('accepts deterministic seeded conversation identifiers', () => {
    const result = conversationIdSchema.safeParse(envelope({}, { id: 'seed_conversation_gobi_amara' }));
    assert.equal(result.success, true);
  });

  test('accepts a text message for a seeded conversation', () => {
    const result = sendMessageSchema.safeParse(envelope(
      { body: 'Hello from the seeded GOBI conversation.' },
      { id: 'seed_conversation_gobi_amara' },
    ));
    assert.equal(result.success, true);
  });

  test('accepts seeded message identifiers for mutations', () => {
    const result = messageDeleteSchema.safeParse(envelope({}, {
      id: 'seed_conversation_gobi_amara',
      messageId: 'seed_message_gobi_1',
    }));
    assert.equal(result.success, true);
  });

  test('still rejects malformed identifiers and empty messages', () => {
    assert.equal(conversationIdSchema.safeParse(envelope({}, { id: '../conversation' })).success, false);
    assert.equal(sendMessageSchema.safeParse(envelope({}, { id: 'seed_conversation_gobi_amara' })).success, false);
  });
});

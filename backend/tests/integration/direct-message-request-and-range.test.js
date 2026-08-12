import 'dotenv/config';
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET ||= 'test-access-secret-with-at-least-32-characters';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-with-at-least-32-characters';
process.env.JWT_PASSWORD_RESET_SECRET ||= 'test-reset-secret-with-at-least-32-characters';

const { app } = await import('../../src/app.js');
const { prisma } = await import('../../src/config/database.js');
const { getTestVerificationCode } = await import('../../src/modules/auth/auth.email.js');

const stamp = Date.now();
const prefix = `direct-message-${stamp}`;
const password = 'Password123!';
let businessAccount;
let creatorAccount;
let business;
let creator;
let messageRequestId;
let conversationId;

const client = (token) => ({
  get: (url) => request(app).get(url).set('Authorization', `Bearer ${token}`),
  post: (url) => request(app).post(url).set('Authorization', `Bearer ${token}`),
});

async function createAccount(label) {
  const email = `${prefix}-${label}@example.com`;
  const registered = await request(app).post('/api/v1/auth/register').send({
    email,
    displayName: `${label} direct message user`,
    password,
  });
  assert.equal(registered.status, 201);
  const verified = await request(app).post('/api/v1/auth/verify-email').send({
    email,
    otp: getTestVerificationCode(email),
  });
  assert.equal(verified.status, 200);
  const user = await prisma.user.findUnique({ where: { email } });
  return { email, user, token: verified.body.data.accessToken };
}

async function cleanup() {
  const users = await prisma.user.findMany({ where: { email: { startsWith: prefix } }, select: { id: true } });
  const userIds = users.map((item) => item.id);
  if (!userIds.length) return;
  const requests = await prisma.messageRequest.findMany({
    where: { OR: [{ senderId: { in: userIds } }, { recipientId: { in: userIds } }] },
    select: { id: true, conversationId: true },
  });
  const memberships = await prisma.conversationMember.findMany({ where: { userId: { in: userIds } }, select: { conversationId: true } });
  const conversationIds = [...new Set([...requests.map((item) => item.conversationId), ...memberships.map((item) => item.conversationId)].filter(Boolean))];
  await prisma.messageRequest.deleteMany({ where: { OR: [{ senderId: { in: userIds } }, { recipientId: { in: userIds } }] } });
  if (conversationIds.length) {
    await prisma.message.deleteMany({ where: { conversationId: { in: conversationIds } } });
    await prisma.conversationMember.deleteMany({ where: { conversationId: { in: conversationIds } } });
    await prisma.conversation.deleteMany({ where: { id: { in: conversationIds } } });
  }
  await prisma.outboxEvent.deleteMany({ where: { aggregateId: { in: requests.map((item) => item.id) } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

before(async () => {
  await cleanup();
  businessAccount = await createAccount('business');
  creatorAccount = await createAccount('creator');
  business = await prisma.businessProfile.create({
    data: { userId: businessAccount.user.id, companyName: 'Direct Business', slug: `${prefix}-business` },
  });
  creator = await prisma.creatorProfile.create({
    data: { userId: creatorAccount.user.id, channelName: 'Direct Creator', slug: `${prefix}-creator` },
  });
});

after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe('Workspace-free message requests and dashboard date ranges', () => {
  test('business sends a gated request to a creator without a collaboration', async () => {
    const response = await client(businessAccount.token).post('/api/v1/conversations/requests').send({
      recipientType: 'CREATOR',
      recipientId: creator.slug,
      message: 'Hello, we would like to discuss a possible creator partnership.',
    });
    assert.equal(response.status, 201);
    assert.equal(response.body.data.existing, false);
    assert.equal(response.body.data.request.status, 'PENDING');
    assert.equal(response.body.data.request.direction, 'OUTGOING');
    messageRequestId = response.body.data.request.id;

    const conversations = await client(businessAccount.token).get('/api/v1/conversations');
    assert.equal(conversations.status, 200);
    assert.equal(conversations.body.data.items.length, 0);
  });

  test('only the recipient sees and can approve the incoming request', async () => {
    const inbox = await client(creatorAccount.token).get('/api/v1/conversations/requests?box=incoming');
    assert.equal(inbox.status, 200);
    assert.equal(inbox.body.data.items[0].id, messageRequestId);
    assert.equal(inbox.body.data.items[0].peer.name, businessAccount.user.displayName);

    const forbidden = await client(businessAccount.token).post(`/api/v1/conversations/requests/${messageRequestId}/decision`).send({ action: 'ACCEPT' });
    assert.equal(forbidden.status, 404);

    const accepted = await client(creatorAccount.token).post(`/api/v1/conversations/requests/${messageRequestId}/decision`).send({ action: 'ACCEPT' });
    assert.equal(accepted.status, 200);
    assert.equal(accepted.body.data.request.status, 'ACCEPTED');
    conversationId = accepted.body.data.request.conversationId;
    assert.ok(conversationId);
  });

  test('approval creates one direct conversation and preserves the introduction', async () => {
    for (const account of [businessAccount, creatorAccount]) {
      const conversations = await client(account.token).get('/api/v1/conversations');
      assert.equal(conversations.status, 200);
      assert.ok(conversations.body.data.items.some((item) => item.id === conversationId));
    }
    const messages = await client(creatorAccount.token).get(`/api/v1/conversations/${conversationId}/messages`);
    assert.equal(messages.status, 200);
    assert.equal(messages.body.data.items[0].body, 'Hello, we would like to discuss a possible creator partnership.');

    const reply = await client(creatorAccount.token).post(`/api/v1/conversations/${conversationId}/messages`).send({ body: 'Thanks, let us discuss the brief.' });
    assert.equal(reply.status, 201);
    assert.equal(reply.body.data.message.body, 'Thanks, let us discuss the brief.');
  });

  test('duplicate request reuses the accepted direct conversation', async () => {
    const duplicate = await client(businessAccount.token).post('/api/v1/conversations/requests').send({
      recipientType: 'CREATOR', recipientId: creator.id, message: 'This should reuse the existing conversation.',
    });
    assert.equal(duplicate.status, 201);
    assert.equal(duplicate.body.data.existing, true);
    assert.equal(duplicate.body.data.conversationId, conversationId);
    const key = [businessAccount.user.id, creatorAccount.user.id].sort().join(':');
    assert.equal(await prisma.conversation.count({ where: { directKey: key } }), 1);
  });

  test('analytics accepts 1D, 7D, 1M, 1Y and ALL dashboard filters', async () => {
    for (const range of ['1D', '7D', '1M', '1Y', 'ALL']) {
      const response = await client(creatorAccount.token).get(`/api/v1/analytics/summary?role=creator&range=${range}`);
      assert.equal(response.status, 200);
      assert.equal(response.body.data.range, range);
    }
  });
});

import 'dotenv/config';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { after, before, describe, test } from 'node:test';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET ||= 'test-access-secret-with-at-least-32-characters';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-with-at-least-32-characters';
process.env.JWT_PASSWORD_RESET_SECRET ||= 'test-reset-secret-with-at-least-32-characters';
process.env.SOCIAL_PROVIDER_MODE = 'sandbox';
process.env.SOCIAL_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
process.env.META_APP_SECRET = 'test-meta-app-secret';
process.env.META_WEBHOOK_VERIFY_TOKEN = 'test-meta-webhook-verify-token-32-characters';

const { app } = await import('../../src/app.js');
const { prisma } = await import('../../src/config/database.js');
const { getTestVerificationCode } = await import('../../src/modules/auth/auth.email.js');
const { decryptSocialToken, encryptSocialToken } = await import('../../src/modules/social-sync/token-encryption.js');
const { metaWebhookService } = await import('../../src/modules/social-sync/meta-webhook.service.js');

const stamp = Date.now();
const email = `social-day2-${stamp}@example.com`;
const password = 'Password123!';
let token;
let accountId;
let callbackUrl;

const auth = () => ({
  get: (url) => request(app).get(url).set('Authorization', `Bearer ${token}`),
  post: (url) => request(app).post(url).set('Authorization', `Bearer ${token}`),
  delete: (url) => request(app).delete(url).set('Authorization', `Bearer ${token}`),
});

before(async () => {
  await prisma.user.deleteMany({ where: { email } });
  const registered = await request(app).post('/api/v1/auth/register').send({
    email,
    displayName: 'Social Day Two',
    password,
  });
  assert.equal(registered.status, 201);
  const verified = await request(app).post('/api/v1/auth/verify-email').send({
    email,
    otp: getTestVerificationCode(email),
  });
  token = verified.body.data.accessToken;
  const profile = await auth().post('/api/v1/creator/profile').send({
    channelName: 'Verified Social Creator',
    username: `social_day2_${stamp}`.slice(0, 30),
    niche: 'Technology',
    instagram: 'https://instagram.com/manual-link-before-oauth',
  });
  assert.equal(profile.status, 201);
  const business = await auth().post('/api/v1/business/profile').send({
    organization: 'Verified Social Business',
    username: `social_business_${stamp}`.slice(0, 30),
    industry: 'Technology',
  });
  assert.equal(business.status, 201);
});

after(async () => {
  await prisma.user.deleteMany({ where: { email } });
  await prisma.$disconnect();
});

describe('Requirement Day 2 social OAuth and stat synchronization', () => {
  test('encrypts tokens with randomized authenticated encryption', () => {
    const first = encryptSocialToken('provider-secret-token');
    const second = encryptSocialToken('provider-secret-token');
    assert.notEqual(first, second);
    assert.equal(decryptSocialToken(first), 'provider-secret-token');
    assert.equal(decryptSocialToken(second), 'provider-secret-token');
    assert.throws(() => decryptSocialToken(`${first.slice(0, -2)}aa`), { code: 'SOCIAL_TOKEN_DECRYPTION_FAILED' });
  });

  test('runs authorize callback idempotently and appends a verified stat snapshot', async () => {
    const authorize = await auth().get('/api/v1/social-connections/instagram/authorize')
      .query({ redirectTo: '/account?channel=creator' });
    assert.equal(authorize.status, 200);
    callbackUrl = new URL(authorize.body.data.authorizeUrl);
    assert.equal(callbackUrl.pathname, '/api/v1/social-connections/instagram/callback');

    const callback = await request(app).get(`${callbackUrl.pathname}${callbackUrl.search}`)
      .set('Accept', 'application/json');
    assert.equal(callback.status, 200);
    assert.equal(callback.body.data.account.verified, true);
    assert.equal(callback.body.data.account.connectionType, 'API');
    assert.ok(callback.body.data.account.latestStats.followerCount > 0);
    assert.ok(callback.body.data.account.recentMedia.length > 0);
    assert.equal(callback.body.data.account.accessTokenEncrypted, undefined);
    accountId = callback.body.data.account.id;

    const duplicate = await request(app).get(`${callbackUrl.pathname}${callbackUrl.search}`)
      .set('Accept', 'application/json');
    assert.equal(duplicate.status, 200);
    assert.equal(duplicate.body.data.idempotent, true);
    assert.equal(duplicate.body.data.account.id, accountId);

    const stored = await prisma.socialAccount.findUnique({
      where: { id: accountId },
      include: { stats: true },
    });
    assert.notEqual(stored.accessTokenEncrypted, 'sandbox-access-instagram-sandbox-instagram');
    assert.match(stored.accessTokenEncrypted, /^v1\./);
    assert.equal(stored.stats.length, 1);
  });

  test('returns safe DTOs, appends sync history and disconnects only the owner account', async () => {
    const listed = await auth().get('/api/v1/creator/social-accounts');
    assert.equal(listed.status, 200);
    const connected = listed.body.data.accounts.find((entry) => entry.id === accountId);
    assert.equal(connected.syncStatus, 'HEALTHY');
    assert.equal(connected.refreshTokenEncrypted, undefined);

    const synced = await auth().post(`/api/v1/social-connections/${accountId}/sync`).send({});
    assert.equal(synced.status, 200);
    assert.equal(await prisma.socialStat.count({ where: { socialAccountId: accountId } }), 2);

    const disconnected = await auth().delete(`/api/v1/creator/social-accounts/${accountId}`);
    assert.equal(disconnected.status, 200);
    assert.equal(await prisma.socialAccount.count({ where: { id: accountId } }), 0);
  });

  test('connects and isolates a business-owned Facebook Page through unified endpoints', async () => {
    const authorize = await auth().get('/api/v1/social-connections/facebook/authorize')
      .query({ channelType: 'BUSINESS', redirectTo: '/account?channel=business' });
    assert.equal(authorize.status, 200);
    const url = new URL(authorize.body.data.authorizeUrl);
    const callback = await request(app).get(`${url.pathname}${url.search}`).set('Accept', 'application/json');
    assert.equal(callback.status, 200);
    assert.equal(callback.body.data.account.channelType, 'BUSINESS');
    assert.ok(callback.body.data.account.recentMedia.length > 0);

    const businessList = await auth().get('/api/v1/social-connections').query({ channelType: 'BUSINESS' });
    const creatorList = await auth().get('/api/v1/social-connections').query({ channelType: 'CREATOR' });
    assert.equal(businessList.status, 200);
    assert.ok(businessList.body.data.accounts.some((item) => item.id === callback.body.data.account.id));
    assert.equal(creatorList.body.data.accounts.some((item) => item.id === callback.body.data.account.id), false);

    const disconnected = await auth().delete(`/api/v1/social-connections/${callback.body.data.account.id}`)
      .query({ channelType: 'BUSINESS' });
    assert.equal(disconnected.status, 200);
  });

  test('verifies and deduplicates signed Meta webhook payloads', async () => {
    assert.equal(metaWebhookService.verify({
      'hub.mode': 'subscribe',
      'hub.challenge': 'challenge-ok',
      'hub.verify_token': process.env.META_WEBHOOK_VERIFY_TOKEN,
    }), 'challenge-ok');
    const raw = Buffer.from(JSON.stringify({ object: 'page', entry: [{ id: `unknown-page-${stamp}`, changes: [] }] }));
    const signature = `sha256=${createHmac('sha256', process.env.META_APP_SECRET).update(raw).digest('hex')}`;
    const first = await metaWebhookService.receive(raw, signature);
    const duplicate = await metaWebhookService.receive(raw, signature);
    assert.equal(first.duplicate, false);
    assert.equal(duplicate.duplicate, true);
  });
});

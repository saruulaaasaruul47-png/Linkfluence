import 'dotenv/config';
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET ||= 'test-access-secret-with-at-least-32-characters';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-with-at-least-32-characters';
process.env.JWT_PASSWORD_RESET_SECRET ||= 'test-reset-secret-with-at-least-32-characters';
process.env.SOCIAL_PROVIDER_MODE = 'sandbox';
process.env.SOCIAL_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString('base64');
process.env.SOCIAL_SYNC_STALE_HOURS = '24';

const { app } = await import('../../src/app.js');
const { prisma } = await import('../../src/config/database.js');
const { getTestVerificationCode } = await import('../../src/modules/auth/auth.email.js');
const { encryptSocialToken } = await import('../../src/modules/social-sync/token-encryption.js');
const { socialService } = await import('../../src/modules/social-sync/social.service.js');

const stamp = Date.now();
const prefix = `day4-trust-${stamp}`;
const password = 'Password123!';
let creatorToken;
let businessToken;
let creator;
let business;
let manualId;
let oauthId;
let brokenOauthId;
let collaborationId;
let paymentId;

const auth = (token) => ({
  get: (url) => request(app).get(url).set('Authorization', `Bearer ${token}`),
  post: (url) => request(app).post(url).set('Authorization', `Bearer ${token}`),
  patch: (url) => request(app).patch(url).set('Authorization', `Bearer ${token}`),
});

async function register(label) {
  const email = `${prefix}-${label}@example.com`;
  const created = await request(app).post('/api/v1/auth/register').send({ email, displayName: label, password });
  assert.equal(created.status, 201);
  const verified = await request(app).post('/api/v1/auth/verify-email').send({
    email,
    otp: getTestVerificationCode(email),
  });
  assert.equal(verified.status, 200);
  return verified.body.data.accessToken;
}

before(async () => {
  creatorToken = await register('creator');
  businessToken = await register('business');
  const creatorResponse = await auth(creatorToken).post('/api/v1/creator/profile').send({
    channelName: 'Day Four Creator',
    username: `day4_creator_${stamp}`.slice(0, 30),
    categories: ['Technology', 'Lifestyle'],
    skills: ['Video editing', 'Storytelling', 'Video editing'],
    languages: ['Mongolian', 'English'],
    startingRate: 1750000,
    currency: 'MNT',
    availability: 'Available now',
    availableForWork: true,
  });
  assert.equal(creatorResponse.status, 201);
  creator = await prisma.creatorProfile.findUnique({ where: { userId: creatorResponse.body.data.profile.userId } });

  const businessResponse = await auth(businessToken).post('/api/v1/business/profile').send({
    organization: 'Day Four Business',
    username: `day4_business_${stamp}`.slice(0, 30),
  });
  assert.equal(businessResponse.status, 201);
  business = await prisma.businessProfile.findUnique({ where: { userId: businessResponse.body.data.profile.userId } });
});

after(async () => {
  if (paymentId) await prisma.paymentRefund.deleteMany({ where: { paymentId } });
  if (collaborationId) await prisma.payment.deleteMany({ where: { collaborationId } });
  if (collaborationId) await prisma.collaboration.deleteMany({ where: { id: collaborationId } });
  await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
  await prisma.$disconnect();
});

describe('Requirement 7-day plan Day 4 creator and payer trust', () => {
  test('persists normalized creator decision fields', async () => {
    const response = await auth(creatorToken).get('/api/v1/creator/profile');
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data.profile.skills, ['Video editing', 'Storytelling']);
    assert.deepEqual(response.body.data.profile.languages, ['Mongolian', 'English']);
    assert.equal(response.body.data.profile.availability, 'AVAILABLE_NOW');
    assert.equal(response.body.data.profile.startingRate, 1750000);
    assert.equal(response.body.data.profile.currency, 'MNT');
  });

  test('rejects uncontrolled availability values', async () => {
    const response = await auth(creatorToken).patch('/api/v1/creator/profile').send({ availability: 'Maybe someday' });
    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  });

  test('creates a dedicated YouTube manual profile as unverified', async () => {
    const response = await auth(creatorToken).post('/api/v1/creator/social-accounts').send({
      platform: 'YOUTUBE',
      profileUrl: 'youtube.com/@dayfour',
      followerCount: 9000,
      engagementRate: 5.2,
    });
    assert.equal(response.status, 201);
    assert.equal(response.body.data.account.platform, 'YOUTUBE');
    assert.equal(response.body.data.account.verified, false);
    assert.equal(response.body.data.account.syncStatus, 'MANUAL');
    manualId = response.body.data.account.id;
  });

  test('never exposes token fields in social account responses', async () => {
    const response = await auth(creatorToken).get('/api/v1/creator/social-accounts');
    const account = response.body.data.accounts.find((item) => item.id === manualId);
    assert.equal(account.accessTokenEncrypted, undefined);
    assert.equal(account.refreshTokenEncrypted, undefined);
  });

  test('keeps edited manual statistics unverified', async () => {
    const response = await auth(creatorToken).patch(`/api/v1/creator/social-accounts/${manualId}`).send({ followerCount: 12000 });
    assert.equal(response.status, 200);
    assert.equal(response.body.data.account.followerCount, 12000);
    assert.equal(response.body.data.account.verificationStatus, 'UNVERIFIED');
  });

  test('rejects attempts to self-assign manual verification', async () => {
    const response = await auth(creatorToken).patch(`/api/v1/creator/social-accounts/${manualId}`).send({ verificationStatus: 'VERIFIED' });
    assert.equal(response.status, 400);
  });

  test('does not synchronize self-reported manual profiles', async () => {
    const response = await auth(creatorToken).post(`/api/v1/social-connections/${manualId}/sync`).send({});
    assert.equal(response.status, 409);
    assert.equal(response.body.error.code, 'SOCIAL_ACCOUNT_NOT_CONNECTED');
  });

  test('prevents manual edit from mutating an OAuth-managed account', async () => {
    const old = new Date(Date.now() - 25 * 60 * 60 * 1000);
    const account = await prisma.socialAccount.create({ data: {
      creatorId: creator.id,
      platform: 'FACEBOOK',
      handle: `${prefix}-oauth`,
      profileUrl: 'https://facebook.com/dayfour',
      providerAccountId: `${prefix}-provider`,
      accessTokenEncrypted: encryptSocialToken(`${prefix}-access`),
      refreshTokenEncrypted: encryptSocialToken(`${prefix}-refresh`),
      tokenExpiresAt: new Date(Date.now() + 86_400_000),
      verificationStatus: 'VERIFIED',
      syncStatus: 'HEALTHY',
      lastSyncAt: old,
    } });
    oauthId = account.id;
    const response = await auth(creatorToken).patch(`/api/v1/creator/social-accounts/${oauthId}`).send({ handle: 'hijacked' });
    assert.equal(response.status, 409);
    assert.equal(response.body.error.code, 'SOCIAL_OAUTH_MANAGED');
  });

  test('marks statistics older than 24 hours as stale in the safe DTO', async () => {
    const response = await auth(creatorToken).get('/api/v1/creator/social-accounts');
    const account = response.body.data.accounts.find((item) => item.id === oauthId);
    assert.equal(account.isStale, true);
    assert.equal(account.syncStatus, 'STALE');
  });

  test('background sync refreshes stale provider accounts and appends a snapshot', async () => {
    const result = await socialService.syncStale({ limit: 20 });
    assert.ok(result.synchronized >= 1);
    const saved = await prisma.socialAccount.findUnique({ where: { id: oauthId }, include: { stats: true } });
    assert.equal(saved.syncStatus, 'HEALTHY');
    assert.ok(saved.stats.length >= 1);
  });

  test('background sync converts invalid encrypted access into reauthorization state', async () => {
    const account = await prisma.socialAccount.create({ data: {
      creatorId: creator.id,
      platform: 'INSTAGRAM',
      handle: `${prefix}-broken`,
      providerAccountId: `${prefix}-broken-provider`,
      accessTokenEncrypted: 'invalid-encrypted-token',
      verificationStatus: 'VERIFIED',
      syncStatus: 'HEALTHY',
      lastSyncAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
    } });
    brokenOauthId = account.id;
    const result = await socialService.syncStale({ limit: 20 });
    assert.ok(result.reauthRequired >= 1);
    const saved = await prisma.socialAccount.findUnique({ where: { id: brokenOauthId } });
    assert.equal(saved.syncStatus, 'REAUTH_REQUIRED');
  });

  test('does not grant Verified Payer before a successful funding payment', async () => {
    const response = await request(app).get(`/api/v1/businesses/${business.id}`);
    assert.equal(response.status, 200);
    assert.equal(response.body.data.business.verifiedPayer, false);
  });

  test('grants Verified Payer from an undisputed funded collaboration', async () => {
    const collaboration = await prisma.collaboration.create({ data: {
      businessId: business.id,
      creatorId: creator.id,
      status: 'IN_PROGRESS',
      terms: {},
    } });
    collaborationId = collaboration.id;
    const payment = await prisma.payment.create({ data: {
      collaborationId,
      type: 'FUNDING',
      status: 'FUNDED',
      amount: 1750000,
      processedAt: new Date(),
    } });
    paymentId = payment.id;
    const response = await request(app).get(`/api/v1/businesses/${business.id}`);
    assert.equal(response.body.data.business.verifiedPayer, true);
    assert.equal(response.body.data.business.verifiedPaymentCount, 1);
  });

  test('revokes payer qualification when the funding has an active refund', async () => {
    const requester = await prisma.user.findUnique({ where: { id: business.userId } });
    await prisma.paymentRefund.create({ data: {
      paymentId,
      requesterId: requester.id,
      amount: 1750000,
      reason: 'Day 4 trust test refund',
      status: 'PENDING',
    } });
    const response = await request(app).get(`/api/v1/businesses/${business.id}`);
    assert.equal(response.body.data.business.verifiedPayer, false);
  });

  test('does not grant payer trust while any business collaboration is disputed', async () => {
    await prisma.paymentRefund.deleteMany({ where: { paymentId } });
    await prisma.collaboration.update({ where: { id: collaborationId }, data: { status: 'DISPUTED' } });
    const response = await request(app).get(`/api/v1/businesses/${business.id}`);
    assert.equal(response.body.data.business.verifiedPayer, false);
    await prisma.collaboration.update({ where: { id: collaborationId }, data: { status: 'IN_PROGRESS' } });
  });

  test('compare response identifies provider-verified snapshot capture time', async () => {
    await prisma.creatorComparison.create({ data: { businessId: business.id, creatorId: creator.id } });
    const response = await auth(businessToken).get('/api/v1/business/compare');
    assert.equal(response.status, 200);
    assert.equal(response.body.data.items[0].creator.statisticsVerified, true);
    assert.ok(response.body.data.items[0].creator.statisticsCapturedAt);
    assert.equal(response.body.data.items[0].creator.statisticsSource, 'OAUTH');
  });
});

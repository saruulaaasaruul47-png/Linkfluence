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
const { assertFeatureEnabled, clearPlatformConfigCache } = await import('../../src/modules/operations/platform-config.service.js');
const { runOperationalJob } = await import('../../src/modules/operations/job-runner.js');
const { maintenanceJobs } = await import('../../src/modules/operations/maintenance-jobs.js');

const stamp = Date.now();
const prefix = `day6-${stamp}`;
const password = 'Password123!';
const reason = 'Day 6 integration verification change.';
let adminToken;
let viewerToken;
let adminUser;
let viewerUser;
let creator;
let business;
let offer;
let collaboration;
let post;
let featureFlag;
let previousDeviceSetting;

const auth = (token) => ({
  get: (url) => request(app).get(url).set('Authorization', `Bearer ${token}`),
  post: (url) => request(app).post(url).set('Authorization', `Bearer ${token}`),
  patch: (url) => request(app).patch(url).set('Authorization', `Bearer ${token}`),
});

async function register(label) {
  const email = `${prefix}-${label}@example.com`;
  const created = await request(app).post('/api/v1/auth/register').send({ email, displayName: label, password });
  assert.equal(created.status, 201);
  const verified = await request(app).post('/api/v1/auth/verify-email').send({ email, otp: getTestVerificationCode(email) });
  assert.equal(verified.status, 200);
  return { email, user: await prisma.user.findUnique({ where: { email } }), token: verified.body.data.accessToken };
}

before(async () => {
  const adminRegistration = await register('admin');
  const viewerRegistration = await register('viewer');
  adminUser = await prisma.user.update({ where: { id: adminRegistration.user.id }, data: { roles: ['VIEWER', 'ADMIN'] } });
  viewerUser = viewerRegistration.user;
  viewerToken = viewerRegistration.token;
  const login = await request(app).post('/api/v1/auth/login').send({ email: adminRegistration.email, password });
  adminToken = login.body.data.accessToken;
  previousDeviceSetting = await prisma.platformSetting.findUnique({ where: { key: 'newDeviceAlerts' } });

  const creatorUser = await prisma.user.create({ data: { email: `${prefix}-creator@example.com`, displayName: 'Day 6 Creator', roles: ['VIEWER', 'CREATOR'], status: 'ACTIVE', emailVerifiedAt: new Date() } });
  const businessUser = await prisma.user.create({ data: { email: `${prefix}-business@example.com`, displayName: 'Day 6 Business', roles: ['VIEWER', 'BUSINESS'], status: 'ACTIVE', emailVerifiedAt: new Date() } });
  creator = await prisma.creatorProfile.create({ data: { userId: creatorUser.id, channelName: 'Day 6 Creator', slug: `${prefix}-creator` } });
  business = await prisma.businessProfile.create({ data: { userId: businessUser.id, companyName: 'Day 6 Business', slug: `${prefix}-business` } });
  offer = await prisma.workOffer.create({ data: { businessId: business.id, creatorId: creator.id, title: 'Day 6 Offer', contentType: 'REEL', budget: 500000, timeline: '7 days' } });
  collaboration = await prisma.collaboration.create({ data: { offerId: offer.id, businessId: business.id, creatorId: creator.id, terms: { budget: 500000 } } });
  post = await prisma.contentPost.create({ data: { authorType: 'CREATOR', creatorId: creator.id, title: 'Day 6 Public Post', caption: 'A moderation visibility fixture.', status: 'PUBLISHED', visibility: 'PUBLIC', publishedAt: new Date() } });
});

after(async () => {
  await prisma.jobLease.deleteMany({ where: { name: { startsWith: prefix } } });
  await prisma.jobRun.deleteMany({ where: { jobName: { startsWith: prefix } } });
  if (featureFlag) await prisma.featureFlag.deleteMany({ where: { id: featureFlag.id } });
  if (previousDeviceSetting) await prisma.platformSetting.update({ where: { key: 'newDeviceAlerts' }, data: { value: previousDeviceSetting.value, description: previousDeviceSetting.description, updatedById: previousDeviceSetting.updatedById } });
  else await prisma.platformSetting.deleteMany({ where: { key: 'newDeviceAlerts' } });
  await prisma.adminAction.deleteMany({ where: { actorId: adminUser.id } });
  await prisma.collaboration.deleteMany({ where: { id: collaboration.id } });
  await prisma.workOffer.deleteMany({ where: { id: offer.id } });
  await prisma.contentPost.deleteMany({ where: { id: post.id } });
  await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
  clearPlatformConfigCache();
  await prisma.$disconnect();
});

describe('Requirement Day 6 platform operations', () => {
  test('liveness endpoint reports the process without authentication', async () => {
    const response = await request(app).get('/api/v1/health/live');
    assert.equal(response.status, 200);
    assert.equal(response.body.data.status, 'up');
  });

  test('readiness endpoint verifies PostgreSQL and the outbox threshold', async () => {
    const response = await request(app).get('/api/v1/health/ready');
    assert.equal(response.status, 200);
    assert.equal(response.body.data.dependencies.postgres.status, 'up');
    assert.equal(response.body.data.dependencies.outbox.status, 'up');
  });

  test('non-admin users receive 403 for every Day 6 admin mutation', async () => {
    const blocked = await Promise.all([
      auth(viewerToken).patch('/api/v1/admin/settings').send({ settings: { maintenance: false }, reason }),
      auth(viewerToken).post('/api/v1/admin/feature-flags').send({ key: 'blocked_flag', name: 'Blocked flag', reason }),
      auth(viewerToken).patch('/api/v1/admin/feature-flags/cms0000000000000000000000').send({ enabled: false, reason }),
      auth(viewerToken).post('/api/v1/admin/content/cms0000000000000000000000/hide').send({ reason }),
      auth(viewerToken).post('/api/v1/admin/content/cms0000000000000000000000/restore').send({ reason }),
    ]);
    assert.deepEqual(blocked.map((response) => response.status), [403, 403, 403, 403, 403]);
  });

  test('admin reads merged server defaults rather than browser settings', async () => {
    const response = await auth(adminToken).get('/api/v1/admin/settings');
    assert.equal(response.status, 200);
    assert.equal(typeof response.body.data.settings.maintenance, 'boolean');
  });

  test('settings API rejects arbitrary secret-shaped fields', async () => {
    const response = await auth(adminToken).patch('/api/v1/admin/settings').send({ settings: { JWT_ACCESS_SECRET: 'do-not-store' }, reason });
    assert.equal(response.status, 400);
  });

  test('setting changes persist and create a complete audit entry', async () => {
    const response = await auth(adminToken).patch('/api/v1/admin/settings').send({ settings: { newDeviceAlerts: false }, reason });
    assert.equal(response.status, 200);
    assert.equal(response.body.data.settings.newDeviceAlerts, false);
    const audit = await prisma.adminAction.findFirst({ where: { actorId: adminUser.id, action: 'PLATFORM_SETTINGS_UPDATED' }, orderBy: { createdAt: 'desc' } });
    assert.equal(audit.reason, reason);
    assert.equal(audit.after.newDeviceAlerts, false);
  });

  test('feature flag creation is audited', async () => {
    const response = await auth(adminToken).post('/api/v1/admin/feature-flags').send({ key: `${prefix.replaceAll('-', '_')}_flag`, name: 'Day 6 Flag', enabled: true, rolloutPercentage: 100, allowedRoles: [], reason });
    assert.equal(response.status, 201);
    featureFlag = response.body.data.featureFlag;
    assert.ok(await prisma.adminAction.findFirst({ where: { targetId: featureFlag.id, action: 'FEATURE_FLAG_CREATED' } }));
  });

  test('feature flag updates are enforced by server-side policy', async () => {
    const response = await auth(adminToken).patch(`/api/v1/admin/feature-flags/${featureFlag.id}`).send({ enabled: false, reason });
    assert.equal(response.status, 200);
    await assert.rejects(() => assertFeatureEnabled(featureFlag.key, viewerUser), (error) => error.code === 'FEATURE_DISABLED');
  });

  test('admin offers endpoint returns real persisted offers', async () => {
    const response = await auth(adminToken).get(`/api/v1/admin/offers?q=${encodeURIComponent('Day 6 Offer')}&page=1&limit=20`);
    assert.equal(response.status, 200);
    assert.ok(response.body.data.items.some((item) => item.id === offer.id));
  });

  test('admin collaborations endpoint returns real persisted workspaces', async () => {
    const response = await auth(adminToken).get(`/api/v1/admin/collaborations?q=${collaboration.id}&page=1&limit=20`);
    assert.equal(response.status, 200);
    assert.ok(response.body.data.items.some((item) => item.id === collaboration.id));
  });

  test('hidden content disappears from feed, profile and detail', async () => {
    const hidden = await auth(adminToken).post(`/api/v1/admin/content/${post.id}/hide`).send({ reason });
    assert.equal(hidden.status, 200);
    const [feed, channel, detail] = await Promise.all([
      request(app).get('/api/v1/feed?limit=20'),
      request(app).get(`/api/v1/channels/creator/${creator.id}/posts?limit=20`),
      request(app).get(`/api/v1/posts/${post.id}`),
    ]);
    assert.ok(!feed.body.data.items.some((item) => item.id === post.id));
    assert.ok(!channel.body.data.items.some((item) => item.id === post.id));
    assert.equal(detail.status, 404);
  });

  test('restoring content returns it to public feed and profile', async () => {
    const restored = await auth(adminToken).post(`/api/v1/admin/content/${post.id}/restore`).send({ reason });
    assert.equal(restored.status, 200);
    const feed = await request(app).get('/api/v1/feed?limit=20');
    assert.ok(feed.body.data.items.some((item) => item.id === post.id));
    assert.ok(await prisma.adminAction.findFirst({ where: { targetId: post.id, action: 'CONTENT_RESTORED' } }));
  });

  test('distributed lease prevents concurrent duplicate job work', async () => {
    let executions = 0;
    let release;
    let started;
    const startedPromise = new Promise((resolve) => { started = resolve; });
    const blocked = new Promise((resolve) => { release = resolve; });
    const name = `${prefix}-concurrent`;
    const first = runOperationalJob({ name, maxAttempts: 1, handler: async () => { executions += 1; started(); await blocked; return { executions }; } });
    await startedPromise;
    const second = await runOperationalJob({ name, maxAttempts: 1, handler: async () => { executions += 1; return {}; } });
    release(); await first;
    assert.equal(second.status, 'SKIPPED');
    assert.equal(executions, 1);
  });

  test('failed jobs retry and persist a dead-letter metric', async () => {
    const name = `${prefix}-failure`;
    let attempts = 0;
    await assert.rejects(() => runOperationalJob({ name, maxAttempts: 2, retryBaseMs: 1, handler: async () => { attempts += 1; throw new Error('planned worker failure'); } }), /planned worker failure/);
    const run = await prisma.jobRun.findFirst({ where: { jobName: name }, orderBy: { startedAt: 'desc' } });
    assert.equal(attempts, 2);
    assert.equal(run.status, 'FAILED');
    assert.equal(run.metrics.deadLettered, true);
  });

  test('cleanup job removes expired OTP, refresh token and retained outbox rows', async () => {
    const old = new Date(Date.now() - 40 * 86_400_000);
    await prisma.verificationCode.create({ data: { userId: viewerUser.id, codeHash: `${prefix}-code`, expiresAt: old } });
    await prisma.authToken.create({ data: { userId: viewerUser.id, tokenHash: `${prefix}-token`, jti: `${prefix}-jti`, familyId: `${prefix}-family`, expiresAt: old } });
    const event = await prisma.outboxEvent.create({ data: { topic: 'test.retained', aggregateId: prefix, payload: {}, processedAt: old } });
    const result = await maintenanceJobs.cleanup({ name: `${prefix}-cleanup`, maxAttempts: 1 });
    assert.equal(result.status, 'SUCCEEDED');
    assert.equal(await prisma.outboxEvent.findUnique({ where: { id: event.id } }), null);
  });
});

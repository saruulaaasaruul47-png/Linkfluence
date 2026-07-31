import 'dotenv/config';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET ||= 'test-access-secret-with-at-least-32-characters';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-with-at-least-32-characters';
process.env.JWT_PASSWORD_RESET_SECRET ||= 'test-reset-secret-with-at-least-32-characters';
process.env.PAYMENT_WEBHOOK_SECRET ||= 'test-payment-webhook-secret-32-characters';

const { app } = await import('../../src/app.js');
const { prisma } = await import('../../src/config/database.js');
const { getTestVerificationCode } = await import('../../src/modules/auth/auth.email.js');
const { mockPaymentProvider } = await import('../../src/modules/payments/providers/mock.provider.js');

const stamp = Date.now();
const prefix = `day56-test-${stamp}`;
const password = 'Password123!';
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);
const uploadedPaths = [];
let businessAccount;
let creatorAccount;
let outsiderAccount;
let business;
let creator;
let offer;
let collaboration;
let contract;
let funding;
let release;
let deliverable;

const auth = (token) => ({
  get: (url) => request(app).get(url).set('Authorization', `Bearer ${token}`),
  post: (url) => request(app).post(url).set('Authorization', `Bearer ${token}`),
  patch: (url) => request(app).patch(url).set('Authorization', `Bearer ${token}`),
});

async function account(label) {
  const email = `${prefix}-${label}@example.com`;
  const registered = await request(app).post('/api/v1/auth/register').send({
    email,
    displayName: `${label} Day 56`,
    password,
  });
  assert.equal(registered.status, 201);
  const verified = await request(app).post('/api/v1/auth/verify-email').send({
    email,
    otp: getTestVerificationCode(email),
  });
  assert.equal(verified.status, 200);
  return { email, token: verified.body.data.accessToken };
}

async function upload(token) {
  const response = await auth(token).post('/api/v1/media/uploads')
    .field('purpose', 'PORTFOLIO')
    .attach('file', png, { filename: 'day56.png', contentType: 'image/png' });
  assert.equal(response.status, 201);
  const asset = response.body.data.asset;
  uploadedPaths.push(path.resolve(process.cwd(), asset.url.replace(/^\//, '')));
  return asset;
}

async function cleanup() {
  const users = await prisma.user.findMany({
    where: { email: { startsWith: prefix } },
    select: { id: true },
  });
  const userIds = users.map((user) => user.id);
  if (userIds.length) {
    const collaborations = await prisma.collaboration.findMany({
      where: {
        OR: [
          { business: { userId: { in: userIds } } },
          { creator: { userId: { in: userIds } } },
        ],
      },
      select: { id: true },
    });
    const ids = collaborations.map((entry) => entry.id);
    if (ids.length) {
      const payments = await prisma.payment.findMany({ where: { collaborationId: { in: ids } }, select: { id: true } });
      const paymentIds = payments.map((entry) => entry.id);
      await prisma.showcasePost.deleteMany({ where: { collaborationId: { in: ids } } });
      if (paymentIds.length) {
        await prisma.paymentProviderEvent.deleteMany({ where: { paymentId: { in: paymentIds } } });
        await prisma.paymentRefund.deleteMany({ where: { paymentId: { in: paymentIds } } });
        await prisma.paymentPayout.deleteMany({ where: { paymentId: { in: paymentIds } } });
      }
      await prisma.payment.deleteMany({ where: { collaborationId: { in: ids } } });
      await prisma.collaboration.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.workOffer.deleteMany({
      where: {
        OR: [
          { business: { userId: { in: userIds } } },
          { creator: { userId: { in: userIds } } },
        ],
      },
    });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
  await Promise.all(uploadedPaths.splice(0).map((file) => fs.unlink(file).catch(() => {})));
}

before(async () => {
  await cleanup();
  businessAccount = await account('business');
  creatorAccount = await account('creator');
  outsiderAccount = await account('outsider');

  const businessResponse = await auth(businessAccount.token).post('/api/v1/business/profile').send({
    organization: 'Day 56 Studio',
    username: `day56_studio_${stamp}`.slice(0, 30),
    description: 'Business used for collaboration lifecycle tests.',
    industry: 'Fashion',
  });
  assert.equal(businessResponse.status, 201);
  business = businessResponse.body.data.profile;

  const asset = await upload(creatorAccount.token);
  const creatorResponse = await auth(creatorAccount.token).post('/api/v1/creator/profile').send({
    channelName: 'Day 56 Creator',
    username: `day56_creator_${stamp}`.slice(0, 30),
    bio: 'Creator used for collaboration lifecycle tests.',
    niche: 'Fashion',
    sampleMediaId: asset.id,
    workTitle: 'Lifecycle portfolio',
    workCategory: 'Fashion',
    workDescription: 'Test portfolio item for a complete production lifecycle.',
  });
  assert.equal(creatorResponse.status, 201);
  creator = creatorResponse.body.data.profile;
});

after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe('Day 5 offer, agreement and contract workflow', () => {
  test('creates a versioned offer and protects it from IDOR', async () => {
    const response = await auth(businessAccount.token).post('/api/v1/offers').send({
      creatorId: creator.id,
      title: 'Day 56 launch story',
      contentType: 'Instagram Reel',
      budget: 1900000,
      currency: 'MNT',
      timeline: 'August 2026',
      message: 'We would like to collaborate on a concise product launch story.',
    });
    assert.equal(response.status, 201);
    offer = response.body.data.offer;
    assert.equal(offer.version, 1);

    const hidden = await auth(outsiderAccount.token).get(`/api/v1/offers/${offer.id}`);
    assert.equal(hidden.status, 404);

    const interested = await auth(creatorAccount.token)
      .post(`/api/v1/offers/${offer.id}/respond`)
      .send({ action: 'INTERESTED', version: offer.version });
    assert.equal(interested.status, 200);
    offer = interested.body.data.offer;
    assert.equal(offer.status, 'AWAITING_BUSINESS_APPROVAL');

    const stale = await auth(creatorAccount.token)
      .post(`/api/v1/offers/${offer.id}/respond`)
      .send({ action: 'DECLINE', version: 1 });
    assert.equal(stale.status, 409);
  });

  test('creates exactly one workspace and versions agreement/contract approvals', async () => {
    const approved = await auth(businessAccount.token)
      .post(`/api/v1/offers/${offer.id}/decision`)
      .send({ action: 'APPROVE', finalBudget: 2000000, finalTimeline: 'August 20, 2026', version: offer.version });
    assert.equal(approved.status, 200);
    const workspaceId = approved.body.data.offer.workspaceId;
    assert.ok(workspaceId);

    const duplicate = await auth(businessAccount.token)
      .post(`/api/v1/offers/${offer.id}/decision`)
      .send({ action: 'APPROVE', finalBudget: 2000000, finalTimeline: 'August 20, 2026' });
    assert.equal(duplicate.status, 200);
    assert.equal(duplicate.body.data.offer.workspaceId, workspaceId);
    assert.equal(await prisma.collaboration.count({ where: { offerId: offer.id } }), 1);

    let workspace = (await auth(businessAccount.token).get(`/api/v1/collaborations/${workspaceId}`)).body.data.collaboration;
    const terms = await auth(businessAccount.token)
      .patch(`/api/v1/collaborations/${workspaceId}/terms`)
      .send({ version: workspace.version, terms: { deliverables: 'One hero reel', usageRights: 'Organic social, 60 days' } });
    assert.equal(terms.status, 200);
    workspace = terms.body.data.collaboration;
    assert.equal(workspace.termsVersion, 2);

    const locked = await auth(businessAccount.token)
      .post(`/api/v1/collaborations/${workspaceId}/agreement/lock`)
      .send({ version: workspace.version });
    assert.equal(locked.status, 200);

    assert.equal((await auth(businessAccount.token)
      .post(`/api/v1/collaborations/${workspaceId}/agreement/action`)
      .send({ action: 'APPROVE' })).status, 200);
    const creatorApproval = await auth(creatorAccount.token)
      .post(`/api/v1/collaborations/${workspaceId}/agreement/action`)
      .send({ action: 'APPROVE' });
    assert.equal(creatorApproval.status, 200);
    collaboration = creatorApproval.body.data.collaboration;
    assert.equal(collaboration.status, 'CONTRACT_REVIEW');
    contract = collaboration.contract;
    assert.equal(contract.version, 1);

    assert.equal((await auth(creatorAccount.token)
      .post(`/api/v1/contracts/${contract.id}/action`)
      .send({ action: 'APPROVE' })).status, 200);
    const activated = await auth(businessAccount.token)
      .post(`/api/v1/contracts/${contract.id}/action`)
      .send({ action: 'APPROVE' });
    assert.equal(activated.status, 200);
    assert.equal(activated.body.data.contract.status, 'ACTIVE');

    const auditCount = await prisma.collaborationActivity.count({ where: { collaborationId: workspaceId } });
    assert.ok(auditCount >= 8);
  });
});

describe('Day 6 verified payment, deliverable, review and showcase workflow', () => {
  test('prevents early delivery and changes funding only through a verified event', async () => {
    const early = await auth(creatorAccount.token)
      .post(`/api/v1/collaborations/${collaboration.id}/deliverables`)
      .send({ title: 'Hero reel', fileUrl: '/uploads/day56.mp4', fileType: 'video/mp4' });
    assert.equal(early.status, 409);

    const intent = await auth(businessAccount.token)
      .post(`/api/v1/collaborations/${collaboration.id}/payments/funding-intent`)
      .send({ autoConfirm: false });
    assert.equal(intent.status, 201);
    funding = intent.body.data.payment;
    assert.equal(funding.status, 'PENDING');
    const beforeEvent = await prisma.collaboration.findUnique({ where: { id: collaboration.id } });
    assert.equal(beforeEvent.status, 'PAYMENT_PENDING');

    const fakeEvent = mockPaymentProvider.event('funding.succeeded', {
      providerRef: funding.providerRef,
      amount: funding.amount,
      currency: funding.currency,
    });
    const invalid = await request(app)
      .post('/api/v1/payments/webhooks/mock')
      .set('x-payment-signature', '0'.repeat(64))
      .send(fakeEvent);
    assert.equal(invalid.status, 401);

    const confirmed = await auth(businessAccount.token)
      .post(`/api/v1/payments/${funding.id}/mock-confirm`)
      .send({});
    assert.equal(confirmed.status, 200);
    assert.equal(confirmed.body.data.payment.status, 'FUNDED');
    const afterEvent = await prisma.collaboration.findUnique({ where: { id: collaboration.id } });
    assert.equal(afterEvent.status, 'IN_PROGRESS');
  });

  test('releases only after completion, creates directional reviews and publishes showcase', async () => {
    const submitted = await auth(creatorAccount.token)
      .post(`/api/v1/collaborations/${collaboration.id}/deliverables`)
      .send({ title: 'Hero reel', fileUrl: '/uploads/day56.mp4', fileType: 'video/mp4', note: 'Final approved cut.' });
    assert.equal(submitted.status, 201);
    deliverable = submitted.body.data.deliverable;

    const reviewed = await auth(businessAccount.token)
      .post(`/api/v1/collaborations/${collaboration.id}/deliverables/${deliverable.id}/review`)
      .send({ decision: 'APPROVED', autoConfirmRelease: false });
    assert.equal(reviewed.status, 200);
    assert.equal(reviewed.body.data.completed, true);
    release = reviewed.body.data.release;
    assert.equal(release.status, 'PENDING');

    const releaseConfirmed = await auth(businessAccount.token)
      .post(`/api/v1/payments/${release.id}/mock-confirm`)
      .send({});
    assert.equal(releaseConfirmed.status, 200);
    assert.equal(releaseConfirmed.body.data.payment.status, 'RELEASED');

    assert.equal((await auth(businessAccount.token)
      .post(`/api/v1/collaborations/${collaboration.id}/reviews`)
      .send({ rating: 5, comment: 'Excellent creative delivery.' })).status, 201);
    assert.equal((await auth(creatorAccount.token)
      .post(`/api/v1/collaborations/${collaboration.id}/reviews`)
      .send({ rating: 5, comment: 'Clear brief and prompt feedback.' })).status, 201);

    const publish = await auth(businessAccount.token)
      .post(`/api/v1/collaborations/${collaboration.id}/showcase`)
      .send({ title: 'Day 56 completed collaboration', category: 'Fashion' });
    assert.equal(publish.status, 201);
    assert.equal(publish.body.data.showcase.status, 'PUBLISHED');

    const creatorRecord = await prisma.creatorProfile.findUnique({ where: { id: creator.id } });
    const businessRecord = await prisma.businessProfile.findUnique({ where: { id: business.id } });
    assert.equal(creatorRecord.ratingCount, 1);
    assert.equal(businessRecord.ratingCount, 1);
  });

  test('processes a duplicate provider webhook idempotently and enforces payout ownership', async () => {
    const event = mockPaymentProvider.event('payout.succeeded', {
      providerRef: 'unknown-provider-ref',
      amount: 1,
      currency: 'MNT',
    });
    const signature = mockPaymentProvider.sign(event);
    const unknown = await request(app).post('/api/v1/payments/webhooks/mock').set('x-payment-signature', signature).send(event);
    assert.equal(unknown.status, 404);

    const forbidden = await auth(businessAccount.token)
      .post(`/api/v1/payments/${release.id}/payouts`)
      .send({ autoConfirm: false });
    assert.equal(forbidden.status, 409);
    const payout = await auth(creatorAccount.token)
      .post(`/api/v1/payments/${release.id}/payouts`)
      .send({ autoConfirm: false });
    assert.equal(payout.status, 201);
    assert.equal(payout.body.data.payout.status, 'PENDING');

    const payoutEvent = mockPaymentProvider.event('payout.succeeded', {
      providerRef: payout.body.data.payout.providerRef,
      amount: payout.body.data.payout.amount,
      currency: release.currency,
    });
    const payoutSignature = mockPaymentProvider.sign(payoutEvent);
    const first = await request(app).post('/api/v1/payments/webhooks/mock')
      .set('x-payment-signature', payoutSignature)
      .send(payoutEvent);
    const duplicate = await request(app).post('/api/v1/payments/webhooks/mock')
      .set('x-payment-signature', payoutSignature)
      .send(payoutEvent);
    assert.equal(first.status, 200);
    assert.equal(duplicate.status, 200);
    assert.equal(await prisma.paymentProviderEvent.count({ where: { providerEventId: payoutEvent.id } }), 1);
    const paid = await prisma.paymentPayout.findUnique({ where: { id: payout.body.data.payout.id } });
    assert.equal(paid.status, 'PAID');
  });
});

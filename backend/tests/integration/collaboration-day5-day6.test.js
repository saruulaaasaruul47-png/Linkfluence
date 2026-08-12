import 'dotenv/config';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'node:http';
import { after, before, describe, test } from 'node:test';
import request from 'supertest';
import { io as createSocketClient } from 'socket.io-client';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET ||= 'test-access-secret-with-at-least-32-characters';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-with-at-least-32-characters';
process.env.JWT_PASSWORD_RESET_SECRET ||= 'test-reset-secret-with-at-least-32-characters';
process.env.PAYMENT_WEBHOOK_SECRET ||= 'test-payment-webhook-secret-32-characters';
process.env.PAYMENT_PROVIDER = 'mock';

const { app } = await import('../../src/app.js');
const { prisma } = await import('../../src/config/database.js');
const { getTestVerificationCode } = await import('../../src/modules/auth/auth.email.js');
const { mockPaymentProvider } = await import('../../src/modules/payments/providers/mock.provider.js');
const { setupRealtime, closeRealtime } = await import('../../src/infrastructure/realtime/realtime.gateway.js');
const { lifecycleService } = await import('../../src/modules/collaborations/lifecycle.service.js');
const { reviewService } = await import('../../src/modules/reviews/index.js');
const { ledgerRules, postLedgerBatch } = await import('../../src/modules/payments/ledger.service.js');

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
let payoutAccount;
let publishProof;
let deliverable;
let reportCampaign;

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

async function upload(token, purpose = 'PORTFOLIO') {
  const response = await auth(token).post('/api/v1/media/uploads')
    .field('purpose', purpose)
    .attach('file', png, { filename: 'day56.png', contentType: 'image/png' });
  assert.equal(response.status, 201);
  const asset = response.body.data.asset;
  const stored = await prisma.mediaAsset.findUnique({ where: { id: asset.id }, select: { storageKey: true } });
  uploadedPaths.push(path.resolve(process.cwd(), 'uploads', 'media', stored.storageKey));
  return asset;
}

async function cleanup() {
  const users = await prisma.user.findMany({
    where: { email: { startsWith: prefix } },
    select: { id: true },
  });
  const userIds = users.map((user) => user.id);
  if (userIds.length) {
    const conversations = await prisma.conversation.findMany({
      where: { members: { some: { userId: { in: userIds } } } },
      select: { id: true },
    });
    const conversationIds = conversations.map((entry) => entry.id);
    if (conversationIds.length) {
      await prisma.message.deleteMany({ where: { conversationId: { in: conversationIds } } });
      await prisma.conversationMember.deleteMany({ where: { conversationId: { in: conversationIds } } });
      await prisma.conversation.deleteMany({ where: { id: { in: conversationIds } } });
    }
    await prisma.adminAction.deleteMany({
      where: {
        OR: [
          { actorId: { in: userIds } },
          { targetType: 'USER', targetId: { in: userIds } },
        ],
      },
    });
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
        await prisma.ledgerEntry.deleteMany({ where: { paymentId: { in: paymentIds } } });
        await prisma.paymentProviderEvent.deleteMany({ where: { paymentId: { in: paymentIds } } });
        await prisma.paymentRefund.deleteMany({ where: { paymentId: { in: paymentIds } } });
        await prisma.paymentPayout.deleteMany({ where: { paymentId: { in: paymentIds } } });
        await prisma.platformRevenue.deleteMany({ where: { paymentId: { in: paymentIds } } });
      }
      await prisma.payment.deleteMany({ where: { collaborationId: { in: ids } } });
      await prisma.collaboration.deleteMany({ where: { id: { in: ids } } });
    }
    const ownedAccounts = await prisma.ledgerAccount.findMany({ where: { ownerId: { in: userIds } }, select: { id: true } });
    const ownedAccountIds = ownedAccounts.map((entry) => entry.id);
    if (ownedAccountIds.length) {
      await prisma.ledgerEntry.deleteMany({ where: { OR: [{ debitAccountId: { in: ownedAccountIds } }, { creditAccountId: { in: ownedAccountIds } }] } });
    }
    const topUps = await prisma.walletTopUp.findMany({ where: { userId: { in: userIds } }, select: { id: true } });
    if (topUps.length) {
      await prisma.paymentProviderEvent.deleteMany({ where: { walletTopUpId: { in: topUps.map((entry) => entry.id) } } });
      await prisma.walletTopUp.deleteMany({ where: { id: { in: topUps.map((entry) => entry.id) } } });
    }
    await prisma.ledgerAccount.deleteMany({ where: { ownerId: { in: userIds }, debitEntries: { none: {} }, creditEntries: { none: {} } } });
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

describe('Requirement Day 1 persisted contract read model', () => {
  test('business sees only its participant contracts', async () => {
    const response = await auth(businessAccount.token).get('/api/v1/contracts?limit=20');
    assert.equal(response.status, 200);
    assert.ok(response.body.data.items.some((item) => item.id === contract.id));
  });

  test('creator sees the same shared contract', async () => {
    const response = await auth(creatorAccount.token).get('/api/v1/contracts?limit=20');
    assert.equal(response.status, 200);
    assert.ok(response.body.data.items.some((item) => item.id === contract.id));
  });

  test('outsider cannot discover another collaboration contract', async () => {
    const response = await auth(outsiderAccount.token).get('/api/v1/contracts?limit=20');
    assert.equal(response.status, 200);
    assert.equal(response.body.data.items.some((item) => item.id === contract.id), false);
  });

  test('status filter returns matching active contracts', async () => {
    const response = await auth(businessAccount.token).get('/api/v1/contracts?status=ACTIVE&limit=20');
    assert.equal(response.status, 200);
    assert.ok(response.body.data.items.length >= 1);
    assert.ok(response.body.data.items.every((item) => item.status === 'ACTIVE'));
  });

  test('participant and campaign search is scoped to the actor', async () => {
    const response = await auth(businessAccount.token).get('/api/v1/contracts?q=Day%2056%20Creator&limit=20');
    assert.equal(response.status, 200);
    assert.ok(response.body.data.items.some((item) => item.id === contract.id));
  });

  test('contract list validates bounded cursor pagination input', async () => {
    const response = await auth(businessAccount.token).get('/api/v1/contracts?limit=0');
    assert.equal(response.status, 400);
  });

  test('detail returns stable parties, terms, approval and payment DTOs', async () => {
    const response = await auth(creatorAccount.token).get(`/api/v1/contracts/${contract.id}`);
    assert.equal(response.status, 200);
    const detail = response.body.data.contract;
    assert.equal(detail.actorRole, 'creator');
    assert.equal(detail.business.id, business.id);
    assert.equal(detail.creator.id, creator.id);
    assert.equal(detail.approvals.creator, true);
    assert.equal(detail.approvals.business, true);
    assert.equal(detail.payment.currency, 'MNT');
    assert.ok(detail.terms);
  });

  test('outsider detail is concealed and participant receives a PDF document', async () => {
    const hidden = await auth(outsiderAccount.token).get(`/api/v1/contracts/${contract.id}`);
    assert.equal(hidden.status, 404);
    const document = await auth(creatorAccount.token).get(`/api/v1/contracts/${contract.id}/document`);
    assert.equal(document.status, 200);
    assert.match(document.headers['content-type'], /application\/pdf/);
    assert.match(document.headers['content-disposition'], /\.pdf"$/);
    assert.equal(Buffer.from(document.body).subarray(0, 4).toString(), '%PDF');
  });
});

describe('Day 6 verified payment, deliverable, review and showcase workflow', () => {
  test('prevents early delivery and funds only after a verified wallet top-up', async () => {
    const early = await auth(creatorAccount.token)
      .post(`/api/v1/collaborations/${collaboration.id}/deliverables`)
      .send({ title: 'Hero reel', fileUrl: '/uploads/day56.mp4', fileType: 'video/mp4' });
    assert.equal(early.status, 409);

    const topUp = await auth(businessAccount.token)
      .post('/api/v1/payments/wallet/top-ups')
      .send({ amount: 2000000, currency: 'MNT', idempotencyKey: `day56-topup-${collaboration.id}` });
    assert.equal(topUp.status, 201);
    assert.equal(topUp.body.data.topUp.status, 'PENDING');

    const persistedTopUp = await prisma.walletTopUp.findUnique({ where: { id: topUp.body.data.topUp.id } });
    const verifiedSuccess = mockPaymentProvider.event('funding.succeeded', persistedTopUp);
    const verifiedResponse = await request(app)
      .post('/api/v1/payments/webhooks/mock')
      .set('x-payment-signature', mockPaymentProvider.sign(verifiedSuccess))
      .send(verifiedSuccess);
    assert.equal(verifiedResponse.status, 200);
    assert.equal((await prisma.walletTopUp.findUnique({ where: { id: persistedTopUp.id } })).status, 'COMPLETED');

    const secondSuccess = mockPaymentProvider.event('funding.succeeded', persistedTopUp);
    const replayedSuccess = await request(app)
      .post('/api/v1/payments/webhooks/mock')
      .set('x-payment-signature', mockPaymentProvider.sign(secondSuccess))
      .send(secondSuccess);
    assert.equal(replayedSuccess.status, 200);
    const walletBeforeFunding = await auth(businessAccount.token).get('/api/v1/payments/wallet?currency=MNT');
    assert.equal(walletBeforeFunding.body.data.availableBalance, 2000000);

    const funded = await auth(businessAccount.token)
      .post(`/api/v1/collaborations/${collaboration.id}/payments/fund`)
      .send({ paymentMethod: 'WALLET', idempotencyKey: `day56-funding-${collaboration.id}` });
    assert.equal(funded.status, 201);
    funding = funded.body.data.payment;
    assert.equal(funding.status, 'FUNDED');
    const afterEvent = await prisma.collaboration.findUnique({ where: { id: collaboration.id } });
    assert.equal(afterEvent.status, 'IN_PROGRESS');
    const fundingLedger = await prisma.ledgerEntry.findFirst({ where: { paymentId: funding.id, type: 'COLLABORATION_FUNDING' } });
    await assert.rejects(() => prisma.ledgerEntry.update({ where: { id: fundingLedger.id }, data: { description: 'Mutation must fail.' } }));
  });

  test('audits wrong amount and currency callbacks and rejects mutated event replays', async () => {
    const pending = await prisma.payment.create({ data: { collaborationId: collaboration.id, type: 'FUNDING', status: 'PENDING', amount: 2500, currency: 'MNT', provider: 'mock', providerRef: `mock_mismatch_${Date.now()}` } });
    const wrongAmount = mockPaymentProvider.event('funding.succeeded', { providerRef: pending.providerRef, amount: 2501, currency: 'MNT' });
    const amountResponse = await request(app).post('/api/v1/payments/webhooks/mock').set('x-payment-signature', mockPaymentProvider.sign(wrongAmount)).send(wrongAmount);
    assert.equal(amountResponse.status, 409);
    assert.equal(amountResponse.body.error.code, 'PAYMENT_EVENT_MISMATCH');
    const audited = await prisma.paymentProviderEvent.findUnique({ where: { providerEventId: wrongAmount.id } });
    assert.equal(audited.failureReason, 'PAYMENT_EVENT_MISMATCH');

    const replay = { ...wrongAmount, data: { ...wrongAmount.data, amount: 2500 } };
    const replayResponse = await request(app).post('/api/v1/payments/webhooks/mock').set('x-payment-signature', mockPaymentProvider.sign(replay)).send(replay);
    assert.equal(replayResponse.status, 409);
    assert.equal(replayResponse.body.error.code, 'PAYMENT_EVENT_REPLAY_MISMATCH');

    const wrongCurrency = mockPaymentProvider.event('funding.succeeded', { providerRef: pending.providerRef, amount: 2500, currency: 'USD' });
    const currencyResponse = await request(app).post('/api/v1/payments/webhooks/mock').set('x-payment-signature', mockPaymentProvider.sign(wrongCurrency)).send(wrongCurrency);
    assert.equal(currencyResponse.status, 409);
    assert.equal(currencyResponse.body.error.code, 'PAYMENT_EVENT_MISMATCH');

    await prisma.paymentProviderEvent.deleteMany({ where: { providerEventId: { in: [wrongAmount.id, wrongCurrency.id] } } });
    await prisma.payment.delete({ where: { id: pending.id } });
  });

  test('business final acceptance releases earnings and completes immediately', async () => {
    const submitted = await auth(creatorAccount.token)
      .post(`/api/v1/collaborations/${collaboration.id}/deliverables`)
      .send({ title: 'Hero reel', fileUrl: '/uploads/day56.mp4', fileType: 'video/mp4', note: 'Final approved cut.' });
    assert.equal(submitted.status, 201);
    deliverable = submitted.body.data.deliverable;

    const revisionOneRequest = await auth(businessAccount.token).post(`/api/v1/collaborations/${collaboration.id}/deliverables/${deliverable.id}/review`).send({ decision: 'REVISION_REQUESTED', note: 'Please tighten the opening edit.' });
    assert.equal(revisionOneRequest.status, 200);
    const revisionOne = await auth(creatorAccount.token).post(`/api/v1/collaborations/${collaboration.id}/deliverables/${deliverable.id}/revision`).send({ title: 'Hero reel', fileUrl: '/uploads/day56-v2.mp4', fileType: 'video/mp4', note: 'Revision one.' });
    assert.equal(revisionOne.status, 201);
    deliverable = revisionOne.body.data.deliverable;
    const revisionTwoRequest = await auth(businessAccount.token).post(`/api/v1/collaborations/${collaboration.id}/deliverables/${deliverable.id}/review`).send({ decision: 'REVISION_REQUESTED', note: 'Please update the final frame.' });
    assert.equal(revisionTwoRequest.status, 200);
    const revisionTwo = await auth(creatorAccount.token).post(`/api/v1/collaborations/${collaboration.id}/deliverables/${deliverable.id}/revision`).send({ title: 'Hero reel', fileUrl: '/uploads/day56-v3.mp4', fileType: 'video/mp4', note: 'Final contracted revision.' });
    assert.equal(revisionTwo.status, 201);
    deliverable = revisionTwo.body.data.deliverable;
    const overLimit = await auth(businessAccount.token).post(`/api/v1/collaborations/${collaboration.id}/deliverables/${deliverable.id}/review`).send({ decision: 'REVISION_REQUESTED', note: 'A third revision must be blocked.' });
    assert.equal(overLimit.status, 409);
    assert.equal(overLimit.body.error.code, 'REVISION_LIMIT_REACHED');

    const reviewed = await auth(businessAccount.token)
      .post(`/api/v1/collaborations/${collaboration.id}/deliverables/${deliverable.id}/review`)
      .send({ decision: 'APPROVED' });
    assert.equal(reviewed.status, 200);
    assert.equal(reviewed.body.data.publicationRequired, false);
    assert.equal(reviewed.body.data.publicationOptional, true);
    assert.equal(reviewed.body.data.completed, true);
    assert.equal(reviewed.body.data.release.status, 'RELEASED');
    const [releasedFunding, completedCollaboration] = await Promise.all([
      prisma.payment.findUnique({ where: { id: funding.id } }),
      prisma.collaboration.findUnique({ where: { id: collaboration.id } }),
    ]);
    release = releasedFunding;
    assert.equal(releasedFunding.status, 'RELEASED');
    assert.equal(completedCollaboration.status, 'COMPLETED');
    assert.equal(completedCollaboration.progress, 100);
    assert.equal((await prisma.platformRevenue.findUnique({ where: { paymentId: funding.id } })).status, 'EARNED');
    const creatorUser = await prisma.user.findUnique({ where: { email: creatorAccount.email } });
    const creatorWallet = await prisma.ledgerAccount.findUnique({
      where: { ownerId_type_currency: { ownerId: creatorUser.id, type: 'CREATOR_AVAILABLE', currency: releasedFunding.currency } },
    });
    assert.equal(-Number(creatorWallet.balance), Number(releasedFunding.creatorAmount));

    const proofResponse = await auth(creatorAccount.token).post(`/api/v1/collaborations/${collaboration.id}/proofs`).send({ deliverableId: deliverable.id, postUrl: 'https://www.instagram.com/p/day56-proof/', platform: 'INSTAGRAM', paidPartnership: true });
    assert.equal(proofResponse.status, 201);
    assert.equal(proofResponse.body.data.proof.status, 'VERIFYING');
    publishProof = proofResponse.body.data.proof;
    await prisma.user.update({ where: { email: outsiderAccount.email }, data: { roles: ['ADMIN'] } });
    const verified = await auth(outsiderAccount.token).post(`/api/v1/admin/proofs/${proofResponse.body.data.proof.id}/decision`).send({ action: 'APPROVE', reason: 'Screenshot and published URL verified for lifecycle integration.' });
    assert.equal(verified.status, 200);
    await prisma.user.update({ where: { email: outsiderAccount.email }, data: { roles: ['VIEWER'] } });
    assert.equal((await prisma.collaboration.findUnique({ where: { id: collaboration.id } })).status, 'COMPLETED');

    const businessReview = await auth(businessAccount.token)
      .post(`/api/v1/collaborations/${collaboration.id}/reviews`)
      .send({ rating: 5, comment: 'Excellent creative delivery.' });
    assert.equal(businessReview.status, 201);
    assert.equal(businessReview.body.data.review.revealed, false);
    assert.equal(businessReview.body.data.review.rating, 5);

    // Simultaneous reveal (FR-7.2): the creator cannot read the business review's rating/comment
    // until the creator has submitted their own — the author can always see their own, though.
    const hiddenFromCreator = await auth(creatorAccount.token).get(`/api/v1/collaborations/${collaboration.id}`);
    assert.equal(hiddenFromCreator.status, 200);
    assert.equal(hiddenFromCreator.body.data.collaboration.reviews.business.revealed, false);
    assert.equal(hiddenFromCreator.body.data.collaboration.reviews.business.rating, null);
    assert.equal(hiddenFromCreator.body.data.collaboration.reviews.business.comment, null);
    const visibleToAuthor = await auth(businessAccount.token).get(`/api/v1/collaborations/${collaboration.id}`);
    assert.equal(visibleToAuthor.body.data.collaboration.reviews.business.rating, 5);

    const creatorReview = await auth(creatorAccount.token)
      .post(`/api/v1/collaborations/${collaboration.id}/reviews`)
      .send({ rating: 5, comment: 'Clear brief and prompt feedback.' });
    assert.equal(creatorReview.status, 201);
    assert.equal(creatorReview.body.data.review.revealed, true);

    const revealedView = await auth(creatorAccount.token).get(`/api/v1/collaborations/${collaboration.id}`);
    assert.equal(revealedView.body.data.collaboration.reviews.business.revealed, true);
    assert.equal(revealedView.body.data.collaboration.reviews.business.rating, 5);
    assert.equal(revealedView.body.data.collaboration.reviews.business.comment, 'Excellent creative delivery.');

    // Showcase requires dual consent (FR-8.2): one participant approving only marks it pending.
    const businessConsent = await auth(businessAccount.token)
      .post(`/api/v1/collaborations/${collaboration.id}/showcase`)
      .send({ title: 'Day 56 completed collaboration', category: 'Fashion' });
    assert.equal(businessConsent.status, 200);
    assert.equal(businessConsent.body.data.status, 'WAITING_FOR_COUNTERPART');
    assert.equal(businessConsent.body.data.showcase, null);

    const consentView = await auth(creatorAccount.token).get(`/api/v1/collaborations/${collaboration.id}`);
    assert.equal(consentView.body.data.collaboration.showcaseConsent.counterpart, 'APPROVED');
    assert.equal(consentView.body.data.collaboration.showcaseConsent.mine, 'PENDING');
    assert.equal(consentView.body.data.collaboration.showcasePublished, false);

    const publish = await auth(creatorAccount.token)
      .post(`/api/v1/collaborations/${collaboration.id}/showcase`)
      .send({});
    assert.equal(publish.status, 201);
    assert.equal(publish.body.data.status, 'PUBLISHED');
    assert.equal(publish.body.data.showcase.status, 'PUBLISHED');

    const creatorRecord = await prisma.creatorProfile.findUnique({ where: { id: creator.id } });
    const businessRecord = await prisma.businessProfile.findUnique({ where: { id: business.id } });
    assert.equal(creatorRecord.ratingCount, 1);
    assert.equal(businessRecord.ratingCount, 1);

    // The completed, verified collaboration should be swept into the creator's verified portfolio.
    const lifecycleAfterCompletion = await lifecycleService.run({ now: new Date() });
    assert.ok(lifecycleAfterCompletion.portfolioVerified >= 1);
    const portfolioItem = await prisma.portfolioItem.findUnique({ where: { collaborationId: collaboration.id } });
    assert.ok(portfolioItem);
    assert.equal(portfolioItem.verified, true);
    assert.equal(portfolioItem.creatorId, creator.id);
  });

  test('force-reveals a lone review once the 14-day reveal window has passed', async () => {
    const staleCollaboration = await prisma.collaboration.create({
      data: { businessId: business.id, creatorId: creator.id, status: 'COMPLETED', terms: {}, completedAt: new Date(Date.now() - 15 * 86400000) },
    });
    const staleReview = await prisma.review.create({
      data: { collaborationId: staleCollaboration.id, reviewerId: business.userId, subjectId: creator.userId, rating: 4, comment: 'Solid delivery, counterpart never reviewed back.', publishedAt: null },
    });
    const beforeAggregate = await prisma.creatorProfile.findUnique({ where: { id: creator.id } });

    const revealed = await reviewService.revealStale(new Date());
    assert.ok(revealed >= 1);
    const afterReview = await prisma.review.findUnique({ where: { id: staleReview.id } });
    assert.ok(afterReview.publishedAt);
    const afterAggregate = await prisma.creatorProfile.findUnique({ where: { id: creator.id } });
    assert.equal(afterAggregate.ratingCount, beforeAggregate.ratingCount + 1);

    await prisma.collaboration.delete({ where: { id: staleCollaboration.id } });
  });

  test('lets a participant decline showcase consent and blocks the other side until reversed', async () => {
    const localCollaboration = await prisma.collaboration.create({
      data: { businessId: business.id, creatorId: creator.id, status: 'COMPLETED', terms: {}, completedAt: new Date() },
    });
    await prisma.review.createMany({
      data: [
        { collaborationId: localCollaboration.id, reviewerId: business.userId, subjectId: creator.userId, rating: 5, publishedAt: new Date() },
        { collaborationId: localCollaboration.id, reviewerId: creator.userId, subjectId: business.userId, rating: 5, publishedAt: new Date() },
      ],
    });

    const alreadyPublished = await auth(creatorAccount.token).post(`/api/v1/collaborations/${collaboration.id}/showcase/decline`);
    assert.equal(alreadyPublished.status, 409);
    assert.equal(alreadyPublished.body.error.code, 'SHOWCASE_ALREADY_PUBLISHED');

    const declined = await auth(creatorAccount.token).post(`/api/v1/collaborations/${localCollaboration.id}/showcase/decline`);
    assert.equal(declined.status, 200);
    assert.equal(declined.body.data.status, 'DECLINED');

    const blocked = await auth(businessAccount.token).post(`/api/v1/collaborations/${localCollaboration.id}/showcase`).send({});
    assert.equal(blocked.status, 409);
    assert.equal(blocked.body.error.code, 'SHOWCASE_DECLINED');

    const reversed = await auth(creatorAccount.token).post(`/api/v1/collaborations/${localCollaboration.id}/showcase`).send({});
    assert.equal(reversed.status, 200);
    assert.equal(reversed.body.data.status, 'WAITING_FOR_COUNTERPART');

    await prisma.collaboration.delete({ where: { id: localCollaboration.id } });
  });

  test('sends a one-time publish-deadline reminder as the contract publishBy date approaches', async () => {
    const reminderCollaboration = await prisma.collaboration.create({
      data: { businessId: business.id, creatorId: creator.id, status: 'IN_PROGRESS', terms: {} },
    });
    const reminderContract = await prisma.contract.create({
      data: { collaborationId: reminderCollaboration.id, publishBy: new Date(Date.now() + 24 * 3600000) },
    });

    const firstRun = await lifecycleService.run({ now: new Date() });
    assert.ok(firstRun.publishRemindersSent >= 1);
    const remindedContract = await prisma.contract.findUnique({ where: { id: reminderContract.id } });
    assert.ok(remindedContract.publishReminderSentAt);

    await lifecycleService.run({ now: new Date() });
    const stillContract = await prisma.contract.findUnique({ where: { id: reminderContract.id } });
    assert.equal(stillContract.publishReminderSentAt.getTime(), remindedContract.publishReminderSentAt.getTime());

    await prisma.collaboration.delete({ where: { id: reminderCollaboration.id } });
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
      .send({ payoutAccountId: 'missing-account' });
    assert.equal(forbidden.status, 409);
    const accountResponse = await auth(creatorAccount.token).post('/api/v1/payments/payout-accounts').send({ provider: 'Test Bank', accountName: 'Day 56 Creator', accountNumber: '5012345678', bankCode: 'TEST', currency: 'MNT', isDefault: true });
    assert.equal(accountResponse.status, 201);
    payoutAccount = accountResponse.body.data.account;
    const payout = await auth(creatorAccount.token)
      .post(`/api/v1/payments/${release.id}/payouts`)
      .send({ payoutAccountId: accountResponse.body.data.account.id });
    assert.equal(payout.status, 201);
    assert.equal(payout.body.data.payout.status, 'PENDING');
    await prisma.user.update({ where: { email: outsiderAccount.email }, data: { roles: ['ADMIN'] } });
    const decisions = await Promise.all([
      auth(outsiderAccount.token).post(`/api/v1/admin/payouts/${payout.body.data.payout.id}/decision`).send({ action: 'APPROVE', reason: 'Payout account reviewed for integration test.', autoConfirm: false }),
      auth(outsiderAccount.token).post(`/api/v1/admin/payouts/${payout.body.data.payout.id}/decision`).send({ action: 'APPROVE', reason: 'Concurrent duplicate approval must lose.', autoConfirm: false }),
    ]);
    assert.deepEqual(decisions.map((response) => response.status).sort(), [200, 409]);
    const approved = decisions.find((response) => response.status === 200);
    await prisma.user.update({ where: { email: outsiderAccount.email }, data: { roles: ['VIEWER'] } });

    const payoutEvent = mockPaymentProvider.event('payout.succeeded', {
      providerRef: approved.body.data.payout.providerRef,
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

    const summary = await auth(creatorAccount.token).get('/api/v1/payments/earnings/summary');
    assert.equal(summary.status, 200);
    assert.equal(summary.body.data.currency, release.currency);
    assert.ok(summary.body.data.grossEarned > 0);
    assert.ok(summary.body.data.totalPaidOut > 0);
    assert.ok(summary.body.data.byYear.some((row) => row.year === new Date().getUTCFullYear()));

    const forbiddenSummary = await auth(businessAccount.token).get('/api/v1/payments/earnings/summary');
    assert.equal(forbiddenSummary.status, 403);
    assert.equal(forbiddenSummary.body.error.code, 'CREATOR_PROFILE_REQUIRED');

    const exported = await auth(creatorAccount.token).get('/api/v1/payments/earnings/export.csv');
    assert.equal(exported.status, 200);
    assert.match(exported.headers['content-type'], /text\/csv/);
    assert.match(exported.text, /CREATOR_RELEASE/);
    assert.match(exported.text, /PAYOUT/);
  });

  test('freezes settlement and opens a trust case when retained content is removed', async () => {
    const account = await prisma.socialAccount.create({ data: { creatorId: creator.id, platform: 'INSTAGRAM', handle: `retention_${stamp}`, providerAccountId: `retention-${stamp}`, verificationStatus: 'VERIFIED', syncStatus: 'HEALTHY' } });
    await prisma.publishProof.update({ where: { id: publishProof.id }, data: { socialAccountId: account.id, providerPostId: `removed_${stamp}`, postUrl: 'https://www.instagram.com/removed/day56-proof/', status: 'RETENTION_PENDING', retentionDueAt: new Date(Date.now() - 1000) } });
    const result = await lifecycleService.run({ now: new Date(), autoConfirmRelease: false });
    assert.equal(result.retentionFailed, 1);
    const failed = await prisma.publishProof.findUnique({ where: { id: publishProof.id } });
    assert.equal(failed.status, 'REMOVED');
    const trustCase = await prisma.trustCase.findFirst({ where: { kind: 'DISPUTE', targetType: 'COLLABORATION', targetId: collaboration.id } });
    assert.ok(trustCase);
    await prisma.$transaction([
      prisma.trustCase.delete({ where: { id: trustCase.id } }),
      prisma.publishProof.update({ where: { id: publishProof.id }, data: { status: 'RETENTION_PASSED', postUrl: 'https://www.instagram.com/p/day56-proof/', failureReason: null } }),
      prisma.collaboration.update({ where: { id: collaboration.id }, data: { status: 'COMPLETED' } }),
    ]);
  });
});

describe('Day 7 communication, analytics and controlled admin workflow', () => {
  test('opens a participant-only dispute, accepts evidence and freezes payment actions', async () => {
    await prisma.collaboration.update({ where: { id: collaboration.id }, data: { status: 'IN_PROGRESS' } });
    const opened = await auth(businessAccount.token)
      .post(`/api/v1/collaborations/${collaboration.id}/disputes`)
      .send({ reason: 'The delivered content requires formal review before any further payment action.' });
    assert.equal(opened.status, 201);
    const dispute = opened.body.data.dispute;

    const hidden = await auth(outsiderAccount.token)
      .get(`/api/v1/collaborations/${collaboration.id}/disputes`);
    assert.equal(hidden.status, 404);
    const duplicate = await auth(creatorAccount.token)
      .post(`/api/v1/collaborations/${collaboration.id}/disputes`)
      .send({ reason: 'A second active dispute must not be created for the same collaboration.' });
    assert.equal(duplicate.status, 409);

    const evidence = await auth(creatorAccount.token)
      .post(`/api/v1/disputes/${dispute.id}/evidence`)
      .send({ url: '/uploads/day56.mp4', label: 'Creator delivery record', note: 'Evidence submitted for admin review.' });
    assert.equal(evidence.status, 200);
    assert.equal(evidence.body.data.dispute.status, 'UNDER_REVIEW');

    const frozen = await auth(creatorAccount.token)
      .post(`/api/v1/payments/${release.id}/payouts`)
      .send({ payoutAccountId: payoutAccount.id });
    assert.equal(frozen.status, 409);
    assert.equal(frozen.body.error.code, 'PAYMENT_FROZEN_BY_DISPUTE');

    await prisma.$transaction([
      prisma.trustCase.delete({ where: { id: dispute.id } }),
      prisma.collaboration.update({ where: { id: collaboration.id }, data: { status: 'COMPLETED' } }),
    ]);
  });

  test('persists participant messages, isolates outsiders and creates notifications', async () => {
    const conversations = await auth(businessAccount.token).get('/api/v1/conversations');
    assert.equal(conversations.status, 200);
    const conversation = conversations.body.data.items.find(
      (entry) => entry.collaboration?.id === collaboration.id,
    );
    assert.ok(conversation);

    const sent = await auth(businessAccount.token)
      .post(`/api/v1/conversations/${conversation.id}/messages`)
      .send({ body: 'Day 7 integration message.' });
    assert.equal(sent.status, 201);

    const hidden = await auth(outsiderAccount.token)
      .get(`/api/v1/conversations/${conversation.id}/messages`);
    assert.equal(hidden.status, 404);

    const visible = await auth(creatorAccount.token)
      .get(`/api/v1/conversations/${conversation.id}/messages`);
    assert.equal(visible.status, 200);
    assert.equal(visible.body.data.items.at(-1).body, 'Day 7 integration message.');

    const notifications = await auth(creatorAccount.token)
      .get('/api/v1/notifications?unread=true');
    assert.equal(notifications.status, 200);
    const messageNotification = notifications.body.data.items.find(
      (entry) => entry.type === 'MESSAGE' && entry.data?.conversationId === conversation.id,
    );
    assert.ok(messageNotification);

    assert.equal((await auth(creatorAccount.token)
      .post(`/api/v1/notifications/${messageNotification.id}/read`)
      .send({})).status, 200);
    assert.equal((await auth(creatorAccount.token)
      .post(`/api/v1/conversations/${conversation.id}/read`)
      .send({})).status, 200);
  });

  test('authorizes two realtime clients by conversation membership', async () => {
    const conversation = await prisma.conversation.findUnique({ where: { collaborationId: collaboration.id } });
    const httpServer = createServer(app);
    await setupRealtime(httpServer);
    await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
    const address = httpServer.address();
    const url = `http://127.0.0.1:${address.port}`;
    const businessSocket = createSocketClient(url, { auth: { token: businessAccount.token }, transports: ['websocket'] });
    const creatorSocket = createSocketClient(url, { auth: { token: creatorAccount.token }, transports: ['websocket'] });
    const outsiderSocket = createSocketClient(url, { auth: { token: outsiderAccount.token }, transports: ['websocket'] });
    const connected = (socket) => new Promise((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); });
    await Promise.all([connected(businessSocket), connected(creatorSocket), connected(outsiderSocket)]);
    const join = (socket) => new Promise((resolve) => socket.emit('conversation:join', { conversationId: conversation.id }, resolve));
    assert.equal((await join(businessSocket)).ok, true);
    assert.equal((await join(creatorSocket)).ok, true);
    assert.equal((await join(outsiderSocket)).ok, false);
    const businessReceived = new Promise((resolve) => businessSocket.once('message:created', resolve));
    const creatorReceived = new Promise((resolve) => creatorSocket.once('message:created', resolve));
    const sent = await auth(businessAccount.token).post(`/api/v1/conversations/${conversation.id}/messages`).send({ body: 'Realtime two-client message.' });
    assert.equal(sent.status, 201);
    const [left, right] = await Promise.all([businessReceived, creatorReceived]);
    assert.equal(left.message.id, sent.body.data.message.id);
    assert.equal(right.message.id, sent.body.data.message.id);
    businessSocket.disconnect(); creatorSocket.disconnect(); outsiderSocket.disconnect();
    await closeRealtime();
    await new Promise((resolve) => httpServer.close(resolve));
  });

  test('returns role-scoped analytics for supported ranges', async () => {
    const creatorAnalytics = await auth(creatorAccount.token)
      .get('/api/v1/analytics/summary?role=creator&range=1M');
    assert.equal(creatorAnalytics.status, 200);
    assert.equal(creatorAnalytics.body.data.role, 'creator');
    assert.equal(creatorAnalytics.body.data.range, '1M');
    assert.ok(creatorAnalytics.body.data.metrics.collaborations >= 1);

    const businessAnalytics = await auth(businessAccount.token)
      .get('/api/v1/analytics/summary?role=business&range=ALL');
    assert.equal(businessAnalytics.status, 200);
    assert.equal(businessAnalytics.body.data.role, 'business');
    assert.ok(Array.isArray(businessAnalytics.body.data.series));
  });

  test('returns owner-only campaign JSON and audited server PDF reports', async () => {
    const campaign = await prisma.campaign.create({ data: { businessId: business.id, title: 'Day 6 measurable report', slug: `day6-report-${stamp}`, description: 'Campaign report integration data.', category: 'Fashion', status: 'COMPLETED', currency: 'MNT' } });
    reportCampaign = campaign;
    await prisma.collaboration.update({ where: { id: collaboration.id }, data: { campaignId: campaign.id } });
    const proof = await prisma.publishProof.findFirst({ where: { collaborationId: collaboration.id }, orderBy: { createdAt: 'desc' } });
    await prisma.publishProof.update({ where: { id: proof.id }, data: { status: 'RETENTION_PENDING', metrics: { reach: 12000, views: 18500, engagement: 940 } } });
    const hidden = await auth(outsiderAccount.token).get(`/api/v1/analytics/campaigns/${campaign.id}/report`);
    assert.equal(hidden.status, 404);
    const json = await auth(businessAccount.token).get(`/api/v1/analytics/campaigns/${campaign.id}/report`);
    assert.equal(json.status, 200);
    assert.equal(json.body.data.report.totals.reach, 12000);
    assert.equal(json.body.data.report.totals.views, 18500);
    assert.equal(json.body.data.report.creators[0].proofLinks.length, 1);
    const pdf = await auth(businessAccount.token).get(`/api/v1/analytics/campaigns/${campaign.id}/report.pdf`);
    assert.equal(pdf.status, 200);
    assert.match(pdf.headers['content-type'], /application\/pdf/);
    assert.equal(pdf.body.subarray(0, 4).toString(), '%PDF');
    assert.ok(await prisma.analyticsEvent.findFirst({ where: { userId: (await prisma.user.findUnique({ where: { email: businessAccount.email } })).id, name: 'campaign_report_exported', resourceId: campaign.id } }));
  });

  test('issues expiring signed media URLs without weakening ownership checks', async () => {
    const creatorUser = await prisma.user.findUnique({ where: { email: creatorAccount.email } });
    const asset = await prisma.mediaAsset.findFirst({ where: { ownerId: creatorUser.id, deletedAt: null } });
    const signed = await auth(creatorAccount.token).post(`/api/v1/media/assets/${asset.id}/signed-download`).send({});
    assert.equal(signed.status, 200);
    const content = await request(app).get(signed.body.data.url);
    assert.equal(content.status, 200);
    const invalidUrl = new URL(signed.body.data.url, 'http://localhost');
    invalidUrl.searchParams.set('signature', '0'.repeat(64));
    assert.equal((await request(app).get(`${invalidUrl.pathname}${invalidUrl.search}`)).status, 401);
  });

  test('requires an admin role and writes an audit record atomically', async () => {
    const forbidden = await auth(outsiderAccount.token).get('/api/v1/admin/users');
    assert.equal(forbidden.status, 403);

    const admin = await prisma.user.update({
      where: { email: outsiderAccount.email },
      data: { roles: ['ADMIN'] },
    });
    const overview = await auth(outsiderAccount.token).get('/api/v1/admin/overview');
    assert.equal(overview.status, 200);
    assert.ok(overview.body.data.users >= 3);
    const financeOverview = await auth(outsiderAccount.token).get('/api/v1/admin/finance/overview');
    assert.equal(financeOverview.status, 200);
    assert.equal(typeof financeOverview.body.data.grossVolume, 'number');
    assert.equal(typeof financeOverview.body.data.escrowHeld, 'number');
    assert.equal(typeof financeOverview.body.data.adminWalletBalance, 'number');
    assert.ok(financeOverview.body.data.revenueBreakdown);
    const financeTransactions = await auth(outsiderAccount.token).get('/api/v1/admin/finance/transactions?currency=MNT&type=COLLABORATION_FUNDING&page=1&limit=5');
    assert.equal(financeTransactions.status, 200);
    assert.ok(Array.isArray(financeTransactions.body.data.items));
    if (financeTransactions.body.data.items[0]) {
      const transactionDetail = await auth(outsiderAccount.token).get(`/api/v1/admin/finance/transactions/${financeTransactions.body.data.items[0].id}`);
      assert.equal(transactionDetail.status, 200);
      assert.equal(transactionDetail.body.data.item.id, financeTransactions.body.data.items[0].id);
    }
    const financeRevenue = await auth(outsiderAccount.token).get('/api/v1/admin/finance/revenue?source=COMMISSIONS&page=1&limit=5');
    assert.equal(financeRevenue.status, 200);
    assert.ok(financeRevenue.body.data.summary);
    const financePayouts = await auth(outsiderAccount.token).get('/api/v1/admin/finance/payouts?page=1&limit=5');
    assert.equal(financePayouts.status, 200);
    assert.ok(financePayouts.body.data.summary);
    const financeRefunds = await auth(outsiderAccount.token).get('/api/v1/admin/finance/refunds?page=1&limit=5');
    assert.equal(financeRefunds.status, 200);
    const users = await auth(outsiderAccount.token).get('/api/v1/admin/users?page=1&limit=2');
    assert.equal(users.status, 200);
    assert.equal(users.body.data.items.length, 2);
    assert.ok(users.body.data.pagination.total >= 3);
    const target = await prisma.user.findUnique({ where: { email: businessAccount.email } });
    const updated = await auth(outsiderAccount.token)
      .patch(`/api/v1/admin/users/${target.id}/status`)
      .send({ status: 'SUSPENDED', reason: 'Day 7 atomic audit integration test.' });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.user.status, 'SUSPENDED');

    const verified = await auth(outsiderAccount.token).patch(`/api/v1/admin/channels/creator/${creator.id}/verification`).send({ status: 'VERIFIED', reason: 'Verified during Day 5 admin API integration.' });
    assert.equal(verified.status, 200);
    const paused = await auth(outsiderAccount.token).patch(`/api/v1/admin/campaigns/${reportCampaign.id}/status`).send({ status: 'PAUSED', reason: 'Paused during Day 5 admin API integration.' });
    assert.equal(paused.status, 200);
    const refunded = await auth(outsiderAccount.token).post(`/api/v1/admin/payments/${funding.id}/refund`).send({ amount: 1000, reason: 'Administrative partial refund integration test.' });
    assert.equal(refunded.status, 409);
    assert.equal(refunded.body.error.code, 'REFUND_NOT_ALLOWED');
    const creatorUser = await prisma.user.findUnique({ where: { email: creatorAccount.email } });
    const pendingPayout = await prisma.paymentPayout.create({ data: { paymentId: funding.id, creatorId: creatorUser.id, amount: 1000 } });
    const reconciled = await auth(outsiderAccount.token).patch(`/api/v1/admin/payouts/${pendingPayout.id}/reconcile`).send({ status: 'FAILED', reason: 'Provider reconciliation failed in integration test.' });
    assert.equal(reconciled.status, 200);
    const frozen = await auth(outsiderAccount.token).post(`/api/v1/admin/contracts/${contract.id}/freeze`).send({ reason: 'Freeze payment for Day 5 administrative review.' });
    assert.equal(frozen.status, 201);
    const announced = await auth(outsiderAccount.token).post('/api/v1/admin/announcements').send({ title: 'Day 5 API notice', body: 'Administrative announcement delivery integration test.', audience: 'ALL', reason: 'Test the audited announcement API.' });
    assert.equal(announced.status, 201);
    const reviewCase = await prisma.trustCase.create({ data: { kind: 'REPORT', targetType: 'CAMPAIGN', targetId: reportCampaign.id, reason: 'Day 5 trust case operation.' } });
    const resolved = await auth(outsiderAccount.token).post(`/api/v1/admin/cases/${reviewCase.id}/resolve`).send({ action: 'RESOLVE', resolution: 'Reviewed and resolved in the integration test.', reason: 'Confirm the trust resolution API operation.' });
    assert.equal(resolved.status, 200);

    const audit = await prisma.adminAction.findFirst({
      where: { actorId: admin.id, targetType: 'USER', targetId: target.id, action: 'USER_STATUS_CHANGED' },
      orderBy: { createdAt: 'desc' },
    });
    assert.ok(audit);
    assert.equal(audit.reason, 'Day 7 atomic audit integration test.');

    await prisma.$transaction([
      prisma.user.update({ where: { id: target.id }, data: { status: 'ACTIVE' } }),
      prisma.adminAction.delete({ where: { id: audit.id } }),
      prisma.creatorProfile.update({ where: { id: creator.id }, data: { verificationStatus: 'UNVERIFIED' } }),
      prisma.campaign.update({ where: { id: reportCampaign.id }, data: { status: 'COMPLETED', isPublic: false } }),
      prisma.trustCase.delete({ where: { id: frozen.body.data.trustCaseId } }),
      prisma.paymentPayout.delete({ where: { id: pendingPayout.id } }),
      prisma.trustCase.delete({ where: { id: reviewCase.id } }),
    ]);
  });

  test('resolves wallet-funded disputes without debiting the already-cleared escrow account', async () => {
    const [businessRecord, creatorRecord] = await Promise.all([
      prisma.businessProfile.findUnique({ where: { id: business.id } }),
      prisma.creatorProfile.findUnique({ where: { id: creator.id } }),
    ]);
    const scoped = await prisma.collaboration.create({
      data: {
        businessId: business.id,
        creatorId: creator.id,
        status: 'IN_PROGRESS',
        progress: 70,
        terms: { budget: 1000000, cashAmount: 1000000, currency: 'MNT', paymentType: 'PAID' },
        paymentType: 'PAID',
        cashAmount: 1000000,
      },
    });
    const walletPayment = await prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          collaborationId: scoped.id,
          type: 'FUNDING',
          compensationType: 'PAID',
          status: 'FUNDED',
          amount: 1000000,
          cashAmount: 1000000,
          commissionRate: 10,
          commissionAmount: 100000,
          creatorAmount: 900000,
          platformFee: 100000,
          currency: 'MNT',
          provider: 'internal',
          metadata: { source: 'BUSINESS_WALLET' },
          fundedAt: new Date(),
          processedAt: new Date(),
        },
      });
      await postLedgerBatch(tx, ledgerRules.walletTopUp({
        eventId: `dispute-topup-${scoped.id}`,
        topUp: { id: `dispute-topup-${scoped.id}`, userId: businessRecord.userId, amount: 1000000, currency: 'MNT' },
      }));
      await postLedgerBatch(tx, ledgerRules.walletFunding({ payment: created, businessUserId: businessRecord.userId, creatorUserId: creatorRecord.userId }));
      await tx.platformRevenue.create({ data: { paymentId: created.id, collaborationId: scoped.id, source: 'PAID_COMMISSION', status: 'PENDING', amount: 100000, currency: 'MNT' } });
      return created;
    });
    const dispute = await prisma.trustCase.create({
      data: { kind: 'DISPUTE', status: 'UNDER_REVIEW', reporterId: businessRecord.userId, targetType: 'COLLABORATION', targetId: scoped.id, reason: 'Wallet dispute settlement integration fixture.' },
    });

    const resolved = await auth(outsiderAccount.token)
      .post(`/api/v1/admin/disputes/${dispute.id}/resolve`)
      .send({ award: 'SPLIT', creatorPercent: 40, reason: 'Award forty percent to the creator after reviewing both parties evidence.' });
    assert.equal(resolved.status, 200);

    const [updatedPayment, updatedCollaboration, entries, refund, revenue] = await Promise.all([
      prisma.payment.findUnique({ where: { id: walletPayment.id } }),
      prisma.collaboration.findUnique({ where: { id: scoped.id } }),
      prisma.ledgerEntry.findMany({ where: { postingBatchId: `wallet-dispute:${dispute.id}` }, orderBy: { idempotencyKey: 'asc' } }),
      prisma.paymentRefund.findFirst({ where: { paymentId: walletPayment.id } }),
      prisma.platformRevenue.findUnique({ where: { paymentId: walletPayment.id } }),
    ]);
    assert.equal(updatedPayment.status, 'RELEASED');
    assert.equal(Number(updatedPayment.creatorAmount), 360000);
    assert.equal(Number(updatedPayment.platformFee), 40000);
    assert.equal(updatedCollaboration.status, 'COMPLETED');
    assert.deepEqual(entries.map((entry) => Number(entry.amount)), [360000, 40000, 540000, 60000]);
    assert.equal(Number(refund.amount), 600000);
    assert.equal(revenue.status, 'EARNED');
    assert.equal(Number(revenue.amount), 40000);
    await prisma.trustCase.delete({ where: { id: dispute.id } });
  });
});

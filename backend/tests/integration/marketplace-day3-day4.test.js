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
process.env.CLIENT_URL ||= 'http://localhost:5173';

const { app } = await import('../../src/app.js');
const { prisma } = await import('../../src/config/database.js');
const { getTestVerificationCode } = await import('../../src/modules/auth/auth.email.js');
const { handleNotificationEvent } = await import('../../src/modules/notifications/notification.consumer.js');

const stamp = Date.now();
const prefix = `day34-test-${stamp}`;
const password = 'Password123!';
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);
const uploadedPaths = [];
let businessAccount;
let otherBusinessAccount;
let creatorAccount;
let business;
let creator;
let portfolio;
let showcase;
let campaign;
let proposal;

const auth = (token) => ({
  get: (url) => request(app).get(url).set('Authorization', `Bearer ${token}`),
  post: (url) => request(app).post(url).set('Authorization', `Bearer ${token}`),
  put: (url) => request(app).put(url).set('Authorization', `Bearer ${token}`),
  patch: (url) => request(app).patch(url).set('Authorization', `Bearer ${token}`),
  delete: (url) => request(app).delete(url).set('Authorization', `Bearer ${token}`),
});

async function account(label) {
  const email = `${prefix}-${label}@example.com`;
  const registered = await request(app).post('/api/v1/auth/register').send({
    email,
    displayName: `${label} Day 34`,
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
    .attach('file', png, { filename: 'showcase.png', contentType: 'image/png' });
  assert.equal(response.status, 201);
  const asset = response.body.data.asset;
  const stored = await prisma.mediaAsset.findUnique({ where: { id: asset.id }, select: { storageKey: true } });
  uploadedPaths.push(path.resolve(process.cwd(), 'uploads', 'media', stored.storageKey));
  return asset;
}

async function cleanup() {
  await prisma.shareEvent.deleteMany({
    where: { user: { email: { startsWith: prefix } } },
  });
  const users = await prisma.user.findMany({
    where: { email: { startsWith: prefix } },
    select: { id: true },
  });
  const userIds = users.map((user) => user.id);
  if (userIds.length) {
    const offers = await prisma.workOffer.findMany({
      where: {
        OR: [
          { business: { userId: { in: userIds } } },
          { creator: { userId: { in: userIds } } },
        ],
      },
      select: { id: true, collaboration: { select: { id: true } } },
    });
    const collaborationIds = offers.map((offer) => offer.collaboration?.id).filter(Boolean);
    if (collaborationIds.length) {
      await prisma.collaboration.deleteMany({ where: { id: { in: collaborationIds } } });
    }
    const offerIds = offers.map((offer) => offer.id);
    if (offerIds.length) await prisma.workOffer.deleteMany({ where: { id: { in: offerIds } } });
  }
  await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
  await Promise.all(uploadedPaths.splice(0).map((file) => fs.unlink(file).catch(() => {})));
}

before(async () => {
  await cleanup();
  businessAccount = await account('business');
  otherBusinessAccount = await account('other-business');
  creatorAccount = await account('creator');

  const businessResponse = await auth(businessAccount.token).post('/api/v1/business/profile').send({
    organization: 'Day 34 Studio',
    username: `day34_studio_${stamp}`.slice(0, 30),
    description: 'A test business for campaign workflow integration.',
    industry: 'Fashion',
  });
  assert.equal(businessResponse.status, 201);
  business = businessResponse.body.data.profile;

  const otherBusiness = await auth(otherBusinessAccount.token).post('/api/v1/business/profile').send({
    organization: 'Other Day 34 Studio',
    username: `other_day34_${stamp}`.slice(0, 30),
    description: 'A second business used for authorization tests.',
    industry: 'Technology',
  });
  assert.equal(otherBusiness.status, 201);

  const asset = await upload(creatorAccount.token);
  const creatorResponse = await auth(creatorAccount.token).post('/api/v1/creator/profile').send({
    channelName: 'Day 34 Creator',
    username: `day34_creator_${stamp}`.slice(0, 30),
    bio: 'Creator used to test persistent marketplace actions.',
    niche: 'Fashion',
    sampleMediaId: asset.id,
    workTitle: 'Day 34 Portfolio',
    workCategory: 'Fashion',
    workDescription: 'Portfolio work used by the showcase integration test.',
  });
  assert.equal(creatorResponse.status, 201);
  creator = creatorResponse.body.data.profile;
  portfolio = creator.portfolio[0];
});

after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe('Day 3 persistent discovery and library APIs', () => {
  test('persists save, follow, recent and share actions idempotently', async () => {
    const client = auth(businessAccount.token);
    const saveUrl = `/api/v1/library/saved/creator/${creator.id}`;
    assert.equal((await client.put(saveUrl).send({})).status, 200);
    assert.equal((await client.put(saveUrl).send({})).status, 200);

    const followUrl = `/api/v1/library/following/creator/${creator.id}`;
    assert.equal((await client.put(followUrl).send({})).status, 200);
    assert.equal((await client.put(followUrl).send({})).status, 200);

    assert.equal((await client.post('/api/v1/library/recent').send({
      targetType: 'creator',
      targetId: creator.id,
    })).status, 200);
    assert.equal((await client.post('/api/v1/library/shares').send({
      targetType: 'creator',
      targetId: creator.id,
      channel: 'clipboard',
    })).status, 201);

    const state = await client.get('/api/v1/library');
    assert.equal(state.status, 200);
    assert.deepEqual(state.body.data.saved, [`creator:${creator.id}`]);
    assert.deepEqual(state.body.data.following, [`creator:${creator.id}`]);
    assert.deepEqual(state.body.data.recent, [`creator:${creator.id}`]);

    const selfFollow = await auth(creatorAccount.token)
      .put(`/api/v1/library/following/creator/${creator.id}`)
      .send({});
    assert.equal(selfFollow.status, 409);
    assert.equal(selfFollow.body.error.code, 'SELF_FOLLOW_NOT_ALLOWED');
  });

  test('enforces collection visibility, ownership and canonical target items', async () => {
    const owner = auth(businessAccount.token);
    const created = await owner.post('/api/v1/collections').send({
      name: 'Day 34 references',
      description: 'Private campaign research.',
      visibility: 'private',
    });
    assert.equal(created.status, 201);
    const collectionId = created.body.data.collection.id;

    const added = await owner
      .put(`/api/v1/collections/${collectionId}/items/creator/${creator.slug}`)
      .send({ note: 'Strong creative fit.' });
    assert.equal(added.status, 200);
    assert.equal(added.body.data.collection.items[0].targetId, creator.id);

    assert.equal((await request(app).get(`/api/v1/collections/${collectionId}`)).status, 404);
    assert.equal(
      (await auth(otherBusinessAccount.token).get(`/api/v1/collections/${collectionId}`)).status,
      404,
    );

    const published = await owner.patch(`/api/v1/collections/${collectionId}`).send({
      visibility: 'public',
    });
    assert.equal(published.status, 200);
    const publicDetail = await request(app).get(`/api/v1/collections/${collectionId}`);
    assert.equal(publicDetail.status, 200);
    assert.equal(publicDetail.body.data.collection.items[0].key, `creator:${creator.id}`);
  });

  test('publishes portfolio work to showcase and persists reactions', async () => {
    const creatorClient = auth(creatorAccount.token);
    const created = await creatorClient.post('/api/v1/showcase').send({
      portfolioItemId: portfolio.id,
      status: 'PUBLISHED',
    });
    assert.equal(created.status, 201);
    showcase = created.body.data.post;

    const publicFeed = await request(app).get('/api/v1/showcase').query({ limit: 10 });
    assert.equal(publicFeed.status, 200);
    assert.ok(publicFeed.body.data.items.some((item) => item.id === showcase.id));

    const followerFeed = await auth(businessAccount.token)
      .get('/api/v1/showcase/following')
      .query({ limit: 10 });
    assert.equal(followerFeed.status, 200);
    assert.ok(followerFeed.body.data.items.some((item) => item.id === showcase.id));

    const likeUrl = `/api/v1/showcase/${showcase.id}/reactions/like`;
    assert.equal((await auth(businessAccount.token).put(likeUrl).send({})).status, 200);
    const likedAgain = await auth(businessAccount.token).put(likeUrl).send({});
    assert.equal(likedAgain.status, 200);
    assert.equal(likedAgain.body.data.post.reactionCount, 1);
  });

  test('returns deterministic discover and combined search sections', async () => {
    const discover = await request(app).get('/api/v1/marketplace/discover').query({ limit: 6 });
    assert.equal(discover.status, 200);
    assert.ok(discover.body.data.creators.some((item) => item.id === creator.id));
    assert.ok(Array.isArray(discover.body.data.showcase));

    const search = await request(app).get('/api/v1/search').query({
      type: 'creators',
      q: 'Day 34 Creator',
      category: 'Fashion',
    });
    assert.equal(search.status, 200);
    assert.ok(search.body.data.creators.items.some((item) => item.id === creator.id));
  });
});

describe('Day 4 campaign, proposal and sourcing APIs', () => {
  test('creates, protects and publishes a versioned campaign', async () => {
    const created = await auth(businessAccount.token).post('/api/v1/business/campaigns').send({
      title: 'Day 34 Campaign',
      description: 'A complete creator brief for the Day 3 and Day 4 integration test.',
      category: 'Fashion',
      goal: 'Product launch',
      platforms: ['INSTAGRAM'],
      budgetMin: 1000000,
      budgetMax: 2000000,
      applicationDeadline: new Date(Date.now() + 86400000 * 7).toISOString(),
      deliverables: ['One reel', 'Three stories'],
      productSupport: { provided: true, description: 'One hero product plus shipping.', estimatedValue: 150000, currency: 'mnt' },
    });
    assert.equal(created.status, 201);
    campaign = created.body.data.campaign;
    assert.equal(campaign.status, 'DRAFT');
    assert.deepEqual(campaign.productSupport, {
      provided: true,
      description: 'One hero product plus shipping.',
      estimatedValue: 150000,
      currency: 'MNT',
    });

    assert.equal((await request(app).get(`/api/v1/campaigns/${campaign.id}`)).status, 404);
    const forbidden = await auth(otherBusinessAccount.token)
      .patch(`/api/v1/business/campaigns/${campaign.id}`)
      .send({ title: 'Stolen edit', version: campaign.version });
    assert.equal(forbidden.status, 403);

    const firstUpdate = await auth(businessAccount.token)
      .patch(`/api/v1/business/campaigns/${campaign.id}`)
      .send({ goal: 'Updated launch', version: campaign.version });
    assert.equal(firstUpdate.status, 200);
    const staleUpdate = await auth(businessAccount.token)
      .patch(`/api/v1/business/campaigns/${campaign.id}`)
      .send({ goal: 'Stale launch', version: campaign.version });
    assert.equal(staleUpdate.status, 409);
    assert.equal(staleUpdate.body.error.code, 'CAMPAIGN_VERSION_CONFLICT');
    campaign = firstUpdate.body.data.campaign;

    const published = await auth(businessAccount.token)
      .post(`/api/v1/business/campaigns/${campaign.id}/publish`)
      .send({ isPublic: true });
    assert.equal(published.status, 200);
    campaign = published.body.data.campaign;
    assert.equal(campaign.status, 'OPEN');
    assert.equal((await request(app).get(`/api/v1/campaigns/${campaign.slug}`)).status, 200);
  });

  test('manages campaign brief and brand guideline attachments with ownership checks', async () => {
    const brief = await upload(businessAccount.token, 'CAMPAIGN_BRIEF');
    const foreignAsset = await upload(creatorAccount.token, 'CAMPAIGN_BRIEF');

    const forbiddenUpload = await auth(otherBusinessAccount.token)
      .post(`/api/v1/business/campaigns/${campaign.id}/attachments`)
      .send({ mediaAssetId: brief.id, name: 'Brief.png', url: brief.url, kind: 'BRIEF' });
    assert.equal(forbiddenUpload.status, 403);

    const unowned = await auth(businessAccount.token)
      .post(`/api/v1/business/campaigns/${campaign.id}/attachments`)
      .send({ mediaAssetId: foreignAsset.id, name: 'Not mine.png', url: foreignAsset.url, kind: 'BRIEF' });
    assert.equal(unowned.status, 404);
    assert.equal(unowned.body.error.code, 'MEDIA_NOT_FOUND');

    const added = await auth(businessAccount.token)
      .post(`/api/v1/business/campaigns/${campaign.id}/attachments`)
      .send({
        mediaAssetId: brief.id,
        name: 'Campaign brief.png',
        url: brief.url,
        mimeType: 'image/png',
        sizeBytes: 68,
        kind: 'BRIEF',
      });
    assert.equal(added.status, 201);
    const attachment = added.body.data.campaign.attachments.find((item) => item.name === 'Campaign brief.png');
    assert.ok(attachment);
    assert.equal(attachment.kind, 'BRIEF');

    const removeForbidden = await auth(otherBusinessAccount.token)
      .delete(`/api/v1/business/campaigns/${campaign.id}/attachments/${attachment.id}`);
    assert.equal(removeForbidden.status, 403);

    const removed = await auth(businessAccount.token)
      .delete(`/api/v1/business/campaigns/${campaign.id}/attachments/${attachment.id}`);
    assert.equal(removed.status, 200);
    assert.ok(!removed.body.data.campaign.attachments.some((item) => item.id === attachment.id));
  });

  test('enforces unique proposal and business decision transitions', async () => {
    const submitted = await auth(creatorAccount.token)
      .post(`/api/v1/campaigns/${campaign.slug}/proposals`)
      .send({
        amount: 1500000,
        currency: 'MNT',
        timeline: 'Three weeks',
        message: 'I will create a useful editorial story with a clear audience-first product narrative.',
        deliverables: 'One reel and three stories',
      });
    assert.equal(submitted.status, 201);
    proposal = submitted.body.data.proposal;
    const submittedEvent = await prisma.outboxEvent.findFirst({
      where: { topic: 'proposal.submitted', aggregateId: proposal.id },
      orderBy: { createdAt: 'desc' },
    });
    assert.ok(submittedEvent);
    await handleNotificationEvent({
      id: submittedEvent.id,
      topic: submittedEvent.topic,
      aggregateId: submittedEvent.aggregateId,
      payload: submittedEvent.payload,
    });
    const businessNotification = await prisma.notification.findUnique({
      where: { userId_sourceEventId: { userId: (await prisma.user.findUnique({ where: { email: businessAccount.email } })).id, sourceEventId: submittedEvent.id } },
    });
    assert.equal(businessNotification?.href, `/business/proposals/${proposal.id}`);

    const duplicate = await auth(creatorAccount.token)
      .post(`/api/v1/campaigns/${campaign.id}/proposals`)
      .send({
        amount: 1500000,
        timeline: 'Three weeks',
        message: 'This second proposal should be rejected because campaign and creator are unique.',
      });
    assert.equal(duplicate.status, 409);

    const shortlisted = await auth(businessAccount.token)
      .post(`/api/v1/business/proposals/${proposal.id}/decision`)
      .send({ action: 'SHORTLIST', version: proposal.version });
    assert.equal(shortlisted.status, 200);
    proposal = shortlisted.body.data.proposal;
    assert.equal(proposal.status, 'SHORTLISTED');
    const shortlistedEvent = await prisma.outboxEvent.findFirst({
      where: { topic: 'proposal.shortlisted', aggregateId: proposal.id },
      orderBy: { createdAt: 'desc' },
    });
    assert.ok(shortlistedEvent);
    await handleNotificationEvent({
      id: shortlistedEvent.id,
      topic: shortlistedEvent.topic,
      aggregateId: shortlistedEvent.aggregateId,
      payload: shortlistedEvent.payload,
    });
    const creatorNotification = await prisma.notification.findUnique({
      where: { userId_sourceEventId: { userId: (await prisma.user.findUnique({ where: { email: creatorAccount.email } })).id, sourceEventId: shortlistedEvent.id } },
    });
    assert.equal(creatorNotification?.href, '/creator/proposals');

    const invalid = await auth(businessAccount.token)
      .post(`/api/v1/business/proposals/${proposal.id}/decision`)
      .send({ action: 'SHORTLIST', version: proposal.version });
    assert.equal(invalid.status, 409);

    const shortlist = await auth(businessAccount.token)
      .get('/api/v1/business/shortlist')
      .query({ campaignId: campaign.id });
    assert.equal(shortlist.status, 200);
    assert.ok(shortlist.body.data.items.some((item) => item.creatorId === creator.id));
  });

  test('persists compare selection and invitation response with owner checks', async () => {
    const compareUrl = `/api/v1/business/compare/${creator.id}`;
    assert.equal((await auth(businessAccount.token).put(compareUrl).send({
      campaignId: campaign.id,
    })).status, 200);
    assert.equal((await auth(businessAccount.token).put(compareUrl).send({
      campaignId: campaign.id,
    })).status, 200);
    const compared = await auth(businessAccount.token)
      .get('/api/v1/business/compare')
      .query({ campaignId: campaign.id });
    assert.equal(compared.status, 200);
    assert.equal(compared.body.data.items.length, 1);

    const invited = await auth(businessAccount.token)
      .post('/api/v1/business/invitations')
      .send({
        campaignId: campaign.id,
        creatorId: creator.id,
        message: 'We would like to invite you to this creator campaign.',
      });
    assert.equal(invited.status, 201);
    const invitationId = invited.body.data.invitation.id;

    const creatorInvitations = await auth(creatorAccount.token)
      .get('/api/v1/creator/invitations');
    assert.equal(creatorInvitations.status, 200);
    assert.ok(creatorInvitations.body.data.items.some((item) => item.id === invitationId));

    const accepted = await auth(creatorAccount.token)
      .post(`/api/v1/creator/invitations/${invitationId}/respond`)
      .send({ action: 'ACCEPT' });
    assert.equal(accepted.status, 200);
    assert.equal(accepted.body.data.invitation.status, 'ACCEPTED');
    assert.ok(accepted.body.data.invitation.workspaceId);
    assert.equal(await prisma.collaboration.count({
      where: { id: accepted.body.data.invitation.workspaceId, campaignId: campaign.id, creatorId: creator.id },
    }), 1);
    assert.equal(await prisma.workOffer.count({
      where: { sourceType: 'INVITATION', sourceId: invitationId, status: 'APPROVED' },
    }), 1);

    const cancelAccepted = await auth(businessAccount.token)
      .post(`/api/v1/business/invitations/${invitationId}/cancel`)
      .send({});
    assert.equal(cancelAccepted.status, 409);
  });

  test('hides creator, business and campaign records when their owner account is inactive', async () => {
    const users = await prisma.user.findMany({
      where: { email: { in: [creatorAccount.email, businessAccount.email] } },
      select: { id: true },
    });
    const userIds = users.map((user) => user.id);
    await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { status: 'SUSPENDED' },
    });

    try {
      assert.equal((await request(app).get(`/api/v1/creators/${creator.id}`)).status, 404);
      assert.equal((await request(app).get(`/api/v1/businesses/${business.id}`)).status, 404);
      assert.equal((await request(app).get(`/api/v1/campaigns/${campaign.slug}`)).status, 404);

      const creators = await request(app).get('/api/v1/creators').query({ q: 'Day 34 Creator' });
      const businesses = await request(app).get('/api/v1/businesses').query({ q: 'Day 34 Studio' });
      const campaigns = await request(app).get('/api/v1/campaigns').query({ q: 'Day 34 Campaign' });
      assert.equal(creators.status, 200);
      assert.equal(businesses.status, 200);
      assert.equal(campaigns.status, 200);
      assert.ok(!creators.body.data.items.some((item) => item.id === creator.id));
      assert.ok(!businesses.body.data.items.some((item) => item.id === business.id));
      assert.ok(!campaigns.body.data.items.some((item) => item.id === campaign.id));
    } finally {
      await prisma.user.updateMany({
        where: { id: { in: userIds } },
        data: { status: 'ACTIVE' },
      });
    }
  });
});

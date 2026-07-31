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

const stamp = Date.now();
const prefix = `day2-test-${stamp}`;
const password = 'Password123!';
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);
const uploadedPaths = [];
let first;
let second;
let creator;
let business;
let portfolioAsset;
let secondPortfolioAsset;

async function account(label) {
  const email = `${prefix}-${label}@example.com`;
  const registered = await request(app).post('/api/v1/auth/register').send({
    email,
    displayName: `${label} tester`,
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

const auth = (token) => ({
  get: (url) => request(app).get(url).set('Authorization', `Bearer ${token}`),
  post: (url) => request(app).post(url).set('Authorization', `Bearer ${token}`),
  patch: (url) => request(app).patch(url).set('Authorization', `Bearer ${token}`),
  delete: (url) => request(app).delete(url).set('Authorization', `Bearer ${token}`),
});

async function upload(token, purpose, filename = 'sample.png') {
  const response = await auth(token).post('/api/v1/media/uploads')
    .field('purpose', purpose)
    .attach('file', png, { filename, contentType: 'image/png' });
  assert.equal(response.status, 201);
  const asset = response.body.data.asset;
  uploadedPaths.push(path.resolve(process.cwd(), asset.url.replace(/^\//, '')));
  return asset;
}

async function cleanup() {
  await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
  await Promise.all(uploadedPaths.splice(0).map((file) => fs.unlink(file).catch(() => {})));
}

before(async () => {
  await cleanup();
  first = await account('owner');
  second = await account('other');
});

after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe('Day 2 media, portfolio and public marketplace APIs', () => {
  test('rejects spoofed media and stores a valid owner-scoped asset', async () => {
    const invalid = await auth(first.token).post('/api/v1/media/uploads')
      .field('purpose', 'AVATAR')
      .attach('file', Buffer.from('not a png'), {
        filename: 'spoof.png',
        contentType: 'image/png',
      });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.error.code, 'INVALID_MEDIA_SIGNATURE');

    const avatar = await upload(first.token, 'AVATAR', 'avatar.png');
    const cover = await upload(first.token, 'COVER', 'cover.png');
    portfolioAsset = await upload(first.token, 'PORTFOLIO', 'portfolio.png');

    const create = await auth(first.token).post('/api/v1/creator/profile').send({
      channelName: 'Day Two Creator',
      username: `day2_creator_${stamp}`.slice(0, 30),
      bio: 'A public creator profile backed by PostgreSQL.',
      niche: 'Travel',
      location: 'Ulaanbaatar',
      instagram: 'instagram.com/day-two-creator',
      postRate: '1900000',
      publicRates: false,
      avatarMediaId: avatar.id,
      coverMediaId: cover.id,
      sampleMediaId: portfolioAsset.id,
      workTitle: 'Launch sample',
      workCategory: 'Brand campaign',
      workDescription: 'Initial onboarding portfolio work.',
    });
    assert.equal(create.status, 201);
    creator = create.body.data.profile;
    assert.equal(creator.avatarUrl, avatar.url);
    assert.equal(creator.portfolio.length, 1);
    assert.equal(creator.instagram, 'https://instagram.com/day-two-creator');

    const deleteInUse = await auth(first.token).delete(`/api/v1/media/uploads/${portfolioAsset.id}`);
    assert.equal(deleteInUse.status, 409);
    assert.equal(deleteInUse.body.error.code, 'MEDIA_IN_USE');
  });

  test('returns safe public creator detail and filtered paginated list', async () => {
    const detail = await request(app).get(`/api/v1/creators/${creator.id}`);
    assert.equal(detail.status, 200);
    assert.equal(detail.body.data.creator.name, 'Day Two Creator');
    assert.equal(detail.body.data.creator.startingRate, null);
    assert.equal(detail.body.data.creator.rates, null);
    assert.equal(detail.body.data.creator.userId, undefined);
    assert.equal(detail.body.data.creator.portfolio.length, 1);

    const list = await request(app)
      .get('/api/v1/creators')
      .query({
        q: 'Day Two',
        category: 'Travel',
        location: 'Ulaan',
        platform: 'INSTAGRAM',
        available: 'true',
        page: 1,
        limit: 5,
      });
    assert.equal(list.status, 200);
    assert.ok(list.body.data.items.some((item) => item.id === creator.id));
    assert.equal(list.body.data.pagination.page, 1);
    assert.equal(list.body.data.pagination.limit, 5);

    const categories = await request(app).get('/api/v1/categories');
    assert.equal(categories.status, 200);
    assert.ok(
      categories.body.data.categories.find((item) => item.name === 'Travel').creatorCount >= 1,
    );
  });

  test('enforces portfolio ownership, draft visibility, publish and soft delete', async () => {
    secondPortfolioAsset = await upload(first.token, 'PORTFOLIO', 'second-work.png');
    const create = await auth(first.token).post('/api/v1/creator/portfolio').send({
      title: 'Private draft',
      category: 'Editorial',
      mediaAssetId: secondPortfolioAsset.id,
      status: 'DRAFT',
      sortOrder: 2,
    });
    assert.equal(create.status, 201);
    const itemId = create.body.data.item.id;
    assert.equal((await request(app).get(`/api/v1/portfolio/${itemId}`)).status, 404);

    const otherCreator = await auth(second.token).post('/api/v1/creator/profile').send({
      channelName: 'Other Creator',
      username: `other_creator_${stamp}`.slice(0, 30),
      niche: 'Technology',
    });
    assert.equal(otherCreator.status, 201);
    const stolen = await auth(second.token).post('/api/v1/creator/portfolio').send({
      title: 'Stolen asset',
      mediaAssetId: secondPortfolioAsset.id,
    });
    assert.equal(stolen.status, 404);
    assert.equal(stolen.body.error.code, 'MEDIA_NOT_FOUND');

    const publish = await auth(first.token).patch(`/api/v1/creator/portfolio/${itemId}`).send({
      status: 'PUBLISHED',
      title: 'Published work',
    });
    assert.equal(publish.status, 200);
    const publicItem = await request(app).get(`/api/v1/portfolio/${itemId}`);
    assert.equal(publicItem.status, 200);
    assert.equal(publicItem.body.data.item.creator.id, creator.id);

    const remove = await auth(first.token).delete(`/api/v1/creator/portfolio/${itemId}`);
    assert.equal(remove.status, 200);
    assert.equal((await request(app).get(`/api/v1/portfolio/${itemId}`)).status, 404);
  });

  test('creates a media-backed business and exposes a private-safe public DTO', async () => {
    const logo = await upload(first.token, 'LOGO', 'logo.png');
    const cover = await upload(first.token, 'COVER', 'business-cover.png');
    const create = await auth(first.token).post('/api/v1/business/profile').send({
      organization: 'Day Two Studio',
      username: `day2_business_${stamp}`.slice(0, 30),
      description: 'A business profile for marketplace contract testing.',
      industry: 'Technology',
      location: 'Ulaanbaatar',
      contactEmail: first.email,
      logoMediaId: logo.id,
      coverMediaId: cover.id,
    });
    assert.equal(create.status, 201);
    business = create.body.data.profile;
    assert.equal(business.logoUrl, logo.url);

    const detail = await request(app).get(`/api/v1/businesses/${business.id}`);
    assert.equal(detail.status, 200);
    assert.equal(detail.body.data.business.name, 'Day Two Studio');
    assert.equal(detail.body.data.business.contactEmail, undefined);
    assert.equal(detail.body.data.business.userId, undefined);

    const list = await request(app).get('/api/v1/businesses').query({
      q: 'Day Two',
      industry: 'Tech',
      page: 1,
      limit: 3,
    });
    assert.equal(list.status, 200);
    assert.ok(list.body.data.items.some((item) => item.id === business.id));
  });
});

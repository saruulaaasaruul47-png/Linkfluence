import 'dotenv/config';
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET ||= 'test-access-secret-with-at-least-32-characters';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-with-at-least-32-characters';
process.env.JWT_PASSWORD_RESET_SECRET ||= 'test-reset-secret-with-at-least-32-characters';
process.env.CLIENT_URL ||= 'http://localhost:5173';

const { app } = await import('../../src/app.js');
const { prisma } = await import('../../src/config/database.js');
const { signAccessToken } = await import('../../src/shared/utils/jwt.js');

const stamp = Date.now();
const prefix = `ranking-day3-${stamp}`;
const creators = [];
const businesses = [];
let creatorToken;
let viewer;
let viewerToken;
let posts;

async function createCreator(index, options) {
  const user = await prisma.user.create({
    data: {
      email: `${prefix}-creator-${index}@example.com`,
      displayName: options.name,
      roles: ['VIEWER', 'CREATOR'],
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });
  const profile = await prisma.creatorProfile.create({
    data: {
      userId: user.id,
      channelName: options.name,
      slug: `${prefix}-creator-${index}`,
      bio: options.bio || `${options.name} creator description`,
      location: options.location,
      categories: options.categories,
      skills: options.skills,
      languages: options.languages,
      startingRate: options.rate,
      currency: options.currency || 'MNT',
      verificationStatus: options.verified ? 'VERIFIED' : 'UNVERIFIED',
      availableForWork: options.available,
      ratingAverage: options.rating,
      ratingCount: options.rating ? 5 : 0,
      createdAt: new Date(Date.now() - index * 60_000),
      socialAccounts: {
        create: options.socials.map((social, socialIndex) => ({
          platform: social.platform,
          handle: `${prefix}-${index}-${socialIndex}`,
          followerCount: social.followers,
          engagementRate: social.engagement,
        })),
      },
    },
  });
  return { user, profile };
}

async function createBusiness(index, options) {
  const user = await prisma.user.create({
    data: {
      email: `${prefix}-business-${index}@example.com`,
      displayName: options.name,
      roles: ['VIEWER', 'BUSINESS'],
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });
  const profile = await prisma.businessProfile.create({
    data: {
      userId: user.id,
      companyName: options.name,
      slug: `${prefix}-business-${index}`,
      description: options.description,
      industry: options.industry,
      location: options.location,
      verificationStatus: options.verified ? 'VERIFIED' : 'UNVERIFIED',
      ratingAverage: options.rating,
      ratingCount: options.rating ? 3 : 0,
      createdAt: new Date(Date.now() - index * 60_000),
    },
  });
  return { user, profile };
}

before(async () => {
  creators.push(
    await createCreator(1, {
      name: 'Alpha Fashion', location: 'Ulaanbaatar', categories: ['Fashion'], skills: ['Editing', 'Styling'], languages: ['Mongolian', 'English'],
      rate: 1_200_000, verified: true, available: true, rating: 4.9,
      socials: [{ platform: 'INSTAGRAM', followers: 120_000, engagement: 8.5 }, { platform: 'YOUTUBE', followers: 55_000, engagement: 6.2 }],
    }),
    await createCreator(2, {
      name: 'Beta Travel', location: 'Seoul', categories: ['Travel'], skills: ['Film'], languages: ['English', 'Korean'],
      rate: 2_500, currency: 'USD', verified: false, available: true, rating: 4.4,
      socials: [{ platform: 'YOUTUBE', followers: 320_000, engagement: 5.1 }],
    }),
    await createCreator(3, {
      name: 'Gamma Food', location: 'Ulaanbaatar', categories: ['Food'], skills: ['Recipe', 'Photography'], languages: ['Mongolian'],
      rate: 2_100_000, verified: true, available: false, rating: 4.8,
      socials: [{ platform: 'TIKTOK', followers: 90_000, engagement: 11.2 }],
    }),
    await createCreator(4, {
      name: 'Delta Fashion', location: 'Darkhan', categories: ['Fashion'], skills: ['Editing'], languages: ['Mongolian'],
      rate: 900_000, verified: false, available: true, rating: 4.1,
      socials: [{ platform: 'INSTAGRAM', followers: 60_000, engagement: 4.2 }],
    }),
  );

  businesses.push(
    await createBusiness(1, { name: 'Aero Brand', description: 'Travel stories across Mongolia', industry: 'Travel', location: 'Ulaanbaatar', verified: true, rating: 4.8 }),
    await createBusiness(2, { name: 'Beauty House', description: 'Beauty creator partnerships', industry: 'Beauty', location: 'Seoul', verified: false, rating: 4.2 }),
    await createBusiness(3, { name: 'Code Studio', description: 'Technology campaigns', industry: 'Technology', location: 'Ulaanbaatar', verified: true, rating: 4.6 }),
  );

  for (let index = 0; index < 3; index += 1) {
    await prisma.collaboration.create({
      data: {
        businessId: businesses[0].profile.id,
        creatorId: creators[index % creators.length].profile.id,
        status: 'COMPLETED',
        progress: 100,
        terms: { source: 'day3-test' },
        completedAt: new Date(),
      },
    });
  }
  await prisma.collaboration.create({
    data: { businessId: businesses[2].profile.id, creatorId: creators[3].profile.id, status: 'COMPLETED', progress: 100, terms: { source: 'day3-test' }, completedAt: new Date() },
  });

  viewer = await prisma.user.create({
    data: { email: `${prefix}-viewer@example.com`, displayName: 'Day 3 Viewer', roles: ['VIEWER'], status: 'ACTIVE', emailVerifiedAt: new Date() },
  });
  viewerToken = signAccessToken(viewer);
  creatorToken = signAccessToken(creators[0].user);
  await prisma.follow.create({ data: { followerId: viewer.id, targetType: 'CREATOR', targetId: creators[0].profile.id } });

  const featured = await prisma.contentPost.create({
    data: { authorType: 'CREATOR', creatorId: creators[0].profile.id, title: `${prefix}-featured`, caption: 'Fashion sky editorial from Ulaanbaatar', category: 'Fashion', status: 'PUBLISHED', visibility: 'PUBLIC', publishedAt: new Date(Date.now() - 3_000) },
  });
  const latest = await prisma.contentPost.create({
    data: { authorType: 'BUSINESS', businessId: businesses[1].profile.id, title: `${prefix}-latest`, caption: 'Beauty launch story in Seoul', category: 'Beauty', status: 'PUBLISHED', visibility: 'PUBLIC', publishedAt: new Date(Date.now() - 1_000) },
  });
  const campaign = await prisma.contentPost.create({
    data: { authorType: 'BUSINESS', businessId: businesses[0].profile.id, postType: 'CAMPAIGN', title: `${prefix}-campaign`, caption: 'Private-to-creators campaign feed item', category: 'Travel', status: 'PUBLISHED', visibility: 'PUBLIC', publishedAt: new Date() },
  });
  await prisma.contentReaction.create({ data: { userId: viewer.id, postId: featured.id, type: 'LIKE' } });
  posts = { featured, latest, campaign };
});

after(async () => {
  await prisma.collaboration.deleteMany({ where: { business: { user: { email: { startsWith: prefix } } } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
  await prisma.$disconnect();
});

describe('Day 3 discover, filter, ranking and cursor contract', () => {
  test('1 filters creators by category and platform', async () => {
    const response = await request(app).get('/api/v1/creators').query({ q: prefix, category: 'Fashion', platform: 'INSTAGRAM' });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data.items.map((item) => item.name).sort(), ['Alpha Fashion', 'Delta Fashion']);
  });

  test('2 applies follower range to the aggregate across social accounts', async () => {
    const response = await request(app).get('/api/v1/creators').query({ minFollowers: 170000, maxFollowers: 200000 });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data.items.map((item) => item.name), ['Alpha Fashion']);
    assert.equal(response.body.data.items[0].followerCount, 175000);
  });

  test('3 filters creator engagement', async () => {
    const response = await request(app).get('/api/v1/creators').query({ minEngagement: 10 });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data.items.map((item) => item.name), ['Gamma Food']);
  });

  test('4 filters starting rate and currency together', async () => {
    const response = await request(app).get('/api/v1/creators').query({ minPrice: 2000, maxPrice: 3000, currency: 'USD' });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data.items.map((item) => item.name), ['Beta Travel']);
  });

  test('5 filters location, language and every requested skill', async () => {
    const response = await request(app).get('/api/v1/creators').query({ location: 'Ulaan', language: 'English', skills: 'Editing,Styling' });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data.items.map((item) => item.name), ['Alpha Fashion']);
  });

  test('6 filters verification, availability and rating', async () => {
    const response = await request(app).get('/api/v1/creators').query({ q: prefix, verified: true, available: true, minRating: 4.8 });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data.items.map((item) => item.name), ['Alpha Fashion']);
  });

  test('7 sorts creators alphabetically with deterministic ids', async () => {
    const response = await request(app).get('/api/v1/creators').query({ q: prefix, sort: 'alphabetical', limit: 10 });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data.items.map((item) => item.name), ['Alpha Fashion', 'Beta Travel', 'Delta Fashion', 'Gamma Food']);
  });

  test('8 most_followed uses real social follower sums', async () => {
    const response = await request(app).get('/api/v1/creators').query({ q: prefix, sort: 'most_followed', limit: 10 });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data.items.map((item) => item.name), ['Beta Travel', 'Alpha Fashion', 'Gamma Food', 'Delta Fashion']);
  });

  test('9 cursor traversal has no duplicates or missing profiles', async () => {
    const seen = [];
    let cursor;
    do {
      const response = await request(app).get('/api/v1/creators').query({ q: prefix, sort: 'alphabetical', limit: 2, ...(cursor && { cursor }) });
      assert.equal(response.status, 200);
      seen.push(...response.body.data.items.map((item) => item.id));
      cursor = response.body.data.nextCursor;
    } while (cursor);
    assert.equal(new Set(seen).size, 4);
    assert.equal(seen.length, 4);
  });

  test('10 rejects malformed and cross-sort cursors', async () => {
    const malformed = await request(app).get('/api/v1/creators').query({ cursor: 'not-a-valid-cursor' });
    assert.equal(malformed.status, 400);
    const first = await request(app).get('/api/v1/creators').query({ q: prefix, sort: 'newest', limit: 1 });
    const crossSort = await request(app).get('/api/v1/creators').query({ q: prefix, sort: 'alphabetical', cursor: first.body.data.nextCursor });
    assert.equal(crossSort.status, 400);
  });

  test('11 filters businesses by industry, location, verification and rating', async () => {
    const response = await request(app).get('/api/v1/businesses').query({ q: prefix, industry: 'Travel', location: 'Ulaan', verified: true, minRating: 4.5 });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data.items.map((item) => item.name), ['Aero Brand']);
  });

  test('12 ranks businesses by completed collaborations', async () => {
    const response = await request(app).get('/api/v1/businesses').query({ q: prefix, minCompletedCollaborations: 1, sort: 'trending', limit: 10 });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data.items.map((item) => item.name), ['Aero Brand', 'Code Studio']);
    assert.deepEqual(response.body.data.items.map((item) => item.completedCollaborationCount), [3, 1]);
  });

  test('13 exposes deterministic featured, trending and latest feed sections', async () => {
    const [featured, trending, latest] = await Promise.all([
      request(app).get('/api/v1/feed').query({ section: 'featured', q: prefix, limit: 10 }),
      request(app).get('/api/v1/feed').query({ section: 'trending', q: prefix, limit: 10 }),
      request(app).get('/api/v1/feed').query({ section: 'latest', q: prefix, limit: 10 }),
    ]);
    assert.equal(featured.status, 200);
    assert.ok(featured.body.data.items.some((item) => item.id === posts.featured.id));
    assert.equal(trending.body.data.items[0].id, posts.featured.id);
    assert.ok(latest.body.data.items.some((item) => item.id === posts.latest.id));
  });

  test('14 searches content by description, category, author and location', async () => {
    for (const q of ['sky editorial', 'Fashion', 'Alpha Fashion', 'Ulaanbaatar']) {
      const response = await request(app).get('/api/v1/feed').query({ q, limit: 20 });
      assert.equal(response.status, 200);
      assert.ok(response.body.data.items.some((item) => item.id === posts.featured.id));
    }
  });

  test('15 preserves following access and hides campaigns from guests and viewers', async () => {
    const following = await request(app).get('/api/v1/feed').set('Authorization', `Bearer ${viewerToken}`).query({ section: 'following', limit: 20 });
    assert.equal(following.status, 200);
    assert.ok(following.body.data.items.some((item) => item.id === posts.featured.id));
    const guest = await request(app).get('/api/v1/feed').query({ limit: 20 });
    const viewerFeed = await request(app).get('/api/v1/feed').set('Authorization', `Bearer ${viewerToken}`).query({ limit: 20 });
    const creatorFeed = await request(app).get('/api/v1/feed').set('Authorization', `Bearer ${creatorToken}`).query({ limit: 20 });
    assert.ok(!guest.body.data.items.some((item) => item.id === posts.campaign.id));
    assert.ok(!viewerFeed.body.data.items.some((item) => item.id === posts.campaign.id));
    assert.ok(creatorFeed.body.data.items.some((item) => item.id === posts.campaign.id));
  });
});

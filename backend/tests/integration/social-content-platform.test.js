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

const { app } = await import('../../src/app.js');
const { prisma } = await import('../../src/config/database.js');
const { getTestVerificationCode } = await import('../../src/modules/auth/auth.email.js');

const stamp = Date.now();
const prefix = `social-content-${stamp}`;
const password = 'Password123!';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
const wav = (() => {
  const buffer = Buffer.alloc(44);
  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(36, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(8000, 24);
  buffer.writeUInt32LE(8000, 28);
  buffer.writeUInt16LE(1, 32);
  buffer.writeUInt16LE(8, 34);
  buffer.write('data', 36, 'ascii');
  return buffer;
})();
const storedFiles = [];
const postIds = [];
let creatorAccount;
let businessAccount;
let viewerAccount;
let creator;
let business;

const client = (token) => ({
  get: (url) => request(app).get(url).set('Authorization', `Bearer ${token}`),
  post: (url) => request(app).post(url).set('Authorization', `Bearer ${token}`),
  put: (url) => request(app).put(url).set('Authorization', `Bearer ${token}`),
  delete: (url) => request(app).delete(url).set('Authorization', `Bearer ${token}`),
});

async function createAccount(label) {
  const email = `${prefix}-${label}@example.com`;
  const registered = await request(app).post('/api/v1/auth/register').send({ email, displayName: `${label} social user`, password });
  assert.equal(registered.status, 201);
  const verified = await request(app).post('/api/v1/auth/verify-email').send({ email, otp: getTestVerificationCode(email) });
  assert.equal(verified.status, 200);
  return { email, token: verified.body.data.accessToken };
}

async function upload(token) {
  const response = await client(token).post('/api/v1/media/uploads').field('purpose', 'CONTENT').attach('file', png, { filename: 'post.png', contentType: 'image/png' });
  assert.equal(response.status, 201);
  const asset = response.body.data.asset;
  const stored = await prisma.mediaAsset.findUnique({ where: { id: asset.id }, select: { storageKey: true } });
  storedFiles.push(path.resolve(process.cwd(), 'uploads', 'media', stored.storageKey));
  return asset;
}

async function uploadAudio(token) {
  const response = await client(token).post('/api/v1/media/uploads').field('purpose', 'CONTENT').attach('file', wav, { filename: 'story.wav', contentType: 'audio/wav' });
  assert.equal(response.status, 201);
  const asset = response.body.data.asset;
  const stored = await prisma.mediaAsset.findUnique({ where: { id: asset.id }, select: { storageKey: true } });
  storedFiles.push(path.resolve(process.cwd(), 'uploads', 'media', stored.storageKey));
  return asset;
}

before(async () => {
  creatorAccount = await createAccount('creator');
  businessAccount = await createAccount('business');
  viewerAccount = await createAccount('viewer');
  const creatorResponse = await client(creatorAccount.token).post('/api/v1/creator/profile').send({ channelName: 'Social Creator', username: `social_creator_${stamp}`.slice(0, 30), niche: 'Lifestyle' });
  assert.equal(creatorResponse.status, 201);
  creator = creatorResponse.body.data.profile;
  const businessResponse = await client(businessAccount.token).post('/api/v1/business/profile').send({ organization: 'Social Business', username: `social_business_${stamp}`.slice(0, 30), industry: 'Lifestyle' });
  assert.equal(businessResponse.status, 201);
  business = businessResponse.body.data.profile;
});

after(async () => {
  if (postIds.length) await prisma.trustCase.deleteMany({ where: { targetType: 'CONTENT', targetId: { in: postIds } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
  await Promise.all(storedFiles.map((file) => fs.unlink(file).catch(() => {})));
  await prisma.$disconnect();
});

describe('Canonical social content platform', () => {
  test('creator and business publish canonical posts that appear in the public feed', async () => {
    const creatorMedia = await upload(creatorAccount.token);
    const businessMedia = await upload(businessAccount.token);
    const creatorPost = await client(creatorAccount.token).post('/api/v1/posts').send({
      authorType: 'CREATOR', caption: 'Creator social post', category: 'Lifestyle', status: 'PUBLISHED',
      media: [{ assetId: creatorMedia.id, mediaType: 'IMAGE', altText: 'Creator test image' }],
    });
    assert.equal(creatorPost.status, 201);
    postIds.push(creatorPost.body.data.post.id);
    const businessPost = await client(businessAccount.token).post('/api/v1/posts').send({
      authorType: 'BUSINESS', postType: 'BRAND_STORY', caption: 'Business brand story', category: 'Lifestyle', status: 'PUBLISHED',
      media: [{ assetId: businessMedia.id, mediaType: 'IMAGE', altText: 'Business test image' }],
    });
    assert.equal(businessPost.status, 201);
    postIds.push(businessPost.body.data.post.id);
    const feed = await request(app).get('/api/v1/feed').query({ category: 'Lifestyle', limit: 20 });
    assert.equal(feed.status, 200);
    assert.ok(postIds.every((id) => feed.body.data.items.some((item) => item.id === id)));
  });

  test('showcase feed searches creator names, business names and descriptions', async () => {
    const creatorSearch = await request(app).get('/api/v1/feed').query({ q: 'Social Creator', limit: 20 });
    assert.equal(creatorSearch.status, 200);
    assert.ok(creatorSearch.body.data.items.some((item) => item.id === postIds[0]));

    const businessSearch = await request(app).get('/api/v1/feed').query({ q: 'Social Business', limit: 20 });
    assert.equal(businessSearch.status, 200);
    assert.ok(businessSearch.body.data.items.some((item) => item.id === postIds[1]));

    const descriptionSearch = await request(app).get('/api/v1/feed').query({ q: 'brand story', limit: 20 });
    assert.equal(descriptionSearch.status, 200);
    assert.ok(descriptionSearch.body.data.items.some((item) => item.id === postIds[1]));
  });

  test('campaign content is hidden from viewers and available to creator channels', async () => {
    const campaignPost = await prisma.contentPost.create({
      data: {
        authorType: 'BUSINESS',
        businessId: business.id,
        postType: 'CAMPAIGN',
        caption: 'Creator-only campaign opportunity',
        visibility: 'PUBLIC',
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
    postIds.push(campaignPost.id);

    const publicFeed = await request(app).get('/api/v1/feed').query({ limit: 20 });
    assert.ok(publicFeed.body.data.items.every((item) => item.id !== campaignPost.id));

    const viewerFeed = await client(viewerAccount.token).get('/api/v1/feed').query({ limit: 20 });
    assert.ok(viewerFeed.body.data.items.every((item) => item.id !== campaignPost.id));

    const creatorFeed = await client(creatorAccount.token).get('/api/v1/feed').query({ limit: 20 });
    assert.ok(creatorFeed.body.data.items.some((item) => item.id === campaignPost.id));
  });

  test('follow drives the following feed and creates a social notification', async () => {
    const follow = await client(viewerAccount.token).put(`/api/v1/library/following/creator/${creator.id}`).send({});
    assert.equal(follow.status, 200);
    assert.equal(follow.body.data.following, true);
    assert.ok(follow.body.data.followerCount >= 1);
    const followingFeed = await client(viewerAccount.token).get('/api/v1/feed').query({ mode: 'following', limit: 20 });
    assert.equal(followingFeed.status, 200);
    assert.ok(followingFeed.body.data.items.some((item) => item.author.id === creator.id));
    assert.ok(followingFeed.body.data.items.every((item) => item.author.type === 'CREATOR'));
    const notifications = await client(creatorAccount.token).get('/api/v1/notifications').query({ page: 1, limit: 20 });
    assert.ok(notifications.body.data.items.some((item) => item.type === 'FOLLOW'));
  });

  test('like and save are idempotent and survive a feed reload', async () => {
    const postId = postIds[0];
    assert.equal((await client(viewerAccount.token).put(`/api/v1/posts/${postId}/like`).send({})).status, 200);
    assert.equal((await client(viewerAccount.token).put(`/api/v1/posts/${postId}/like`).send({})).status, 200);
    assert.equal((await client(viewerAccount.token).put(`/api/v1/library/saved/content/${postId}`).send({})).status, 200);
    const feed = await client(viewerAccount.token).get('/api/v1/feed').query({ limit: 20 });
    const post = feed.body.data.items.find((item) => item.id === postId);
    assert.equal(post.liked, true);
    assert.equal(post.saved, true);
    assert.equal(await prisma.contentReaction.count({ where: { userId: (await prisma.user.findUnique({ where: { email: viewerAccount.email } })).id, postId } }), 1);
  });

  test('creator and business stories disappear from public feed after 24 hours', async () => {
    const media = await upload(creatorAccount.token);
    const story = await client(creatorAccount.token).post('/api/v1/posts').send({
      authorType: 'CREATOR', postType: 'STORY', caption: 'A 24 hour creator story', category: 'Travel', status: 'PUBLISHED',
      media: [{ assetId: media.id, mediaType: 'IMAGE', altText: 'Story test image' }],
    });
    assert.equal(story.status, 201);
    const storyPost = story.body.data.post;
    postIds.push(storyPost.id);
    assert.equal(storyPost.type, 'STORY');
    assert.ok(storyPost.expiresAt);
    assert.ok(storyPost.expiresInSeconds <= 24 * 60 * 60);
    const liveFeed = await request(app).get('/api/v1/feed').query({ postType: 'STORY', limit: 20 });
    assert.ok(liveFeed.body.data.items.some((item) => item.id === storyPost.id));
    await prisma.contentPost.update({ where: { id: storyPost.id }, data: { expiresAt: new Date(Date.now() - 60_000) } });
    const expiredFeed = await request(app).get('/api/v1/feed').query({ postType: 'STORY', limit: 20 });
    assert.ok(expiredFeed.body.data.items.every((item) => item.id !== storyPost.id));
    const ownerDetail = await client(creatorAccount.token).get(`/api/v1/posts/${storyPost.id}`);
    assert.equal(ownerDetail.status, 200);
  });

  test('text stories persist their movable canvas style without requiring media', async () => {
    const storyStyle = {
      background: 'berry',
      textColor: '#ffffff',
      fontSize: 'lg',
      textAlign: 'center',
      x: 34,
      y: 61,
    };
    const story = await client(businessAccount.token).post('/api/v1/posts').send({
      authorType: 'BUSINESS',
      postType: 'STORY',
      caption: 'Move this story text',
      category: 'Lifestyle',
      status: 'PUBLISHED',
      storyStyle,
      media: [],
    });
    assert.equal(story.status, 201);
    postIds.push(story.body.data.post.id);
    assert.deepEqual(story.body.data.post.storyStyle, storyStyle);

    const feed = await request(app).get('/api/v1/feed').query({ postType: 'STORY', limit: 20 });
    const feedStory = feed.body.data.items.find((item) => item.id === story.body.data.post.id);
    assert.deepEqual(feedStory.storyStyle, storyStyle);

    const mine = await client(businessAccount.token).get('/api/v1/posts/mine').query({
      authorType: 'BUSINESS', status: 'PUBLISHED', postType: 'STORY', limit: 1,
    });
    assert.equal(mine.status, 200);
    assert.equal(mine.body.data.items.length, 1);
    assert.equal(mine.body.data.items[0].id, story.body.data.post.id);
  });

  test('story audio requires ownership and an explicit usage-rights confirmation', async () => {
    const audio = await uploadAudio(creatorAccount.token);
    const missingRights = await client(creatorAccount.token).post('/api/v1/posts').send({
      authorType: 'CREATOR', postType: 'STORY', caption: 'Audio rights test', status: 'PUBLISHED', media: [],
      storyStyle: { background: 'ocean', textColor: '#ffffff', fontSize: 'md', textAlign: 'center', x: 50, y: 50 },
      storyAudio: { assetId: audio.id, title: 'Original audio', volume: 0.6, rightsConfirmed: false },
    });
    assert.equal(missingRights.status, 400);

    const foreignAudio = await client(businessAccount.token).post('/api/v1/posts').send({
      authorType: 'BUSINESS', postType: 'STORY', caption: 'Foreign audio test', status: 'PUBLISHED', media: [],
      storyStyle: { background: 'mint', textColor: '#111111', fontSize: 'md', textAlign: 'center', x: 50, y: 50 },
      storyAudio: { assetId: audio.id, title: 'Not owned', volume: 0.7, rightsConfirmed: true },
    });
    assert.equal(foreignAudio.status, 404);

    const created = await client(creatorAccount.token).post('/api/v1/posts').send({
      authorType: 'CREATOR', postType: 'STORY', caption: 'Story with original audio', category: 'Music', status: 'PUBLISHED', media: [],
      storyStyle: { background: 'berry', textColor: '#ffffff', fontSize: 'lg', textAlign: 'center', x: 45, y: 55 },
      storyAudio: { assetId: audio.id, title: 'Original audio', artist: 'Social Creator', startMs: 0, volume: 0.6, rightsConfirmed: true },
    });
    assert.equal(created.status, 201);
    postIds.push(created.body.data.post.id);
    assert.equal(created.body.data.post.storyAudio.title, 'Original audio');
    assert.equal(created.body.data.post.storyAudio.volume, 0.6);
    const served = await request(app).get(created.body.data.post.storyAudio.url);
    assert.equal(served.status, 200);
    assert.match(served.headers['content-type'], /^audio\/wav/);
    assert.equal((await client(creatorAccount.token).delete(`/api/v1/media/uploads/${audio.id}`)).status, 409);
  });

  test('block removes the channel from feed and duplicate reports are rejected', async () => {
    const blocked = await client(viewerAccount.token).put(`/api/v1/safety/blocks/business/${business.id}`).send({});
    assert.equal(blocked.status, 200);
    const feed = await client(viewerAccount.token).get('/api/v1/feed').query({ limit: 20 });
    assert.ok(feed.body.data.items.every((item) => item.author.id !== business.id));
    const report = await client(viewerAccount.token).post('/api/v1/reports').send({ targetType: 'content', targetId: postIds[0], reason: 'SPAM', evidence: [] });
    assert.equal(report.status, 201);
    const duplicate = await client(viewerAccount.token).post('/api/v1/reports').send({ targetType: 'content', targetId: postIds[0], reason: 'SPAM', evidence: [] });
    assert.equal(duplicate.status, 409);
  });
});

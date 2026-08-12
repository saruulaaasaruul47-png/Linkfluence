import 'dotenv/config';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET ||= 'test-access-secret-with-at-least-32-characters';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-with-at-least-32-characters';
process.env.CLIENT_URL ||= 'http://localhost:5173';

const { app } = await import('../../src/app.js');
const { prisma } = await import('../../src/config/database.js');
const { getTestVerificationCode } = await import('../../src/modules/auth/auth.email.js');

const stamp = Date.now();
const prefix = `profile-test-${stamp}`;
const email = `${prefix}@example.com`;
const password = 'Password123!';
const changedPassword = 'Changed456!';
let accessToken = '';
let avatarPath = '';

const authenticated = () => ({
  get: (url) => request(app).get(url).set('Authorization', `Bearer ${accessToken}`),
  post: (url) => request(app).post(url).set('Authorization', `Bearer ${accessToken}`),
  patch: (url) => request(app).patch(url).set('Authorization', `Bearer ${accessToken}`),
  delete: (url) => request(app).delete(url).set('Authorization', `Bearer ${accessToken}`),
});

async function cleanup() {
  await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
  if (avatarPath) await fs.unlink(avatarPath).catch(() => {});
}

before(async () => {
  await cleanup();
  const registration = await request(app).post('/api/v1/auth/register').send({
    email,
    displayName: 'Profile Tester',
    password,
  });
  assert.equal(registration.status, 201);
  const verification = await request(app).post('/api/v1/auth/verify-email').send({
    email,
    otp: getTestVerificationCode(email),
  });
  assert.equal(verification.status, 200);
  accessToken = verification.body.data.accessToken;
});

after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe('Sprint 2 profile APIs', () => {
  test('reads and updates the current user without exposing credentials', async () => {
    const me = await authenticated().get('/api/v1/users/me');
    assert.equal(me.status, 200);
    assert.equal(me.body.data.user.passwordHash, undefined);
    assert.deepEqual(me.body.data.user.roles, ['VIEWER']);

    const update = await authenticated().patch('/api/v1/users/me').send({
      displayName: 'Updated Profile',
      username: `profile_${stamp}`.slice(0, 30),
      phone: '+976 99112233',
      location: 'Ulaanbaatar',
      bio: 'Integration-tested profile.',
    });
    assert.equal(update.status, 200);
    assert.equal(update.body.data.user.displayName, 'Updated Profile');
    assert.equal(update.body.data.user.phone, '+976 99112233');
  });

  test('uploads and serves a validated avatar image', async () => {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    );
    const upload = await authenticated().patch('/api/v1/users/me/avatar')
      .attach('avatar', png, { filename: 'avatar.png', contentType: 'image/png' });
    assert.equal(upload.status, 200);
    assert.match(upload.body.data.user.avatarUrl, /^\/uploads\/avatars\/.+\.png$/);
    avatarPath = path.resolve(process.cwd(), upload.body.data.user.avatarUrl.replace(/^\//, ''));

    const served = await request(app).get(upload.body.data.user.avatarUrl);
    assert.equal(served.status, 200);
    assert.match(served.headers['content-type'], /^image\/png/);

    const invalid = await authenticated().patch('/api/v1/users/me/avatar')
      .attach('avatar', Buffer.from('not an image'), { filename: 'avatar.txt', contentType: 'text/plain' });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.error.code, 'INVALID_AVATAR_FILE');

    const spoofed = await authenticated().patch('/api/v1/users/me/avatar')
      .attach('avatar', Buffer.from('not really a png'), { filename: 'spoofed.png', contentType: 'image/png' });
    assert.equal(spoofed.status, 400);
    assert.equal(spoofed.body.error.code, 'INVALID_AVATAR_FILE');
  });

  test('creates, reads, updates and deletes one creator profile with role sync', async () => {
    const create = await authenticated().post('/api/v1/creator/profile').send({
      channelName: 'Nomad Frames',
      username: `nomad_${stamp}`.slice(0, 30),
      bio: 'Stories from Mongolia.',
      niche: 'Travel',
      audience: 'Travel-minded viewers',
      format: 'Short-form video',
      location: 'Ulaanbaatar',
      language: 'Mongolian',
      instagram: 'https://instagram.com/nomadframes',
      postRate: '1500000',
      publicRates: true,
      availability: 'Available now',
    });
    assert.equal(create.status, 201);
    assert.ok(create.body.data.user.roles.includes('CREATOR'));
    assert.equal(create.body.data.profile.niche, 'Travel');

    const duplicate = await authenticated().post('/api/v1/creator/profile').send({
      channelName: 'Duplicate',
      username: `duplicate_${stamp}`.slice(0, 30),
    });
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.error.code, 'CREATOR_PROFILE_EXISTS');

    const read = await authenticated().get('/api/v1/creator/profile');
    assert.equal(read.status, 200);
    assert.equal(read.body.data.profile.instagram, 'https://instagram.com/nomadframes');

    const update = await authenticated().patch('/api/v1/creator/profile').send({
      channelName: 'Nomad Frames Studio',
      availability: 'Not accepting work',
    });
    assert.equal(update.status, 200);
    assert.equal(update.body.data.profile.name, 'Nomad Frames Studio');
    assert.equal(update.body.data.profile.availableForWork, false);

    const remove = await authenticated().delete('/api/v1/creator/profile');
    assert.equal(remove.status, 200);
    assert.equal(remove.body.data.user.roles.includes('CREATOR'), false);
    assert.equal((await authenticated().get('/api/v1/creator/profile')).status, 404);
  });

  test('creates, reads, updates and deletes one business profile with role sync', async () => {
    const create = await authenticated().post('/api/v1/business/profile').send({
      organization: 'Northstar Studio',
      username: `northstar_${stamp}`.slice(0, 30),
      description: 'A test organization.',
      industry: 'Agency',
      website: 'https://northstar.example',
      companySize: '11–50',
      contactEmail: email,
      location: 'Ulaanbaatar',
      targetNiche: 'Lifestyle',
      campaignGoal: 'Launch a test campaign.',
      monthlyBudget: '5M–15M',
    });
    assert.equal(create.status, 201);
    assert.ok(create.body.data.user.roles.includes('BUSINESS'));
    assert.equal(create.body.data.profile.targetNiche, 'Lifestyle');

    const read = await authenticated().get('/api/v1/business/profile');
    assert.equal(read.status, 200);
    assert.equal(read.body.data.profile.companySize, '11–50');

    const update = await authenticated().patch('/api/v1/business/profile').send({
      organization: 'Northstar Labs',
      industry: 'Technology',
    });
    assert.equal(update.status, 200);
    assert.equal(update.body.data.profile.name, 'Northstar Labs');

    const remove = await authenticated().delete('/api/v1/business/profile');
    assert.equal(remove.status, 200);
    assert.equal(remove.body.data.user.roles.includes('BUSINESS'), false);
    assert.equal((await authenticated().get('/api/v1/business/profile')).status, 404);
  });

  test('changes password, revokes sessions and allows only the new password', async () => {
    const update = await authenticated().patch('/api/v1/users/me/password').send({
      currentPassword: password,
      newPassword: changedPassword,
    });
    assert.equal(update.status, 200);
    assert.equal(update.body.data.reauthenticationRequired, true);
    assert.ok([401, 403].includes((await authenticated().get('/api/v1/users/me')).status));

    const oldLogin = await request(app).post('/api/v1/auth/login').send({ email, password });
    assert.equal(oldLogin.status, 401);
    const login = await request(app).post('/api/v1/auth/login').send({ email, password: changedPassword });
    assert.equal(login.status, 200);
    accessToken = login.body.data.accessToken;
  });

  test('soft deletes the account and prevents another login', async () => {
    const remove = await authenticated().delete('/api/v1/users/me');
    assert.equal(remove.status, 200);
    assert.ok([401, 403].includes((await authenticated().get('/api/v1/users/me')).status));

    const user = await prisma.user.findUnique({ where: { email } });
    assert.ok(user.deletedAt);
    assert.equal(user.status, 'BANNED');

    const login = await request(app).post('/api/v1/auth/login').send({ email, password: changedPassword });
    assert.notEqual(login.status, 200);
  });
});

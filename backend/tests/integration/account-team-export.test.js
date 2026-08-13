import 'dotenv/config';
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import request from 'supertest';
import bcrypt from 'bcrypt';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET ||= 'test-access-secret-with-at-least-32-characters';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-with-at-least-32-characters';
process.env.JWT_PASSWORD_RESET_SECRET ||= 'test-reset-secret-with-at-least-32-characters';

const { app } = await import('../../src/app.js');
const { prisma } = await import('../../src/config/database.js');
const { signAccessToken } = await import('../../src/shared/utils/jwt.js');

const prefix = `account-team-${Date.now()}`;
let owner;
let invitee;
let ownerToken;
let inviteeToken;
let business;

before(async () => {
  owner = await prisma.user.create({
    data: {
      email: `${prefix}-owner@example.com`,
      displayName: 'Team Owner',
      status: 'ACTIVE',
      roles: ['VIEWER', 'BUSINESS'],
      emailVerifiedAt: new Date(),
    },
  });
  invitee = await prisma.user.create({
    data: {
      email: `${prefix}-member@example.com`,
      displayName: 'Team Member',
      status: 'ACTIVE',
      roles: ['VIEWER'],
      emailVerifiedAt: new Date(),
    },
  });
  business = await prisma.businessProfile.create({
    data: { userId: owner.id, companyName: 'Team Business', slug: `${prefix}-business` },
  });
  await prisma.businessMember.create({
    data: {
      businessId: business.id,
      userId: owner.id,
      role: 'OWNER',
      status: 'ACTIVE',
      joinedAt: new Date(),
    },
  });
  ownerToken = signAccessToken(owner);
  inviteeToken = signAccessToken(invitee);
});

after(async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
  await prisma.$disconnect();
});

describe('Account export, media kit and business team', () => {
  test('exports only the authenticated account as a JSON attachment', async () => {
    const response = await request(app)
      .get('/api/v1/users/me/export')
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(response.status, 200);
    assert.match(response.headers['content-disposition'], /attachment/);
    const exported = response.body;
    assert.equal(exported.account.email, owner.email);
    assert.equal(exported.account.passwordHash, undefined);
    assert.equal(exported.authTokens, undefined);
  });

  test('owner invites, member accepts and owner manages a team role', async () => {
    const invited = await request(app)
      .post('/api/v1/business/profile/members')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: invitee.email, role: 'CAMPAIGN_MANAGER' });
    assert.equal(invited.status, 201);
    assert.equal(invited.body.data.member.status, 'INVITED');

    const accepted = await request(app)
      .post(`/api/v1/business/profile/members/${invited.body.data.member.id}/accept`)
      .set('Authorization', `Bearer ${inviteeToken}`)
      .send({});
    assert.equal(accepted.status, 200);
    assert.equal(accepted.body.data.member.status, 'ACTIVE');

    const updated = await request(app)
      .patch(`/api/v1/business/profile/members/${invited.body.data.member.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ role: 'FINANCE' });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.member.role, 'FINANCE');

    const listed = await request(app)
      .get('/api/v1/business/profile/members')
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(listed.status, 200);
    assert.equal(listed.body.data.members.length, 2);

    const removed = await request(app)
      .delete(`/api/v1/business/profile/members/${invited.body.data.member.id}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(removed.status, 200);
  });

  test('business owner membership cannot be removed', async () => {
    const ownerMembership = await prisma.businessMember.findUnique({
      where: { businessId_userId: { businessId: business.id, userId: owner.id } },
    });
    const response = await request(app)
      .delete(`/api/v1/business/profile/members/${ownerMembership.id}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(response.status, 409);
    assert.equal(response.body.error.code, 'BUSINESS_OWNER_IMMUTABLE');
  });

  test('locks one account after repeated incorrect passwords', async () => {
    const lockedUser = await prisma.user.create({
      data: {
        email: `${prefix}-locked@example.com`,
        displayName: 'Locked User',
        passwordHash: await bcrypt.hash('CorrectPassword123!', 10),
        status: 'ACTIVE',
        roles: ['VIEWER'],
        emailVerifiedAt: new Date(),
      },
    });
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await request(app).post('/api/v1/auth/login').send({
        email: lockedUser.email,
        password: 'IncorrectPassword123!',
      });
      assert.equal(response.status, 401);
    }
    const blocked = await request(app).post('/api/v1/auth/login').send({
      email: lockedUser.email,
      password: 'CorrectPassword123!',
    });
    assert.equal(blocked.status, 423);
    assert.equal(blocked.body.error.code, 'ACCOUNT_LOCKED');
  });
});

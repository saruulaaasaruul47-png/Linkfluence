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
const { authService } = await import('../../src/modules/auth/auth.service.js');

const prefix = `access-control-${Date.now()}`;
let admin;
let user;
let token;
let reauthenticationToken;

before(async () => {
  admin = await prisma.user.create({
    data: {
      email: `${prefix}-admin@example.com`,
      displayName: 'Permission Admin',
      status: 'ACTIVE',
      roles: ['VIEWER', 'ADMIN'],
      passwordHash: await bcrypt.hash('Admin123!', 10),
      emailVerifiedAt: new Date(),
    },
  });
  user = await prisma.user.create({
    data: {
      email: `${prefix}-user@example.com`,
      displayName: 'Permission User',
      status: 'ACTIVE',
      roles: ['VIEWER'],
      emailVerifiedAt: new Date(),
    },
  });
  token = signAccessToken(admin);
  const confirmation = await request(app)
    .post('/api/v1/auth/reauthenticate')
    .set('Authorization', `Bearer ${token}`)
    .send({ password: 'Admin123!' });
  assert.equal(confirmation.status, 200);
  reauthenticationToken = confirmation.body.data.reauthenticationToken;
});

after(async () => {
  await prisma.adminAction.deleteMany({ where: { actorId: admin.id } });
  await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
  await prisma.$disconnect();
});

describe('Granular access control', () => {
  test('an admin can grant, observe and revoke an explicit permission with audit records', async () => {
    const listed = await request(app)
      .get('/api/v1/admin/access-control/permissions')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(listed.status, 200);
    assert.ok(listed.body.data.permissions.some(({ key }) => key === 'VIEW_FINANCE'));

    const granted = await request(app)
      .put(`/api/v1/admin/access-control/users/${user.id}/permissions/VIEW_FINANCE`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-reauth-token', reauthenticationToken)
      .send({ reason: 'Finance analyst assignment' });
    assert.equal(granted.status, 200);
    assert.equal(granted.body.data.grant.permission.key, 'VIEW_FINANCE');

    const authenticated = await authService.authenticateAccessToken(signAccessToken(user));
    assert.deepEqual(authenticated.permissions, ['VIEW_FINANCE']);

    const revoked = await request(app)
      .delete(`/api/v1/admin/access-control/users/${user.id}/permissions/VIEW_FINANCE`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-reauth-token', reauthenticationToken)
      .send({ reason: 'Finance assignment ended' });
    assert.equal(revoked.status, 200);

    const actions = await prisma.adminAction.findMany({
      where: { actorId: admin.id, action: { in: ['PERMISSION_GRANTED', 'PERMISSION_REVOKED'] } },
    });
    assert.equal(actions.length, 2);
  });

  test('non-admin users cannot manage permissions', async () => {
    const response = await request(app)
      .get('/api/v1/admin/access-control/permissions')
      .set('Authorization', `Bearer ${signAccessToken(user)}`);
    assert.equal(response.status, 403);
  });

  test('a sensitive account deletion requires recent password confirmation', async () => {
    const protectedUser = await prisma.user.create({
      data: {
        email: `${prefix}-protected@example.com`,
        displayName: 'Protected Account',
        passwordHash: await bcrypt.hash('Member123!', 10),
        status: 'ACTIVE',
        roles: ['VIEWER'],
        emailVerifiedAt: new Date(),
      },
    });
    const accessToken = signAccessToken(protectedUser);
    const denied = await request(app)
      .delete('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`);
    assert.equal(denied.status, 401);
    assert.equal(denied.body.error.code, 'REAUTHENTICATION_REQUIRED');

    const confirmation = await request(app)
      .post('/api/v1/auth/reauthenticate')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ password: 'Member123!' });
    assert.equal(confirmation.status, 200);

    const deleted = await request(app)
      .delete('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-reauth-token', confirmation.body.data.reauthenticationToken);
    assert.equal(deleted.status, 200);
  });
});

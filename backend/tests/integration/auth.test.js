import 'dotenv/config';
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import bcrypt from 'bcrypt';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET ||= 'test-access-secret-with-at-least-32-characters';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-with-at-least-32-characters';
process.env.JWT_PASSWORD_RESET_SECRET ||= 'test-reset-secret-with-at-least-32-characters';
process.env.CLIENT_URL ||= 'http://localhost:5173';

const { app } = await import('../../src/app.js');
const { prisma } = await import('../../src/config/database.js');
const {
  getTestPasswordResetCode,
  getTestVerificationCode,
} = await import('../../src/modules/auth/auth.email.js');

const prefix = `auth-test-${Date.now()}`;
const email = `${prefix}@example.com`;
const password = 'Password123!';
const username = `user_${Date.now()}`.slice(0, 30);

async function registerPending(suffix) {
  const pendingEmail = `${prefix}-${suffix}@example.com`;
  const response = await request(app).post('/api/v1/auth/register').send({
    email: pendingEmail,
    displayName: 'Pending Tester',
    password,
  });
  assert.equal(response.status, 201);
  return {
    email: pendingEmail,
    code: getTestVerificationCode(pendingEmail),
    user: await prisma.user.findUnique({ where: { email: pendingEmail } }),
  };
}

async function cleanup() {
  await prisma.user.deleteMany({
    where: { email: { startsWith: prefix } },
  });
}

before(cleanup);
after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe('Authentication API integration', () => {
  test('rejects invalid registration payloads and privileged fields', async () => {
    const invalidEmail = await request(app).post('/api/v1/auth/register').send({
      email: 'invalid',
      displayName: 'Tester',
      password,
    });
    assert.equal(invalidEmail.status, 400);
    assert.equal(invalidEmail.body.error.code, 'VALIDATION_ERROR');

    const weakPassword = await request(app).post('/api/v1/auth/register').send({
      email: `${prefix}-weak@example.com`,
      displayName: 'Tester',
      password: 'password',
    });
    assert.equal(weakPassword.status, 400);

    const privileged = await request(app).post('/api/v1/auth/register').send({
      email: `${prefix}-admin@example.com`,
      displayName: 'Tester',
      password,
      roles: ['ADMIN'],
    });
    assert.equal(privileged.status, 400);
    assert.equal(privileged.body.error.code, 'VALIDATION_ERROR');
  });

  test('registers a pending viewer without returning credentials', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({
      email,
      username,
      displayName: 'Auth Tester',
      password,
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.data.verificationRequired, true);
    assert.equal(response.body.data.expiresInSeconds, 600);
    assert.equal(response.body.data.accessToken, undefined);
    assert.equal(response.headers['set-cookie'], undefined);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { verificationCodes: true },
    });
    assert.deepEqual(user.roles, ['VIEWER']);
    assert.equal(user.status, 'PENDING_VERIFICATION');
    assert.equal(user.emailVerifiedAt, null);
    assert.equal(await bcrypt.compare(password, user.passwordHash), true);
    assert.equal(user.verificationCodes.length, 1);
    assert.notEqual(user.verificationCodes[0].codeHash, getTestVerificationCode(email));
  });

  test('rejects duplicate email and username', async () => {
    const duplicateEmail = await request(app).post('/api/v1/auth/register').send({
      email,
      displayName: 'Duplicate',
      password,
    });
    assert.equal(duplicateEmail.status, 409);
    assert.equal(duplicateEmail.body.error.code, 'EMAIL_ALREADY_EXISTS');

    const duplicateUsername = await request(app).post('/api/v1/auth/register').send({
      email: `${prefix}-username@example.com`,
      username,
      displayName: 'Duplicate',
      password,
    });
    assert.equal(duplicateUsername.status, 409);
    assert.equal(duplicateUsername.body.error.code, 'USERNAME_ALREADY_EXISTS');
  });

  test('blocks unverified login and enforces OTP attempts', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email, password });
    assert.equal(login.status, 403);
    assert.equal(login.body.error.code, 'EMAIL_NOT_VERIFIED');

    const wrong = await request(app).post('/api/v1/auth/verify-email').send({
      email,
      otp: '000000',
    });
    assert.equal(wrong.status, 400);
    assert.equal(wrong.body.error.code, 'INVALID_VERIFICATION_CODE');

    const user = await prisma.user.findUnique({ where: { email } });
    const verification = await prisma.verificationCode.findFirst({
      where: { userId: user.id, consumedAt: null },
    });
    assert.equal(verification.attempts, 1);
  });

  test('verifies OTP, activates account and creates a refresh session', async () => {
    const agent = request.agent(app);
    const response = await agent.post('/api/v1/auth/verify-email').send({
      email,
      otp: getTestVerificationCode(email),
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.user.status, 'ACTIVE');
    assert.equal(response.body.data.user.emailVerified, true);
    assert.ok(response.body.data.accessToken);
    assert.match(response.headers['set-cookie'][0], /refreshToken=/);
    assert.match(response.headers['set-cookie'][0], /HttpOnly/i);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { verificationCodes: true, authTokens: true },
    });
    assert.ok(user.emailVerifiedAt);
    assert.ok(user.verificationCodes[0].consumedAt);
    assert.equal(user.authTokens.length, 1);
    assert.ok(user.authTokens[0].jti);

    const reused = await request(app).post('/api/v1/auth/verify-email').send({
      email,
      otp: getTestVerificationCode(email),
    });
    assert.equal(reused.status, 400);
    assert.equal(reused.body.error.code, 'INVALID_VERIFICATION_CODE');
  });

  test('logs in, reads current user, rotates refresh token and logs out', async () => {
    const agent = request.agent(app);
    const login = await agent.post('/api/v1/auth/login').send({ email, password });
    assert.equal(login.status, 200);
    assert.ok(login.body.data.accessToken);
    assert.equal(login.body.data.user.passwordHash, undefined);

    const me = await agent
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`);
    assert.equal(me.status, 200);
    assert.equal(me.body.data.user.email, email);
    assert.equal(me.body.data.user.authTokens, undefined);

    const activeBefore = await prisma.authToken.count({
      where: { user: { email }, revokedAt: null },
    });
    const refresh = await agent.post('/api/v1/auth/refresh');
    assert.equal(refresh.status, 200);
    assert.ok(refresh.body.data.accessToken);
    const activeAfter = await prisma.authToken.count({
      where: { user: { email }, revokedAt: null },
    });
    assert.equal(activeAfter, activeBefore);

    const logout = await agent.post('/api/v1/auth/logout');
    assert.equal(logout.status, 200);
    assert.match(logout.headers['set-cookie'][0], /refreshToken=;/);

    const refreshAfterLogout = await agent.post('/api/v1/auth/refresh');
    assert.equal(refreshAfterLogout.status, 401);
    assert.equal(refreshAfterLogout.body.error.code, 'INVALID_REFRESH_TOKEN');
  });

  test('keeps remember-me cookie persistence across refresh rotation', async () => {
    const sessionLogin = await request(app).post('/api/v1/auth/login').send({
      email,
      password,
      remember: false,
    });
    assert.equal(sessionLogin.status, 200);
    const sessionCookie = sessionLogin.headers['set-cookie'][0];
    assert.doesNotMatch(sessionCookie, /Max-Age=/i);
    assert.doesNotMatch(sessionCookie, /Expires=/i);

    const sessionRefresh = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', sessionCookie);
    assert.equal(sessionRefresh.status, 200);
    assert.doesNotMatch(sessionRefresh.headers['set-cookie'][0], /Max-Age=/i);
    assert.doesNotMatch(sessionRefresh.headers['set-cookie'][0], /Expires=/i);

    const persistentLogin = await request(app).post('/api/v1/auth/login').send({
      email,
      password,
      remember: true,
    });
    assert.equal(persistentLogin.status, 200);
    assert.match(persistentLogin.headers['set-cookie'][0], /Max-Age=/i);
  });

  test('returns generic responses for invalid credentials and unknown resend email', async () => {
    const wrongPassword = await request(app).post('/api/v1/auth/login').send({
      email,
      password: 'WrongPassword123!',
    });
    const unknown = await request(app).post('/api/v1/auth/login').send({
      email: `${prefix}-missing@example.com`,
      password,
    });
    assert.equal(wrongPassword.status, 401);
    assert.equal(unknown.status, 401);
    assert.equal(wrongPassword.body.error.code, 'INVALID_CREDENTIALS');
    assert.equal(unknown.body.error.code, 'INVALID_CREDENTIALS');

    const resendUnknown = await request(app).post('/api/v1/auth/resend-otp').send({
      email: `${prefix}-missing@example.com`,
    });
    assert.equal(resendUnknown.status, 200);
    assert.equal(resendUnknown.body.data, null);
  });

  test('enforces resend cooldown and invalidates the previous OTP', async () => {
    const pending = await registerPending('resend');
    const tooSoon = await request(app).post('/api/v1/auth/resend-otp').send({
      email: pending.email,
    });
    assert.equal(tooSoon.status, 429);
    assert.equal(tooSoon.body.error.code, 'OTP_RESEND_TOO_SOON');

    const firstCodeRecord = await prisma.verificationCode.findFirst({
      where: { userId: pending.user.id, consumedAt: null },
    });
    await prisma.verificationCode.update({
      where: { id: firstCodeRecord.id },
      data: { resendAvailableAt: new Date(Date.now() - 1_000) },
    });

    const resent = await request(app).post('/api/v1/auth/resend-otp').send({
      email: pending.email,
    });
    assert.equal(resent.status, 200);
    assert.notEqual(getTestVerificationCode(pending.email), pending.code);

    const oldRecord = await prisma.verificationCode.findUnique({
      where: { id: firstCodeRecord.id },
    });
    assert.ok(oldRecord.consumedAt);
  });

  test('rejects expired OTPs and accounts over the attempt limit', async () => {
    const expired = await registerPending('expired');
    const expiredRecord = await prisma.verificationCode.findFirst({
      where: { userId: expired.user.id, consumedAt: null },
    });
    await prisma.verificationCode.update({
      where: { id: expiredRecord.id },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    });
    const expiredResponse = await request(app).post('/api/v1/auth/verify-email').send({
      email: expired.email,
      otp: expired.code,
    });
    assert.equal(expiredResponse.status, 400);
    assert.equal(expiredResponse.body.error.code, 'VERIFICATION_CODE_EXPIRED');

    const limited = await registerPending('limited');
    const limitedRecord = await prisma.verificationCode.findFirst({
      where: { userId: limited.user.id, consumedAt: null },
    });
    await prisma.verificationCode.update({
      where: { id: limitedRecord.id },
      data: { attempts: 5 },
    });
    const limitedResponse = await request(app).post('/api/v1/auth/verify-email').send({
      email: limited.email,
      otp: limited.code,
    });
    assert.equal(limitedResponse.status, 400);
    assert.equal(limitedResponse.body.error.code, 'VERIFICATION_ATTEMPTS_EXCEEDED');
  });

  test('detects refresh-token family reuse and invalidates the replacement session', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email, password });
    const oldCookie = login.headers['set-cookie'][0].split(';')[0];
    const refresh = await request(app).post('/api/v1/auth/refresh').set('Cookie', oldCookie);
    assert.equal(refresh.status, 200);
    const replacementCookie = refresh.headers['set-cookie'][0].split(';')[0];

    const reuse = await request(app).post('/api/v1/auth/refresh').set('Cookie', oldCookie);
    assert.equal(reuse.status, 401);
    assert.equal(reuse.body.error.code, 'REFRESH_TOKEN_REUSE_DETECTED');

    const replacement = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', replacementCookie);
    assert.equal(replacement.status, 401);

    const invalidatedAccess = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${refresh.body.data.accessToken}`);
    assert.equal(invalidatedAccess.status, 401);

    await prisma.user.update({ where: { email }, data: { status: 'SUSPENDED' } });
    const suspended = await request(app).post('/api/v1/auth/login').send({ email, password });
    assert.equal(suspended.status, 403);
    assert.equal(suspended.body.error.code, 'ACCOUNT_DISABLED');
    await prisma.user.update({ where: { email }, data: { status: 'ACTIVE' } });
  });

  test('completes one-time password reset and revokes existing sessions', async () => {
    const forgotUnknown = await request(app).post('/api/v1/auth/forgot-password').send({
      email: `${prefix}-unknown@example.com`,
    });
    const forgot = await request(app).post('/api/v1/auth/forgot-password').send({ email });
    assert.equal(forgotUnknown.status, 200);
    assert.equal(forgot.status, 200);
    assert.equal(forgotUnknown.body.message, forgot.body.message);

    const code = getTestPasswordResetCode(email);
    assert.match(code, /^\d{6}$/);
    const verified = await request(app).post('/api/v1/auth/verify-reset-otp').send({
      email,
      otp: code,
    });
    assert.equal(verified.status, 200);

    const reusedCode = await request(app).post('/api/v1/auth/verify-reset-otp').send({
      email,
      otp: code,
    });
    assert.equal(reusedCode.status, 400);

    const newPassword = 'ResetPassword456!';
    const reset = await request(app).post('/api/v1/auth/reset-password').send({
      resetToken: verified.body.data.resetToken,
      newPassword,
    });
    assert.equal(reset.status, 200);

    const reusedGrant = await request(app).post('/api/v1/auth/reset-password').send({
      resetToken: verified.body.data.resetToken,
      newPassword: 'OtherPassword789!',
    });
    assert.equal(reusedGrant.status, 401);

    assert.equal((await request(app).post('/api/v1/auth/login').send({ email, password })).status, 401);
    const login = await request(app).post('/api/v1/auth/login').send({ email, password: newPassword });
    assert.equal(login.status, 200);
  });

  test('logout-all revokes every refresh token and access session', async () => {
    const currentPassword = 'ResetPassword456!';
    const first = await request(app).post('/api/v1/auth/login').send({ email, password: currentPassword });
    const second = await request(app).post('/api/v1/auth/login').send({ email, password: currentPassword });
    const secondCookie = second.headers['set-cookie'][0].split(';')[0];

    const result = await request(app)
      .post('/api/v1/auth/logout-all')
      .set('Authorization', `Bearer ${first.body.data.accessToken}`);
    assert.equal(result.status, 200);

    const me = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${second.body.data.accessToken}`);
    assert.equal(me.status, 401);
    const refresh = await request(app).post('/api/v1/auth/refresh').set('Cookie', secondCookie);
    assert.equal(refresh.status, 401);
  });

  test('requires a valid access token for current-user endpoint', async () => {
    const missing = await request(app).get('/api/v1/auth/me');
    assert.equal(missing.status, 401);
    assert.equal(missing.body.error.code, 'UNAUTHORIZED');

    const invalid = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid-token');
    assert.equal(invalid.status, 401);
    assert.equal(invalid.body.error.code, 'INVALID_TOKEN');
  });

  test('health endpoint and not-found errors use the common envelope', async () => {
    const health = await request(app).get('/api/v1/health');
    assert.equal(health.status, 200);
    assert.equal(health.body.success, true);

    const missing = await request(app).get('/api/v1/missing');
    assert.equal(missing.status, 404);
    assert.equal(missing.body.success, false);
    assert.equal(missing.body.error.code, 'NOT_FOUND');
  });
});

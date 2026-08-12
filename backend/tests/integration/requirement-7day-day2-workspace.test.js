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
const prefix = `workspace-day2-${stamp}`;
const password = 'Password123!';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
const uploadedPaths = [];

let businessAccount;
let creatorAccount;
let outsiderAccount;
let business;
let creator;
let collaboration;
let conversation;
let task;
let workspaceFile;

const auth = (token) => ({
  get: (url) => request(app).get(url).set('Authorization', `Bearer ${token}`),
  post: (url) => request(app).post(url).set('Authorization', `Bearer ${token}`),
  patch: (url) => request(app).patch(url).set('Authorization', `Bearer ${token}`),
  delete: (url) => request(app).delete(url).set('Authorization', `Bearer ${token}`),
});

async function account(label) {
  const email = `${prefix}-${label}@example.com`;
  const registered = await request(app).post('/api/v1/auth/register').send({
    email, displayName: `${label} workspace user`, password,
  });
  assert.equal(registered.status, 201);
  const verified = await request(app).post('/api/v1/auth/verify-email').send({
    email, otp: getTestVerificationCode(email),
  });
  assert.equal(verified.status, 200);
  const user = await prisma.user.findUnique({ where: { email } });
  return { email, token: verified.body.data.accessToken, user };
}

async function upload(token, purpose = 'COLLABORATION', filename = 'workspace.png') {
  const response = await auth(token).post('/api/v1/media/uploads')
    .field('purpose', purpose)
    .attach('file', png, { filename, contentType: 'image/png' });
  assert.equal(response.status, 201);
  const asset = response.body.data.asset;
  const stored = await prisma.mediaAsset.findUnique({ where: { id: asset.id }, select: { storageKey: true } });
  uploadedPaths.push(path.resolve(process.cwd(), 'uploads', 'media', stored.storageKey));
  return asset;
}

async function cleanup() {
  const users = await prisma.user.findMany({ where: { email: { startsWith: prefix } }, select: { id: true } });
  const userIds = users.map((item) => item.id);
  if (!userIds.length) return;
  const collaborations = await prisma.collaboration.findMany({
    where: { OR: [{ business: { userId: { in: userIds } } }, { creator: { userId: { in: userIds } } }] },
    select: { id: true, workspaceTasks: { select: { id: true } }, workspaceFiles: { select: { id: true } }, conversation: { select: { id: true } } },
  });
  const collaborationIds = collaborations.map((item) => item.id);
  const taskIds = collaborations.flatMap((item) => item.workspaceTasks.map((entry) => entry.id));
  const fileIds = collaborations.flatMap((item) => item.workspaceFiles.map((entry) => entry.id));
  const conversationIds = collaborations.flatMap((item) => item.conversation ? [item.conversation.id] : []);
  if (conversationIds.length) {
    await prisma.message.deleteMany({ where: { conversationId: { in: conversationIds } } });
    await prisma.conversationMember.deleteMany({ where: { conversationId: { in: conversationIds } } });
    await prisma.conversation.deleteMany({ where: { id: { in: conversationIds } } });
  }
  if (collaborationIds.length) await prisma.collaboration.deleteMany({ where: { id: { in: collaborationIds } } });
  await prisma.outboxEvent.deleteMany({
    where: { OR: [
      { aggregateId: { in: collaborationIds } },
      { aggregateId: { in: taskIds } },
      { aggregateId: { in: fileIds } },
    ] },
  });
  await prisma.mediaAsset.deleteMany({ where: { ownerId: { in: userIds } } });
  await prisma.businessProfile.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.creatorProfile.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

before(async () => {
  await cleanup();
  businessAccount = await account('business');
  creatorAccount = await account('creator');
  outsiderAccount = await account('outsider');
  business = await prisma.businessProfile.create({
    data: { userId: businessAccount.user.id, companyName: 'Day 2 Business', slug: `${prefix}-business` },
  });
  creator = await prisma.creatorProfile.create({
    data: { userId: creatorAccount.user.id, channelName: 'Day 2 Creator', slug: `${prefix}-creator` },
  });
  collaboration = await prisma.collaboration.create({
    data: {
      businessId: business.id,
      creatorId: creator.id,
      status: 'IN_PROGRESS',
      progress: 70,
      terms: { budget: 1500000, currency: 'MNT' },
      conversation: {
        create: {
          title: 'Day 2 workspace',
          members: { create: [{ userId: businessAccount.user.id }, { userId: creatorAccount.user.id }] },
        },
      },
    },
    include: { conversation: true },
  });
  conversation = collaboration.conversation;
});

after(async () => {
  await cleanup();
  await Promise.all(uploadedPaths.splice(0).map((file) => fs.unlink(file).catch(() => {})));
  await prisma.$disconnect();
});

describe('Requirement 7-day plan Day 2 workspace operations', () => {
  test('participants can refresh an empty server-backed workspace while outsiders receive 404', async () => {
    const participant = await auth(businessAccount.token).get(`/api/v1/collaborations/${collaboration.id}`);
    assert.equal(participant.status, 200);
    assert.deepEqual(participant.body.data.collaboration.tasks, []);
    const hidden = await auth(outsiderAccount.token).get(`/api/v1/collaborations/${collaboration.id}`);
    assert.equal(hidden.status, 404);
  });

  test('creates an assigned task with activity and outbox records', async () => {
    const response = await auth(businessAccount.token).post(`/api/v1/collaborations/${collaboration.id}/tasks`).send({
      title: 'Prepare first cut',
      description: 'Upload the first vertical edit for review.',
      assigneeId: creatorAccount.user.id,
      dueAt: '2026-08-12T12:00:00.000Z',
      priority: 'HIGH',
      status: 'TODO',
    });
    assert.equal(response.status, 201);
    task = response.body.data.task;
    assert.equal(task.assigneeId, creatorAccount.user.id);
    assert.equal(task.version, 1);
    assert.equal(response.body.data.collaboration.tasks[0].assignee.name, creatorAccount.user.displayName);
    assert.ok(await prisma.collaborationActivity.findFirst({ where: { collaborationId: collaboration.id, type: 'TASK_CREATED', metadata: { path: ['taskId'], equals: task.id } } }));
    assert.ok(await prisma.outboxEvent.findFirst({ where: { topic: 'collaboration.task.created', aggregateId: task.id } }));
  });

  test('rejects an assignee who is not a workspace participant', async () => {
    const response = await auth(businessAccount.token).post(`/api/v1/collaborations/${collaboration.id}/tasks`).send({
      title: 'Invalid assignment', assigneeId: outsiderAccount.user.id,
    });
    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, 'TASK_ASSIGNEE_NOT_PARTICIPANT');
  });

  test('moves a task across statuses and increments its optimistic version', async () => {
    const response = await auth(creatorAccount.token).patch(`/api/v1/collaborations/${collaboration.id}/tasks/${task.id}`).send({
      version: task.version, status: 'IN_PROGRESS', priority: 'URGENT',
    });
    assert.equal(response.status, 200);
    task = response.body.data.task;
    assert.equal(task.status, 'IN_PROGRESS');
    assert.equal(task.priority, 'URGENT');
    assert.equal(task.version, 2);
    assert.ok(await prisma.outboxEvent.findFirst({ where: { topic: 'collaboration.task.moved', aggregateId: task.id } }));
  });

  test('rejects a stale task update with a deterministic conflict', async () => {
    const response = await auth(businessAccount.token).patch(`/api/v1/collaborations/${collaboration.id}/tasks/${task.id}`).send({
      version: 1, title: 'Stale title',
    });
    assert.equal(response.status, 409);
    assert.equal(response.body.error.code, 'TASK_VERSION_CONFLICT');
  });

  test('compatibility toggle maps the task to DONE and keeps the task-board DTO', async () => {
    const response = await auth(creatorAccount.token).post(`/api/v1/collaborations/${collaboration.id}/tasks/${task.id}/toggle`).send({});
    assert.equal(response.status, 200);
    task = response.body.data.task;
    assert.equal(task.status, 'DONE');
    assert.ok(task.completedAt);
    assert.equal(response.body.data.collaboration.tasks.find((item) => item.id === task.id).done, true);
  });

  test('outsiders cannot mutate or delete a task', async () => {
    const update = await auth(outsiderAccount.token).patch(`/api/v1/collaborations/${collaboration.id}/tasks/${task.id}`).send({ version: task.version, status: 'REVIEW' });
    assert.equal(update.status, 404);
    const remove = await auth(outsiderAccount.token).delete(`/api/v1/collaborations/${collaboration.id}/tasks/${task.id}?version=${task.version}`);
    assert.equal(remove.status, 404);
  });

  test('deletes a task but preserves its activity and outbox audit trail', async () => {
    const created = await auth(businessAccount.token).post(`/api/v1/collaborations/${collaboration.id}/tasks`).send({ title: 'Temporary production task' });
    assert.equal(created.status, 201);
    const removedTask = created.body.data.task;
    const response = await auth(businessAccount.token).delete(`/api/v1/collaborations/${collaboration.id}/tasks/${removedTask.id}?version=${removedTask.version}`);
    assert.equal(response.status, 200);
    assert.equal(await prisma.collaborationTask.count({ where: { id: removedTask.id } }), 0);
    assert.ok(await prisma.collaborationActivity.findFirst({ where: { collaborationId: collaboration.id, type: 'TASK_DELETED', metadata: { path: ['taskId'], equals: removedTask.id } } }));
    assert.ok(await prisma.outboxEvent.findFirst({ where: { topic: 'collaboration.task.deleted', aggregateId: removedTask.id } }));
  });

  test('adds an owned collaboration file using authoritative media metadata', async () => {
    const asset = await upload(businessAccount.token);
    const response = await auth(businessAccount.token).post(`/api/v1/collaborations/${collaboration.id}/files`).send({
      mediaAssetId: asset.id,
      name: 'Shared creative reference.png',
      url: 'https://attacker.invalid/file.exe',
      mimeType: 'application/x-msdownload',
      sizeBytes: 1,
      kind: 'REFERENCE',
    });
    assert.equal(response.status, 201);
    workspaceFile = response.body.data;
    assert.equal(workspaceFile.mimeType, 'image/png');
    assert.notEqual(workspaceFile.url, 'https://attacker.invalid/file.exe');
    assert.ok(await prisma.outboxEvent.findFirst({ where: { topic: 'collaboration.file.added', aggregateId: workspaceFile.id } }));
  });

  test('rejects foreign-owned and wrong-purpose workspace media', async () => {
    const foreign = await upload(outsiderAccount.token);
    const foreignResponse = await auth(businessAccount.token).post(`/api/v1/collaborations/${collaboration.id}/files`).send({ mediaAssetId: foreign.id, name: 'Foreign.png' });
    assert.equal(foreignResponse.status, 404);
    const wrongPurpose = await upload(businessAccount.token, 'PORTFOLIO', 'portfolio.png');
    const purposeResponse = await auth(businessAccount.token).post(`/api/v1/collaborations/${collaboration.id}/files`).send({ mediaAssetId: wrongPurpose.id, name: 'Portfolio.png' });
    assert.equal(purposeResponse.status, 404);
  });

  test('rejects disallowed MIME metadata even when the asset belongs to the participant', async () => {
    const invalidAsset = await prisma.mediaAsset.create({
      data: {
        ownerId: businessAccount.user.id,
        purpose: 'COLLABORATION',
        storageKey: `${prefix}/invalid.exe`,
        url: '/invalid.exe',
        originalName: 'invalid.exe',
        mimeType: 'application/x-msdownload',
        sizeBytes: 128,
        checksum: `${stamp}`.padEnd(64, '0').slice(0, 64),
      },
    });
    const response = await auth(businessAccount.token).post(`/api/v1/collaborations/${collaboration.id}/files`).send({ mediaAssetId: invalidAsset.id, name: 'invalid.exe' });
    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, 'WORKSPACE_MEDIA_TYPE_INVALID');
  });

  test('protects message attachments from IDOR and stores server media metadata', async () => {
    const foreign = await upload(outsiderAccount.token, 'COLLABORATION', 'foreign-message.png');
    const blocked = await auth(businessAccount.token).post(`/api/v1/conversations/${conversation.id}/messages`).send({
      attachment: { mediaAssetId: foreign.id, name: 'foreign.png' },
    });
    assert.equal(blocked.status, 404);

    const owned = await upload(businessAccount.token, 'COLLABORATION', 'message.png');
    const sent = await auth(businessAccount.token).post(`/api/v1/conversations/${conversation.id}/messages`).send({
      body: 'Attached reference',
      attachment: { mediaAssetId: owned.id, name: 'spoofed.exe', url: 'https://attacker.invalid' },
    });
    assert.equal(sent.status, 201);
    assert.equal(sent.body.data.message.attachment.name, 'message.png');
    assert.equal(sent.body.data.message.attachment.mimeType, 'image/png');
  });

  test('restores tasks, files and server activities after a workspace refresh', async () => {
    const response = await auth(creatorAccount.token).get(`/api/v1/collaborations/${collaboration.id}`);
    assert.equal(response.status, 200);
    const workspace = response.body.data.collaboration;
    assert.ok(workspace.tasks.some((item) => item.id === task.id && item.version >= 3));
    assert.ok(workspace.files.some((item) => item.id === workspaceFile.id));
    assert.ok(workspace.activity.some((item) => item.metadata?.taskId === task.id));
  });

  test('terminal collaborations reject new task and file mutations', async () => {
    await prisma.collaboration.update({ where: { id: collaboration.id }, data: { status: 'COMPLETED', completedAt: new Date() } });
    const taskResponse = await auth(businessAccount.token).post(`/api/v1/collaborations/${collaboration.id}/tasks`).send({ title: 'Too late' });
    assert.equal(taskResponse.status, 409);
    assert.equal(taskResponse.body.error.code, 'COLLABORATION_TERMINAL');
    const asset = await upload(businessAccount.token, 'COLLABORATION', 'terminal.png');
    const fileResponse = await auth(businessAccount.token).post(`/api/v1/collaborations/${collaboration.id}/files`).send({ mediaAssetId: asset.id, name: 'Terminal.png' });
    assert.equal(fileResponse.status, 409);
    assert.equal(fileResponse.body.error.code, 'COLLABORATION_TERMINAL');
  });
});

import { AppError } from '../../shared/errors/AppError.js';
import { contractSnapshotFromTerms } from '../contracts/contract.snapshot.js';
import { mediaService } from '../media/media.service.js';
import { collaborationInclude, collaborationRepository } from './collaboration.repository.js';
import { toCollaboration } from './collaboration.mapper.js';
import { assertCollaborationTransition } from './collaboration.state.js';
import { calculateCollaborationFinance } from '../payments/finance.rules.js';

const missing = () => new AppError('Collaboration was not found.', 404, 'COLLABORATION_NOT_FOUND');
const conflict = () => new AppError('Collaboration changed in another session. Reload and try again.', 409, 'COLLABORATION_VERSION_CONFLICT');
const taskConflict = () => new AppError('This task changed in another session. Reload the workspace and try again.', 409, 'TASK_VERSION_CONFLICT');
const terminalStatuses = new Set(['COMPLETED', 'CANCELLED']);

function assertParticipant(item, userId) {
  if (!item || (item.business.userId !== userId && item.creator.userId !== userId)) throw missing();
  return item.business.userId === userId ? 'business' : 'creator';
}

async function load(id, userId) {
  const item = await collaborationRepository.findById(id);
  const role = assertParticipant(item, userId);
  return { item, role };
}

function assertWorkspaceMutable(item, resource) {
  if (terminalStatuses.has(item.status)) {
    throw new AppError(
      `${resource} cannot be changed after the collaboration is ${item.status.toLowerCase()}.`,
      409,
      'COLLABORATION_TERMINAL',
      { status: item.status },
    );
  }
}

function assertAssignee(item, assigneeId) {
  if (!assigneeId) return;
  if (![item.business.userId, item.creator.userId].includes(assigneeId)) {
    throw new AppError('A task can only be assigned to a workspace participant.', 400, 'TASK_ASSIGNEE_NOT_PARTICIPANT');
  }
}

function taskOwnerRole(item, assigneeId) {
  if (assigneeId === item.business.userId) return 'BUSINESS';
  if (assigneeId === item.creator.userId) return 'CREATOR';
  return 'BOTH';
}

async function recordWorkspaceMutation(tx, { collaborationId, actorId, type, message, metadata, topic, aggregateId }) {
  await tx.collaborationActivity.create({
    data: { collaborationId, actorId, type, message, metadata },
  });
  await tx.outboxEvent.create({
    data: { topic, aggregateId, payload: { collaborationId, actorId, ...metadata } },
  });
}

export const collaborationService = {
  async list(userId, filters) {
    const result = await collaborationRepository.list(userId, filters);
    return {
      items: result.items.map(toCollaboration),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / filters.limit),
      },
    };
  },
  async get(userId, id) {
    const { item } = await load(id, userId);
    return toCollaboration(item, { viewerId: userId });
  },
  async updateTerms(userId, id, payload) {
    const { item, role } = await load(id, userId);
    if (['PAYMENT_PENDING', 'IN_PROGRESS', 'IN_REVIEW', 'PUBLISHED', 'PROVEN', 'DISPUTED', 'SETTLEMENT_PENDING', 'COMPLETED', 'CANCELLED'].includes(item.status)) {
      throw new AppError('Terms can no longer be edited.', 409, 'TERMS_LOCKED');
    }
    const expected = payload.version || item.version;
    const terms = { ...item.terms, ...payload.terms };
    const finance = calculateCollaborationFinance({
      ...item,
      terms,
      paymentType: terms.paymentType || item.paymentType,
      cashAmount: terms.cashAmount ?? terms.budget ?? item.cashAmount,
      barterDetails: terms.barterDetails ?? item.barterDetails,
      barterEstimatedValue: terms.barterEstimatedValue ?? terms.barterDetails?.estimatedValue ?? item.barterEstimatedValue,
    });
    await collaborationRepository.transaction(async (tx) => {
      const changed = await tx.collaboration.updateMany({
        where: { id, version: expected },
        data: {
          terms,
          paymentType: finance.paymentType,
          cashAmount: finance.cashAmount,
          barterEstimatedValue: finance.barterEstimatedValue,
          barterDetails: finance.barterDetails,
          status: 'NEGOTIATION',
          progress: 20,
          termsVersion: { increment: 1 },
          version: { increment: 1 },
          creatorAgreementApprovedAt: null,
          businessAgreementApprovedAt: null,
        },
      });
      if (changed.count !== 1) throw conflict();
      await tx.agreementVersion.create({
        data: {
          collaborationId: id,
          createdById: userId,
          version: item.termsVersion + 1,
          terms,
          changeNote: payload.changeNote || null,
        },
      });
      await tx.contract.update({
        where: { collaborationId: id },
        data: {
          status: 'DRAFT',
          creatorSignedAt: null,
          businessSignedAt: null,
          ...contractSnapshotFromTerms(terms),
        },
      });
      await tx.collaborationActivity.create({
        data: {
          collaborationId: id,
          actorId: userId,
          type: 'TERMS_UPDATED',
          message: `${role === 'creator' ? 'Creator' : 'Business'} updated the negotiation terms. Existing approvals were reset.`,
          metadata: { termsVersion: item.termsVersion + 1 },
        },
      });
    });
    return this.get(userId, id);
  },
  async lockAgreement(userId, id, payload) {
    const { item } = await load(id, userId);
    if (item.status !== 'NEGOTIATION') throw new AppError('Agreement cannot be locked now.', 409, 'INVALID_COLLABORATION_TRANSITION');
    assertCollaborationTransition(item.status, 'AGREEMENT_REVIEW');
    const expected = payload.version || item.version;
    await collaborationRepository.transaction(async (tx) => {
      const changed = await tx.collaboration.updateMany({
        where: { id, version: expected, status: 'NEGOTIATION' },
        data: { status: 'AGREEMENT_REVIEW', progress: 30, version: { increment: 1 } },
      });
      if (changed.count !== 1) throw conflict();
      await tx.agreementVersion.update({
        where: { collaborationId_version: { collaborationId: id, version: item.termsVersion } },
        data: { lockedAt: new Date() },
      });
      await tx.collaborationActivity.create({
        data: { collaborationId: id, actorId: userId, type: 'AGREEMENT_LOCKED', message: 'Negotiation was locked and the agreement summary was generated.' },
      });
    });
    return this.get(userId, id);
  },
  async approveAgreement(userId, id, payload) {
    const { item, role } = await load(id, userId);
    const current = item.agreementVersions[0];
    if (item.status !== 'AGREEMENT_REVIEW' || !current?.lockedAt) {
      throw new AppError('Agreement is not ready for approval.', 409, 'AGREEMENT_NOT_READY');
    }
    const field = role === 'creator' ? 'creatorApprovedAt' : 'businessApprovedAt';
    if (current[field]) return toCollaboration(item, { viewerId: userId });
    await collaborationRepository.transaction(async (tx) => {
      const updated = await tx.agreementVersion.updateMany({
        where: { id: current.id, [field]: null },
        data: { [field]: new Date() },
      });
      if (updated.count !== 1) return;
      const approved = await tx.agreementVersion.findUnique({ where: { id: current.id } });
      const both = approved.creatorApprovedAt && approved.businessApprovedAt;
      await tx.collaborationActivity.create({
        data: {
          collaborationId: id,
          actorId: userId,
          type: 'AGREEMENT_APPROVED',
          message: `${role === 'creator' ? 'Creator' : 'Business'} approved agreement version ${current.version}.`,
        },
      });
      if (both) {
        assertCollaborationTransition(item.status, 'CONTRACT_REVIEW');
        const contract = await tx.contract.findUnique({ where: { collaborationId: id } });
        const version = contract.currentVersion + 1;
        await tx.contractVersion.create({
          data: {
            contractId: contract.id,
            version,
            terms: approved.terms,
            createdById: userId,
            documentUrl: `/api/v1/contracts/${contract.id}/document?version=${version}`,
          },
        });
        await tx.contract.update({
          where: { id: contract.id },
          data: {
            currentVersion: version,
            status: 'PENDING_APPROVAL',
            ...contractSnapshotFromTerms(approved.terms),
          },
        });
        await tx.collaboration.update({
          where: { id },
          data: { status: 'CONTRACT_REVIEW', progress: 45, version: { increment: 1 } },
        });
        await tx.collaborationActivity.create({
          data: { collaborationId: id, type: 'CONTRACT_GENERATED', message: `Both sides approved the agreement. Contract version ${version} was generated.` },
        });
      }
    });
    return this.get(userId, id);
  },
  async requestAgreementChanges(userId, id, payload) {
    const { item, role } = await load(id, userId);
    if (!['AGREEMENT_REVIEW', 'CONTRACT_REVIEW'].includes(item.status)) {
      throw new AppError('Changes cannot be requested now.', 409, 'INVALID_COLLABORATION_TRANSITION');
    }
    assertCollaborationTransition(item.status, 'NEGOTIATION');
    await collaborationRepository.transaction(async (tx) => {
      const version = item.termsVersion + 1;
      await tx.agreementVersion.create({
        data: {
          collaborationId: id,
          createdById: userId,
          version,
          terms: item.terms,
          changeNote: payload.note,
        },
      });
      await tx.collaboration.update({
        where: { id },
        data: { status: 'NEGOTIATION', progress: 20, termsVersion: version, version: { increment: 1 } },
      });
      await tx.contract.update({
        where: { collaborationId: id },
        data: {
          status: 'CHANGES_REQUESTED',
          creatorSignedAt: null,
          businessSignedAt: null,
          ...contractSnapshotFromTerms(item.terms),
        },
      });
      await tx.collaborationActivity.create({
        data: {
          collaborationId: id,
          actorId: userId,
          type: 'AGREEMENT_CHANGES_REQUESTED',
          message: `${role === 'creator' ? 'Creator' : 'Business'} requested changes: ${payload.note}`,
          metadata: { termsVersion: version },
        },
      });
    });
    return this.get(userId, id);
  },
  async createTask(userId, id, payload) {
    const { item } = await load(id, userId);
    assertWorkspaceMutable(item, 'Tasks');
    assertAssignee(item, payload.assigneeId);
    const highestSortOrder = item.workspaceTasks.reduce((highest, task) => Math.max(highest, task.sortOrder), -1);
    const task = await collaborationRepository.transaction(async (tx) => {
      const created = await tx.collaborationTask.create({
        data: {
          collaborationId: id,
          createdById: userId,
          assigneeId: payload.assigneeId || null,
          title: payload.title,
          description: payload.description || null,
          ownerRole: taskOwnerRole(item, payload.assigneeId),
          status: payload.status,
          priority: payload.priority,
          sortOrder: payload.sortOrder ?? highestSortOrder + 1,
          dueAt: payload.dueAt || null,
          completedAt: payload.status === 'DONE' ? new Date() : null,
        },
        include: { assignee: { select: { id: true, displayName: true, avatarUrl: true } } },
      });
      await recordWorkspaceMutation(tx, {
        collaborationId: id,
        actorId: userId,
        type: 'TASK_CREATED',
        message: `Created task: ${created.title}`,
        metadata: { taskId: created.id, status: created.status, priority: created.priority, assigneeId: created.assigneeId },
        topic: 'collaboration.task.created',
        aggregateId: created.id,
      });
      return created;
    });
    return { task, collaboration: await this.get(userId, id) };
  },

  async updateTask(userId, id, taskId, payload) {
    const { item } = await load(id, userId);
    assertWorkspaceMutable(item, 'Tasks');
    const current = item.workspaceTasks.find((task) => task.id === taskId);
    if (!current) throw new AppError('Task was not found.', 404, 'TASK_NOT_FOUND');
    if (Object.hasOwn(payload, 'assigneeId')) assertAssignee(item, payload.assigneeId);
    const nextStatus = payload.status ?? current.status;
    const data = {
      ...(payload.title !== undefined && { title: payload.title }),
      ...(payload.description !== undefined && { description: payload.description || null }),
      ...(payload.assigneeId !== undefined && {
        assigneeId: payload.assigneeId || null,
        ownerRole: taskOwnerRole(item, payload.assigneeId),
      }),
      ...(payload.dueAt !== undefined && { dueAt: payload.dueAt || null }),
      ...(payload.status !== undefined && {
        status: payload.status,
        completedAt: payload.status === 'DONE' ? current.completedAt || new Date() : null,
      }),
      ...(payload.priority !== undefined && { priority: payload.priority }),
      ...(payload.sortOrder !== undefined && { sortOrder: payload.sortOrder }),
      version: { increment: 1 },
    };
    const task = await collaborationRepository.transaction(async (tx) => {
      const changed = await tx.collaborationTask.updateMany({
        where: { id: taskId, collaborationId: id, version: payload.version },
        data,
      });
      if (changed.count !== 1) throw taskConflict();
      const updated = await tx.collaborationTask.findUnique({
        where: { id: taskId },
        include: { assignee: { select: { id: true, displayName: true, avatarUrl: true } } },
      });
      const moved = nextStatus !== current.status;
      await recordWorkspaceMutation(tx, {
        collaborationId: id,
        actorId: userId,
        type: moved ? 'TASK_MOVED' : 'TASK_UPDATED',
        message: moved ? `Moved ${updated.title} from ${current.status} to ${updated.status}.` : `Updated task: ${updated.title}`,
        metadata: { taskId, fromStatus: current.status, status: updated.status, priority: updated.priority, version: updated.version },
        topic: moved ? 'collaboration.task.moved' : 'collaboration.task.updated',
        aggregateId: taskId,
      });
      return updated;
    });
    return { task, collaboration: await this.get(userId, id) };
  },

  async deleteTask(userId, id, taskId, version) {
    const { item } = await load(id, userId);
    assertWorkspaceMutable(item, 'Tasks');
    const task = item.workspaceTasks.find((entry) => entry.id === taskId);
    if (!task) throw new AppError('Task was not found.', 404, 'TASK_NOT_FOUND');
    await collaborationRepository.transaction(async (tx) => {
      const removed = await tx.collaborationTask.deleteMany({ where: { id: taskId, collaborationId: id, version } });
      if (removed.count !== 1) throw taskConflict();
      await recordWorkspaceMutation(tx, {
        collaborationId: id,
        actorId: userId,
        type: 'TASK_DELETED',
        message: `Deleted task: ${task.title}`,
        metadata: { taskId, title: task.title, status: task.status, priority: task.priority, version: task.version },
        topic: 'collaboration.task.deleted',
        aggregateId: taskId,
      });
    });
    return { taskId, collaboration: await this.get(userId, id) };
  },

  async toggleTask(userId, id, taskId) {
    const { item } = await load(id, userId);
    const task = item.workspaceTasks.find((entry) => entry.id === taskId);
    if (!task) throw new AppError('Task was not found.', 404, 'TASK_NOT_FOUND');
    return this.updateTask(userId, id, taskId, {
      version: task.version,
      status: task.status === 'DONE' ? 'TODO' : 'DONE',
    });
  },
  async addFile(userId, id, payload) {
    const { item } = await load(id, userId);
    assertWorkspaceMutable(item, 'Files');
    const asset = await mediaService.requireWorkspaceAsset(userId, payload.mediaAssetId);
    const record = await collaborationRepository.transaction(async (tx) => {
      const file = await tx.collaborationFile.create({
        data: {
          collaborationId: id,
          uploadedById: userId,
          mediaAssetId: asset.id,
          name: payload.name || asset.originalName,
          url: asset.url,
          mimeType: asset.mimeType,
          sizeBytes: asset.sizeBytes,
          kind: payload.kind,
        },
      });
      await recordWorkspaceMutation(tx, {
        collaborationId: id,
        actorId: userId,
        type: 'FILE_ADDED',
        message: `${file.name} was added to project files.`,
        metadata: { fileId: file.id, mediaAssetId: asset.id, mimeType: asset.mimeType, sizeBytes: asset.sizeBytes },
        topic: 'collaboration.file.added',
        aggregateId: file.id,
      });
      return file;
    });
    return { ...record, workspace: await this.get(userId, id) };
  },
  async addActivity(userId, id, message) {
    const { role } = await load(id, userId);
    await collaborationRepository.transaction(async (tx) => {
      await tx.collaborationActivity.create({
        data: {
          collaborationId: id,
          actorId: userId,
          type: 'MEMBER_NOTE',
          message,
          metadata: { role },
        },
      });
    });
    return this.get(userId, id);
  },
};

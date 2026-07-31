import { AppError } from '../../shared/errors/AppError.js';
import { collaborationInclude, collaborationRepository } from './collaboration.repository.js';
import { toCollaboration } from './collaboration.mapper.js';

const missing = () => new AppError('Collaboration was not found.', 404, 'COLLABORATION_NOT_FOUND');
const conflict = () => new AppError('Collaboration changed in another session. Reload and try again.', 409, 'COLLABORATION_VERSION_CONFLICT');

function assertParticipant(item, userId) {
  if (!item || (item.business.userId !== userId && item.creator.userId !== userId)) throw missing();
  return item.business.userId === userId ? 'business' : 'creator';
}

async function load(id, userId) {
  const item = await collaborationRepository.findById(id);
  const role = assertParticipant(item, userId);
  return { item, role };
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
    return toCollaboration(item);
  },
  async updateTerms(userId, id, payload) {
    const { item, role } = await load(id, userId);
    if (['PAYMENT_PENDING', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'CANCELLED'].includes(item.status)) {
      throw new AppError('Terms can no longer be edited.', 409, 'TERMS_LOCKED');
    }
    const expected = payload.version || item.version;
    const terms = { ...item.terms, ...payload.terms };
    await collaborationRepository.transaction(async (tx) => {
      const changed = await tx.collaboration.updateMany({
        where: { id, version: expected },
        data: {
          terms,
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
        data: { status: 'DRAFT', creatorSignedAt: null, businessSignedAt: null },
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
    if (current[field]) return toCollaboration(item);
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
          data: { currentVersion: version, status: 'PENDING_APPROVAL' },
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
        data: { status: 'CHANGES_REQUESTED', creatorSignedAt: null, businessSignedAt: null },
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
  async toggleTask(userId, id, taskId) {
    await load(id, userId);
    await collaborationRepository.transaction(async (tx) => {
      const task = await tx.collaborationTask.findFirst({ where: { id: taskId, collaborationId: id } });
      if (!task) throw new AppError('Task was not found.', 404, 'TASK_NOT_FOUND');
      const completedAt = task.completedAt ? null : new Date();
      await tx.collaborationTask.update({ where: { id: taskId }, data: { completedAt } });
      await tx.collaborationActivity.create({
        data: {
          collaborationId: id,
          actorId: userId,
          type: completedAt ? 'TASK_COMPLETED' : 'TASK_REOPENED',
          message: `${completedAt ? 'Completed' : 'Reopened'} task: ${task.title}`,
        },
      });
    });
    return this.get(userId, id);
  },
  async addFile(userId, id, payload) {
    await load(id, userId);
    const record = await collaborationRepository.transaction(async (tx) => {
      if (payload.mediaAssetId) {
        const asset = await tx.mediaAsset.findFirst({ where: { id: payload.mediaAssetId, ownerId: userId } });
        if (!asset) throw new AppError('Uploaded media was not found.', 404, 'MEDIA_NOT_FOUND');
      }
      const file = await tx.collaborationFile.create({
        data: { collaborationId: id, uploadedById: userId, ...payload },
      });
      await tx.collaborationActivity.create({
        data: { collaborationId: id, actorId: userId, type: 'FILE_ADDED', message: `${file.name} was added to project files.` },
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

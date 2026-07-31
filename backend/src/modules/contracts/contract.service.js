import { AppError } from '../../shared/errors/AppError.js';
import { contractRepository } from './contract.repository.js';

const missing = () => new AppError('Contract was not found.', 404, 'CONTRACT_NOT_FOUND');

function actorRole(contract, userId) {
  if (!contract) throw missing();
  if (contract.collaboration.business.userId === userId) return 'business';
  if (contract.collaboration.creator.userId === userId) return 'creator';
  throw missing();
}

function map(contract) {
  return {
    id: contract.id,
    collaborationId: contract.collaborationId,
    status: contract.status,
    currentVersion: contract.currentVersion,
    creatorSignedAt: contract.creatorSignedAt,
    businessSignedAt: contract.businessSignedAt,
    activatedAt: contract.activatedAt,
    versions: contract.versions.map((version) => ({
      version: version.version,
      terms: version.terms,
      documentUrl: version.documentUrl,
      changeNote: version.changeNote,
      approvals: {
        creator: Boolean(version.creatorApprovedAt),
        business: Boolean(version.businessApprovedAt),
      },
      createdAt: version.createdAt,
    })),
  };
}

export const contractService = {
  async get(userId, id) {
    const contract = await contractRepository.findById(id);
    actorRole(contract, userId);
    return map(contract);
  },
  async approve(userId, id) {
    const contract = await contractRepository.findById(id);
    const role = actorRole(contract, userId);
    if (contract.status === 'ACTIVE') return map(contract);
    if (contract.status !== 'PENDING_APPROVAL' || contract.currentVersion < 1) {
      throw new AppError('Contract is not ready for approval.', 409, 'CONTRACT_NOT_READY');
    }
    const current = contract.versions.find((version) => version.version === contract.currentVersion);
    const field = role === 'creator' ? 'creatorApprovedAt' : 'businessApprovedAt';
    await contractRepository.transaction(async (tx) => {
      const changed = await tx.contractVersion.updateMany({
        where: { id: current.id, [field]: null },
        data: { [field]: new Date() },
      });
      if (changed.count === 0) return;
      const approved = await tx.contractVersion.findUnique({ where: { id: current.id } });
      const both = approved.creatorApprovedAt && approved.businessApprovedAt;
      await tx.collaborationActivity.create({
        data: {
          collaborationId: contract.collaborationId,
          actorId: userId,
          type: 'CONTRACT_APPROVED',
          message: `${role === 'creator' ? 'Creator' : 'Business'} approved contract version ${current.version}.`,
        },
      });
      if (both) {
        const now = new Date();
        await tx.contract.update({
          where: { id },
          data: {
            status: 'ACTIVE',
            creatorSignedAt: approved.creatorApprovedAt,
            businessSignedAt: approved.businessApprovedAt,
            activatedAt: now,
          },
        });
        await tx.collaboration.update({
          where: { id: contract.collaborationId },
          data: { status: 'PAYMENT_PENDING', progress: 60, version: { increment: 1 } },
        });
        await tx.outboxEvent.create({
          data: {
            topic: 'contract.activated',
            aggregateId: id,
            payload: { contractId: id, collaborationId: contract.collaborationId, version: current.version },
          },
        });
      }
    });
    return map(await contractRepository.findById(id));
  },
  async requestChanges(userId, id, note) {
    const contract = await contractRepository.findById(id);
    const role = actorRole(contract, userId);
    if (contract.status !== 'PENDING_APPROVAL') {
      throw new AppError('Contract changes cannot be requested now.', 409, 'CONTRACT_CHANGES_NOT_ALLOWED');
    }
    const collaboration = contract.collaboration;
    await contractRepository.transaction(async (tx) => {
      const currentAgreement = await tx.agreementVersion.findUnique({
        where: {
          collaborationId_version: {
            collaborationId: collaboration.id,
            version: collaboration.termsVersion,
          },
        },
      });
      const version = collaboration.termsVersion + 1;
      await tx.agreementVersion.create({
        data: {
          collaborationId: collaboration.id,
          createdById: userId,
          version,
          terms: currentAgreement.terms,
          changeNote: note,
        },
      });
      await tx.contract.update({
        where: { id },
        data: { status: 'CHANGES_REQUESTED', creatorSignedAt: null, businessSignedAt: null },
      });
      await tx.collaboration.update({
        where: { id: collaboration.id },
        data: { status: 'NEGOTIATION', progress: 20, termsVersion: version, version: { increment: 1 } },
      });
      await tx.collaborationActivity.create({
        data: {
          collaborationId: collaboration.id,
          actorId: userId,
          type: 'CONTRACT_CHANGES_REQUESTED',
          message: `${role === 'creator' ? 'Creator' : 'Business'} requested contract changes: ${note}`,
        },
      });
    });
    return map(await contractRepository.findById(id));
  },
  async document(userId, id, versionNumber) {
    const contract = await contractRepository.findById(id);
    actorRole(contract, userId);
    const version = versionNumber
      ? contract.versions.find((item) => item.version === versionNumber)
      : contract.versions.find((item) => item.version === contract.currentVersion);
    if (!version) throw new AppError('Contract version was not found.', 404, 'CONTRACT_VERSION_NOT_FOUND');
    return {
      filename: `contract-${contract.id}-v${version.version}.json`,
      body: JSON.stringify({
        contractId: contract.id,
        collaborationId: contract.collaborationId,
        version: version.version,
        parties: {
          business: contract.collaboration.business.companyName,
          creator: contract.collaboration.creator.channelName,
        },
        terms: version.terms,
        approvals: {
          creatorApprovedAt: version.creatorApprovedAt,
          businessApprovedAt: version.businessApprovedAt,
        },
        generatedAt: version.createdAt,
      }, null, 2),
    };
  },
};

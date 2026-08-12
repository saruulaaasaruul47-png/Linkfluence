import { AppError } from '../../shared/errors/AppError.js';
import PDFDocument from 'pdfkit';
import { assertCollaborationTransition } from '../collaborations/collaboration.state.js';
import { toContract } from './contract.mapper.js';
import { contractSnapshotFromTerms } from './contract.snapshot.js';
import { contractRepository } from './contract.repository.js';

const missing = () => new AppError('Contract was not found.', 404, 'CONTRACT_NOT_FOUND');

function actorRole(contract, actor) {
  if (!contract) throw missing();
  if (actor.roles?.includes('ADMIN')) return 'admin';
  if (contract.collaboration.business.userId === actor.id) return 'business';
  if (contract.collaboration.creator.userId === actor.id) return 'creator';
  throw missing();
}

function printable(value) {
  if (value === null || value === undefined || value === '') return 'Not specified';
  if (Array.isArray(value)) return value.map(printable).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function renderPdf(contract, version) {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({
      size: 'A4',
      margin: 52,
      info: { Title: `${contract.collaboration.campaign?.title || contract.collaboration.offer?.title || 'Creator services'} agreement` },
    });
    const chunks = [];
    document.on('data', (chunk) => chunks.push(chunk));
    document.on('error', reject);
    document.on('end', () => resolve(Buffer.concat(chunks)));

    document.fontSize(9).fillColor('#777777').text('VYRA - CREATOR SERVICES AGREEMENT');
    document.moveDown(0.7).fontSize(22).fillColor('#111111')
      .text(contract.collaboration.campaign?.title || contract.collaboration.offer?.title || 'Direct collaboration');
    document.fontSize(10).fillColor('#555555')
      .text(`Contract ${contract.id} - Version ${version.version}`);
    document.moveDown(1.3).fontSize(14).fillColor('#111111').text('Parties');
    document.fontSize(10).fillColor('#444444')
      .text(`Business: ${contract.collaboration.business.companyName}`)
      .text(`Creator: ${contract.collaboration.creator.channelName}`);
    document.moveDown(1.1).fontSize(14).fillColor('#111111').text('Commercial terms');
    Object.entries(version.terms || {}).forEach(([key, value]) => {
      document.fontSize(9).fillColor('#777777').text(key.replace(/([A-Z])/g, ' $1').trim(), { continued: true })
        .fillColor('#222222').text(`: ${printable(value)}`);
    });
    document.moveDown(1.1).fontSize(14).fillColor('#111111').text('Approvals');
    document.fontSize(10).fillColor('#444444')
      .text(`Creator approved: ${version.creatorApprovedAt ? new Date(version.creatorApprovedAt).toISOString() : 'Pending'}`)
      .text(`Business approved: ${version.businessApprovedAt ? new Date(version.businessApprovedAt).toISOString() : 'Pending'}`);
    document.moveDown(1.3).fontSize(8).fillColor('#777777')
      .text(`Generated ${new Date().toISOString()}. This document reflects the immutable server-side contract version shown above.`);
    document.end();
  });
}

export const contractService = {
  async list(actor, filters) {
    const contracts = await contractRepository.listForActor(actor, filters);
    const hasMore = contracts.length > filters.limit;
    const items = contracts.slice(0, filters.limit);
    return {
      items: items.map((contract) => toContract(contract, actor)),
      nextCursor: hasMore ? items.at(-1).id : null,
    };
  },
  async get(actor, id) {
    const contract = await contractRepository.findById(id);
    actorRole(contract, actor);
    return toContract(contract, actor);
  },
  async approve(actor, id) {
    const contract = await contractRepository.findById(id);
    const role = actorRole(contract, actor);
    if (role === 'admin') throw new AppError('An administrator cannot approve a participant contract.', 403, 'CONTRACT_PARTICIPANT_REQUIRED');
    if (contract.status === 'ACTIVE') return toContract(contract, actor);
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
          actorId: actor.id,
          type: 'CONTRACT_APPROVED',
          message: `${role === 'creator' ? 'Creator' : 'Business'} approved contract version ${current.version}.`,
        },
      });
      if (both) {
        const now = new Date();
        assertCollaborationTransition(contract.collaboration.status, 'PAYMENT_PENDING');
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
    return toContract(await contractRepository.findById(id), actor);
  },
  async requestChanges(actor, id, note) {
    const contract = await contractRepository.findById(id);
    const role = actorRole(contract, actor);
    if (role === 'admin') throw new AppError('An administrator cannot change participant contract terms.', 403, 'CONTRACT_PARTICIPANT_REQUIRED');
    if (contract.status !== 'PENDING_APPROVAL') {
      throw new AppError('Contract changes cannot be requested now.', 409, 'CONTRACT_CHANGES_NOT_ALLOWED');
    }
    const collaboration = contract.collaboration;
    assertCollaborationTransition(collaboration.status, 'NEGOTIATION');
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
          createdById: actor.id,
          version,
          terms: currentAgreement.terms,
          changeNote: note,
        },
      });
      await tx.contract.update({
        where: { id },
        data: {
          status: 'CHANGES_REQUESTED',
          creatorSignedAt: null,
          businessSignedAt: null,
          ...contractSnapshotFromTerms(currentAgreement.terms),
        },
      });
      await tx.collaboration.update({
        where: { id: collaboration.id },
        data: { status: 'NEGOTIATION', progress: 20, termsVersion: version, version: { increment: 1 } },
      });
      await tx.collaborationActivity.create({
        data: {
          collaborationId: collaboration.id,
          actorId: actor.id,
          type: 'CONTRACT_CHANGES_REQUESTED',
          message: `${role === 'creator' ? 'Creator' : 'Business'} requested contract changes: ${note}`,
        },
      });
    });
    return toContract(await contractRepository.findById(id), actor);
  },
  async document(actor, id, versionNumber) {
    const contract = await contractRepository.findById(id);
    actorRole(contract, actor);
    const version = versionNumber
      ? contract.versions.find((item) => item.version === versionNumber)
      : contract.versions.find((item) => item.version === contract.currentVersion);
    if (!version) throw new AppError('Contract version was not found.', 404, 'CONTRACT_VERSION_NOT_FOUND');
    return {
      filename: `contract-${contract.id}-v${version.version}.pdf`,
      buffer: await renderPdf(contract, version),
    };
  },
};

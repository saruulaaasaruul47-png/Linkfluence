import { contractSnapshotFromTerms } from '../contracts/contract.snapshot.js';

export async function bootstrapCollaboration(tx, input) {
  const existing = await tx.workOffer.findUnique({
    where: { sourceType_sourceId: { sourceType: input.sourceType, sourceId: input.sourceId } },
    include: { collaboration: { select: { id: true } } },
  });
  if (existing?.collaboration) return existing.collaboration.id;

  const terms = {
    sourceType: input.sourceType,
    contentType: input.contentType || 'Campaign collaboration',
    deliverables: input.deliverables || 'Campaign brief deliverables',
    budget: Number(input.budget || 0),
    currency: input.currency || 'MNT',
    timeline: input.timeline || 'According to campaign schedule',
    revisionLimit: input.revisionLimit ?? 2,
    publishBy: input.publishBy || null,
    retentionDays: input.retentionDays ?? 30,
    disputeWindowDays: input.disputeWindowDays ?? 7,
    disclosureRequired: input.disclosureRequired ?? true,
  };
  const offer = existing || await tx.workOffer.create({
    data: {
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      businessId: input.businessId,
      creatorId: input.creatorId,
      campaignId: input.campaignId || null,
      title: input.title,
      contentType: terms.contentType,
      budget: terms.budget,
      currency: terms.currency,
      timeline: terms.timeline,
      message: input.message || null,
      finalTerms: terms,
      status: 'APPROVED',
      respondedAt: new Date(),
    },
  });
  const collaboration = await tx.collaboration.create({
    data: {
      offerId: offer.id,
      campaignId: input.campaignId || null,
      businessId: input.businessId,
      creatorId: input.creatorId,
      status: 'NEGOTIATION',
      progress: 15,
      terms,
      agreementVersions: { create: { createdById: input.actorId, version: 1, terms } },
      contract: { create: { status: 'DRAFT', currentVersion: 0, ...contractSnapshotFromTerms(terms) } },
      conversation: {
        create: {
          title: input.title,
          members: { create: [{ userId: input.businessUserId }, { userId: input.creatorUserId }] },
        },
      },
      workspaceTasks: {
        create: [
          { createdById: input.actorId, title: 'Confirm final creative brief', ownerRole: 'BOTH', priority: 'HIGH', sortOrder: 0 },
          { createdById: input.actorId, assigneeId: input.creatorUserId, title: 'Upload first draft', ownerRole: 'CREATOR', priority: 'HIGH', sortOrder: 1 },
          { createdById: input.actorId, assigneeId: input.businessUserId, title: 'Review first draft', ownerRole: 'BUSINESS', priority: 'MEDIUM', sortOrder: 2 },
        ],
      },
      activities: {
        create: [{
          actorId: input.actorId,
          type: 'WORKSPACE_CREATED',
          message: `${input.sourceType.toLowerCase()} acceptance created the collaboration workspace.`,
        }],
      },
    },
  });
  await tx.offerRevision.create({
    data: {
      offerId: offer.id,
      actorId: input.actorId,
      version: 1,
      action: `${input.sourceType}_ACCEPTED`,
      snapshot: { status: 'APPROVED', sourceId: input.sourceId, workspaceId: collaboration.id },
    },
  });
  await tx.outboxEvent.create({
    data: {
      topic: 'collaboration.created',
      aggregateId: collaboration.id,
      payload: { collaborationId: collaboration.id, offerId: offer.id, sourceType: input.sourceType, sourceId: input.sourceId },
    },
  });
  await tx.notification.createMany({
    data: [
      { userId: input.businessUserId, type: 'CONTRACT', title: 'Collaboration workspace created', body: `${input.title} is ready for agreement review.`, href: `/business/collaborations/${collaboration.id}`, data: { collaborationId: collaboration.id } },
      { userId: input.creatorUserId, type: 'CONTRACT', title: 'Collaboration workspace created', body: `${input.title} is ready for agreement review.`, href: `/creator/collaborations/${collaboration.id}`, data: { collaborationId: collaboration.id } },
    ],
  });
  return collaboration.id;
}

import { AppError } from '../../shared/errors/AppError.js';
import { contractSnapshotFromTerms } from '../contracts/contract.snapshot.js';
import { toOffer } from './offer.mapper.js';
import { offerInclude, offerRepository } from './offer.repository.js';

const allowedCreator = ['PENDING_CREATOR_RESPONSE', 'CHANGES_REQUESTED'];
const allowedBusiness = ['INTERESTED', 'COUNTER_PROPOSAL_SENT'];
const conflict = () => new AppError('Offer changed in another session. Reload and try again.', 409, 'OFFER_VERSION_CONFLICT');
const missing = () => new AppError('Work offer was not found.', 404, 'OFFER_NOT_FOUND');
const pageMeta = (page, limit, total) => ({ page, limit, total, totalPages: Math.ceil(total / limit) });

async function participant(offer, userId) {
  if (!offer) throw missing();
  if (offer.creator.userId !== userId && offer.business.userId !== userId) throw missing();
  return offer;
}

function snapshot(offer, action, data) {
  return {
    action,
    status: data.status,
    counterTerms: data.counterTerms ?? offer.counterTerms,
    finalTerms: data.finalTerms ?? offer.finalTerms,
  };
}

async function transition({ offer, userId, expectedVersion, action, allowed, data, note }) {
  return offerRepository.transaction(async (tx) => {
    const changed = await tx.workOffer.updateMany({
      where: { id: offer.id, version: expectedVersion, status: { in: allowed } },
      data: { ...data, version: { increment: 1 } },
    });
    if (changed.count !== 1) throw conflict();
    const nextVersion = expectedVersion + 1;
    await tx.offerRevision.create({
      data: {
        offerId: offer.id,
        actorId: userId,
        version: nextVersion,
        action,
        snapshot: snapshot(offer, action, data),
        note: note || null,
      },
    });
    await tx.outboxEvent.create({
      data: {
        topic: `offer.${action.toLowerCase()}`,
        aggregateId: offer.id,
        payload: { offerId: offer.id, status: data.status, version: nextVersion },
      },
    });
    return tx.workOffer.findUnique({ where: { id: offer.id }, include: offerInclude });
  });
}

export const offerService = {
  async create(userId, payload) {
    const [business, creator] = await Promise.all([
      offerRepository.findBusiness(userId),
      offerRepository.findCreator(payload.creatorId),
    ]);
    if (!business) throw new AppError('Create a business channel first.', 403, 'BUSINESS_PROFILE_REQUIRED');
    if (!creator) throw new AppError('Creator was not found.', 404, 'CREATOR_NOT_FOUND');
    if (creator.userId === userId) throw new AppError('You cannot send an offer to yourself.', 409, 'SELF_OFFER_NOT_ALLOWED');
    let campaign = null;
    if (payload.campaignId) {
      campaign = await offerRepository.findCampaign(payload.campaignId);
      if (!campaign || campaign.businessId !== business.id) {
        throw new AppError('Campaign was not found.', 404, 'CAMPAIGN_NOT_FOUND');
      }
    }
    return toOffer(await offerRepository.create({
      businessId: business.id,
      creatorId: creator.id,
      campaignId: campaign?.id || null,
      title: payload.title,
      contentType: payload.contentType,
      budget: payload.budget,
      paymentType: payload.paymentType,
      barterDetails: payload.barterDetails,
      currency: payload.currency,
      timeline: payload.timeline,
      message: payload.message,
    }, userId));
  },

  async list(userId, filters) {
    const [business, creator] = await Promise.all([
      offerRepository.findBusiness(userId),
      offerRepository.findCreatorByUserId(userId),
    ]);
    let where;
    if (filters.side === 'business') {
      if (!business) throw new AppError('Business channel is required.', 403, 'BUSINESS_PROFILE_REQUIRED');
      where = { businessId: business.id };
    } else {
      if (!creator) throw new AppError('Creator channel is required.', 403, 'CREATOR_PROFILE_REQUIRED');
      where = { creatorId: creator.id };
    }
    if (filters.status) where.status = filters.status;
    const result = await offerRepository.list(where, filters);
    return { items: result.items.map(toOffer), pagination: pageMeta(filters.page, filters.limit, result.total) };
  },

  async get(userId, id) {
    return toOffer(await participant(await offerRepository.findById(id), userId));
  },

  async creatorRespond(userId, id, payload) {
    const offer = await participant(await offerRepository.findById(id), userId);
    if (offer.creator.userId !== userId) throw missing();
    if (!allowedCreator.includes(offer.status)) {
      throw new AppError('Creator response is not allowed in the current state.', 409, 'INVALID_OFFER_TRANSITION');
    }
    const response = payload.action === 'COUNTER'
      ? {
          type: 'COUNTER',
          requestedPayment: payload.requestedPayment,
          availableTimeline: payload.availableTimeline,
          idea: payload.idea,
          message: payload.message || '',
          createdAt: new Date().toISOString(),
        }
      : payload.action === 'DECLINE'
        ? { type: 'DECLINED', reason: payload.reason || '', createdAt: new Date().toISOString() }
        : { type: 'INTERESTED', message: 'I am interested in this collaboration.', createdAt: new Date().toISOString() };
    const statuses = { INTERESTED: 'INTERESTED', COUNTER: 'COUNTER_PROPOSAL_SENT', DECLINE: 'DECLINED' };
    const updated = await transition({
      offer,
      userId,
      expectedVersion: payload.version || offer.version,
      action: `CREATOR_${payload.action}`,
      allowed: allowedCreator,
      data: {
        status: statuses[payload.action],
        counterTerms: { ...(offer.counterTerms || {}), creatorResponse: response },
        respondedAt: new Date(),
      },
      note: payload.reason || payload.message,
    });
    return toOffer(updated);
  },

  async businessDecide(userId, id, payload) {
    const offer = await participant(await offerRepository.findById(id), userId);
    if (offer.business.userId !== userId) throw missing();
    if (payload.action === 'APPROVE') return this.approve(userId, offer, payload);
    if (!allowedBusiness.includes(offer.status)) {
      throw new AppError('Business decision is not allowed in the current state.', 409, 'INVALID_OFFER_TRANSITION');
    }
    const status = payload.action === 'REQUEST_CHANGES' ? 'CHANGES_REQUESTED' : 'DECLINED_BY_BUSINESS';
    const businessResponse = {
      type: payload.action === 'REQUEST_CHANGES' ? 'CHANGES_REQUESTED' : 'DECLINED',
      message: payload.message || '',
      createdAt: new Date().toISOString(),
    };
    return toOffer(await transition({
      offer,
      userId,
      expectedVersion: payload.version || offer.version,
      action: `BUSINESS_${payload.action}`,
      allowed: allowedBusiness,
      data: { status, finalTerms: { ...(offer.finalTerms || {}), businessResponse } },
      note: payload.message,
    }));
  },

  async approve(userId, offer, payload) {
    if (offer.status === 'APPROVED' && offer.collaboration) {
      return { ...toOffer(offer), workspaceId: offer.collaboration.id };
    }
    if (!allowedBusiness.includes(offer.status)) {
      throw new AppError('This offer cannot be approved.', 409, 'INVALID_OFFER_TRANSITION');
    }
    const expectedVersion = payload.version || offer.version;
    const finalBudget = payload.finalBudget
      ?? offer.counterTerms?.creatorResponse?.requestedPayment
      ?? Number(offer.budget);
    const finalTimeline = payload.finalTimeline
      || offer.counterTerms?.creatorResponse?.availableTimeline
      || offer.timeline;
    const terms = {
      contentType: offer.contentType,
      deliverables: payload.deliverables || '1 Instagram Reel, 2 Stories',
      contentCount: payload.contentCount || '3 assets',
      draftDeadline: payload.draftDeadline || null,
      finalDeadline: payload.finalDeadline || null,
      publishDate: payload.publishDate || null,
      revisionLimit: payload.revisionLimit || '2 revision rounds',
      usageRights: payload.usageRights || 'Organic social, 90 days',
      paymentTerms: '100% funded before production',
      additionalRequirements: payload.additionalRequirements || '',
      budget: finalBudget,
      cashAmount: finalBudget,
      paymentType: offer.paymentType,
      barterDetails: offer.barterDetails,
      barterEstimatedValue: offer.barterDetails?.estimatedValue || null,
      timeline: finalTimeline,
      currency: offer.currency,
    };
    const result = await offerRepository.transaction(async (tx) => {
      const changed = await tx.workOffer.updateMany({
        where: { id: offer.id, version: expectedVersion, status: { in: allowedBusiness } },
        data: {
          status: 'APPROVED',
          finalTerms: {
            finalBudget,
            finalTimeline,
            businessResponse: { type: 'APPROVED', message: 'Collaboration approved.', createdAt: new Date().toISOString() },
          },
          version: { increment: 1 },
        },
      });
      if (changed.count !== 1) {
        const existing = await tx.collaboration.findUnique({ where: { offerId: offer.id } });
        if (existing) return { workspaceId: existing.id };
        throw conflict();
      }
      const collaboration = await tx.collaboration.create({
        data: {
          offerId: offer.id,
          campaignId: offer.campaignId,
          businessId: offer.businessId,
          creatorId: offer.creatorId,
          status: 'NEGOTIATION',
          progress: 15,
          terms,
          paymentType: offer.paymentType,
          cashAmount: finalBudget,
          barterEstimatedValue: offer.barterDetails?.estimatedValue || null,
          barterDetails: offer.barterDetails,
          agreementVersions: { create: { createdById: userId, version: 1, terms } },
          contract: { create: { status: 'DRAFT', currentVersion: 0, ...contractSnapshotFromTerms(terms) } },
          conversation: {
            create: {
              title: offer.campaign?.title || offer.title,
              members: {
                create: [
                  { userId: offer.business.userId },
                  { userId: offer.creator.userId },
                ],
              },
            },
          },
          workspaceTasks: {
            create: [
              { createdById: userId, title: 'Confirm final creative brief', ownerRole: 'BOTH', priority: 'HIGH', sortOrder: 0 },
              { createdById: userId, assigneeId: offer.creator.userId, title: 'Upload visual treatment', ownerRole: 'CREATOR', priority: 'HIGH', sortOrder: 1 },
              { createdById: userId, assigneeId: offer.business.userId, title: 'Review first draft', ownerRole: 'BUSINESS', priority: 'MEDIUM', sortOrder: 2 },
            ],
          },
          activities: {
            create: [
              { actorId: userId, type: 'WORKSPACE_CREATED', message: 'Business approved the collaboration and the workspace was created.' },
              { type: 'TERMS_CREATED', message: 'Initial terms are ready for structured negotiation.' },
            ],
          },
        },
      });
      await tx.offerRevision.create({
        data: {
          offerId: offer.id,
          actorId: userId,
          version: expectedVersion + 1,
          action: 'BUSINESS_APPROVE',
          snapshot: { status: 'APPROVED', finalBudget, finalTimeline, workspaceId: collaboration.id },
        },
      });
      await tx.outboxEvent.create({
        data: {
          topic: 'collaboration.created',
          aggregateId: collaboration.id,
          payload: { collaborationId: collaboration.id, offerId: offer.id },
        },
      });
      await tx.notification.createMany({
        data: [
          {
            userId: offer.business.userId,
            type: 'CONTRACT',
            title: 'Collaboration workspace created',
            body: `${offer.title} is ready for agreement review.`,
            href: `/business/collaborations/${collaboration.id}`,
            data: { collaborationId: collaboration.id },
          },
          {
            userId: offer.creator.userId,
            type: 'CONTRACT',
            title: 'Collaboration workspace created',
            body: `${offer.title} is ready for agreement review.`,
            href: `/creator/collaborations/${collaboration.id}`,
            data: { collaborationId: collaboration.id },
          },
        ],
      });
      return { workspaceId: collaboration.id };
    });
    const updated = await offerRepository.findById(offer.id);
    return { ...toOffer(updated), workspaceId: result.workspaceId };
  },
};

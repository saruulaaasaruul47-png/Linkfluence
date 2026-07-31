import { AppError } from '../../shared/errors/AppError.js';
import { toInvitation, toSourcedCreator } from './sourcing.mapper.js';
import { sourcingRepository } from './sourcing.repository.js';

const pageMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
  hasNextPage: page * limit < total,
});

async function businessFor(userId) {
  const business = await sourcingRepository.findBusiness(userId);
  if (!business) throw new AppError('Create a business channel first.', 403, 'BUSINESS_PROFILE_REQUIRED');
  return business;
}

async function contextFor(businessId, identifier) {
  if (!identifier) return { contextKey: 'general', campaignId: null };
  const campaign = await sourcingRepository.findCampaign(identifier);
  if (!campaign) throw new AppError('Campaign was not found.', 404, 'CAMPAIGN_NOT_FOUND');
  if (campaign.businessId !== businessId) {
    throw new AppError('You do not own this campaign.', 403, 'CAMPAIGN_FORBIDDEN');
  }
  return { contextKey: campaign.id, campaignId: campaign.id };
}

async function creatorFor(identifier, userId) {
  const creator = await sourcingRepository.findCreator(identifier);
  if (!creator) throw new AppError('Creator was not found.', 404, 'CREATOR_NOT_FOUND');
  if (creator.userId === userId) {
    throw new AppError('Your own creator channel cannot be added here.', 409, 'OWN_CREATOR_NOT_ALLOWED');
  }
  return creator;
}

export const sourcingService = {
  async listShortlist(userId, campaignId) {
    const business = await businessFor(userId);
    const context = await contextFor(business.id, campaignId);
    return (await sourcingRepository.listShortlist(business.id, context.contextKey)).map(toSourcedCreator);
  },

  async addShortlist(userId, creatorIdentifier, payload) {
    const business = await businessFor(userId);
    const [creator, context] = await Promise.all([
      creatorFor(creatorIdentifier, userId),
      contextFor(business.id, payload.campaignId),
    ]);
    return toSourcedCreator(await sourcingRepository.upsertShortlist({
      businessId: business.id,
      creatorId: creator.id,
      campaignId: context.campaignId,
      contextKey: context.contextKey,
      note: payload.note || null,
    }));
  },

  async removeShortlist(userId, creatorIdentifier, campaignId) {
    const business = await businessFor(userId);
    const [creator, context] = await Promise.all([
      creatorFor(creatorIdentifier, userId),
      contextFor(business.id, campaignId),
    ]);
    await sourcingRepository.removeShortlist(business.id, creator.id, context.contextKey);
    return null;
  },

  async listCompare(userId, campaignId) {
    const business = await businessFor(userId);
    const context = await contextFor(business.id, campaignId);
    return (await sourcingRepository.listCompare(business.id, context.contextKey)).map(toSourcedCreator);
  },

  async addCompare(userId, creatorIdentifier, payload) {
    const business = await businessFor(userId);
    const [creator, context] = await Promise.all([
      creatorFor(creatorIdentifier, userId),
      contextFor(business.id, payload.campaignId),
    ]);
    const existing = await sourcingRepository.findCompare(
      business.id,
      creator.id,
      context.contextKey,
    );
    if (existing) return toSourcedCreator(existing);
    if (await sourcingRepository.countCompare(business.id, context.contextKey) >= 4) {
      throw new AppError('Compare up to four creators at a time.', 409, 'COMPARE_LIMIT_REACHED');
    }
    return toSourcedCreator(await sourcingRepository.upsertCompare({
      businessId: business.id,
      creatorId: creator.id,
      campaignId: context.campaignId,
      contextKey: context.contextKey,
    }));
  },

  async removeCompare(userId, creatorIdentifier, campaignId) {
    const business = await businessFor(userId);
    const [creator, context] = await Promise.all([
      creatorFor(creatorIdentifier, userId),
      contextFor(business.id, campaignId),
    ]);
    await sourcingRepository.removeCompare(business.id, creator.id, context.contextKey);
    return null;
  },

  async invite(userId, payload) {
    const business = await businessFor(userId);
    const [creator, campaign] = await Promise.all([
      creatorFor(payload.creatorId, userId),
      sourcingRepository.findCampaign(payload.campaignId),
    ]);
    if (!campaign) throw new AppError('Campaign was not found.', 404, 'CAMPAIGN_NOT_FOUND');
    if (campaign.businessId !== business.id) {
      throw new AppError('You do not own this campaign.', 403, 'CAMPAIGN_FORBIDDEN');
    }
    if (campaign.status !== 'OPEN') {
      throw new AppError('Publish the campaign before inviting creators.', 409, 'CAMPAIGN_NOT_OPEN');
    }
    try {
      return toInvitation(await sourcingRepository.createInvitation({
        businessId: business.id,
        creatorId: creator.id,
        campaignId: campaign.id,
        message: payload.message || null,
      }));
    } catch (error) {
      if (error?.code === 'P2002') {
        throw new AppError('This creator has already been invited.', 409, 'INVITATION_EXISTS');
      }
      throw error;
    }
  },

  async listBusinessInvitations(userId, filters) {
    const business = await businessFor(userId);
    const result = await sourcingRepository.listInvitations({
      businessId: business.id,
      ...(filters.status && { status: filters.status }),
    }, filters.page, filters.limit);
    return {
      items: result.items.map(toInvitation),
      pagination: pageMeta(filters.page, filters.limit, result.total),
    };
  },

  async listCreatorInvitations(userId, filters) {
    const creator = await sourcingRepository.findCreatorByUserId(userId);
    if (!creator) throw new AppError('Create a creator channel first.', 403, 'CREATOR_PROFILE_REQUIRED');
    const result = await sourcingRepository.listInvitations({
      creatorId: creator.id,
      ...(filters.status && { status: filters.status }),
    }, filters.page, filters.limit);
    return {
      items: result.items.map(toInvitation),
      pagination: pageMeta(filters.page, filters.limit, result.total),
    };
  },

  async respond(userId, id, action) {
    const invitation = await sourcingRepository.findInvitation(id);
    if (!invitation || invitation.creator.userId !== userId) {
      throw new AppError('Invitation was not found.', 404, 'INVITATION_NOT_FOUND');
    }
    if (invitation.status !== 'PENDING') {
      throw new AppError('This invitation has already been answered.', 409, 'INVITATION_ALREADY_RESPONDED');
    }
    return toInvitation(await sourcingRepository.updateInvitation(id, {
      status: action === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED',
      respondedAt: new Date(),
    }));
  },

  async cancel(userId, id) {
    const business = await businessFor(userId);
    const invitation = await sourcingRepository.findInvitation(id);
    if (!invitation || invitation.business.id !== business.id) {
      throw new AppError('Invitation was not found.', 404, 'INVITATION_NOT_FOUND');
    }
    if (invitation.status !== 'PENDING') {
      throw new AppError('Only a pending invitation can be cancelled.', 409, 'INVITATION_ALREADY_RESPONDED');
    }
    return toInvitation(await sourcingRepository.updateInvitation(id, {
      status: 'CANCELLED',
      respondedAt: new Date(),
    }));
  },
};

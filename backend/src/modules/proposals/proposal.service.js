import { AppError } from '../../shared/errors/AppError.js';
import { toProposal } from './proposal.mapper.js';
import { proposalRepository } from './proposal.repository.js';

const pagination = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
  hasNextPage: page * limit < total,
  hasPreviousPage: page > 1,
});

async function creatorFor(userId) {
  const creator = await proposalRepository.findCreatorByUserId(userId);
  if (!creator) throw new AppError('Create a creator channel first.', 403, 'CREATOR_PROFILE_REQUIRED');
  return creator;
}

async function businessFor(userId) {
  const business = await proposalRepository.findBusinessByUserId(userId);
  if (!business) throw new AppError('Create a business channel first.', 403, 'BUSINESS_PROFILE_REQUIRED');
  return business;
}

function assertOpen(campaign) {
  if (campaign.status !== 'OPEN' || !campaign.isPublic) {
    throw new AppError('This campaign is not accepting proposals.', 409, 'CAMPAIGN_NOT_OPEN');
  }
  if (campaign.applicationDeadline && campaign.applicationDeadline <= new Date()) {
    throw new AppError('The proposal deadline has passed.', 409, 'PROPOSAL_DEADLINE_PASSED');
  }
}

function versionConflict() {
  return new AppError('Proposal was changed in another session. Reload and try again.', 409, 'PROPOSAL_VERSION_CONFLICT');
}

export const proposalService = {
  async create(userId, campaignIdentifier, payload) {
    const [creator, campaign] = await Promise.all([
      creatorFor(userId),
      proposalRepository.findCampaign(campaignIdentifier),
    ]);
    if (!campaign) throw new AppError('Campaign was not found.', 404, 'CAMPAIGN_NOT_FOUND');
    assertOpen(campaign);
    if (campaign.business.userId === userId) {
      throw new AppError('You cannot submit a proposal to your own campaign.', 409, 'OWN_CAMPAIGN_PROPOSAL');
    }
    if (await proposalRepository.findByCampaignCreator(campaign.id, creator.id)) {
      throw new AppError('You already submitted a proposal to this campaign.', 409, 'PROPOSAL_EXISTS');
    }
    return toProposal(await proposalRepository.create({
      campaignId: campaign.id,
      creatorId: creator.id,
      ...payload,
      status: 'SUBMITTED',
    }));
  },

  async listCreator(userId, filters) {
    const creator = await creatorFor(userId);
    const result = await proposalRepository.listForCreator(creator.id, filters);
    return {
      items: result.items.map(toProposal),
      pagination: pagination(filters.page, filters.limit, result.total),
    };
  },

  async listBusiness(userId, filters) {
    const business = await businessFor(userId);
    const result = await proposalRepository.listForBusiness(business.id, filters);
    return {
      items: result.items.map(toProposal),
      pagination: pagination(filters.page, filters.limit, result.total),
    };
  },

  async get(userId, id) {
    const proposal = await proposalRepository.findById(id);
    if (!proposal) throw new AppError('Proposal was not found.', 404, 'PROPOSAL_NOT_FOUND');
    if (proposal.creator.userId !== userId && proposal.campaign.business.userId !== userId) {
      throw new AppError('Proposal was not found.', 404, 'PROPOSAL_NOT_FOUND');
    }
    return toProposal(proposal);
  },

  async update(userId, id, payload) {
    const proposal = await proposalRepository.findById(id);
    if (!proposal || proposal.creator.userId !== userId) {
      throw new AppError('Proposal was not found.', 404, 'PROPOSAL_NOT_FOUND');
    }
    if (!['SUBMITTED', 'COUNTERED'].includes(proposal.status)) {
      throw new AppError('This proposal can no longer be edited.', 409, 'PROPOSAL_LOCKED');
    }
    assertOpen(proposal.campaign);
    const { version, ...changes } = payload;
    const updated = await proposalRepository.updateVersioned(
      id,
      version || proposal.version,
      { ...changes, status: 'SUBMITTED', counterAmount: null, counterMessage: null },
    );
    if (!updated) throw versionConflict();
    return toProposal(updated);
  },

  async withdraw(userId, id) {
    const proposal = await proposalRepository.findById(id);
    if (!proposal || proposal.creator.userId !== userId) {
      throw new AppError('Proposal was not found.', 404, 'PROPOSAL_NOT_FOUND');
    }
    if (!['SUBMITTED', 'SHORTLISTED', 'COUNTERED'].includes(proposal.status)) {
      throw new AppError('This proposal cannot be withdrawn.', 409, 'INVALID_PROPOSAL_TRANSITION');
    }
    const updated = await proposalRepository.updateVersioned(
      id,
      proposal.version,
      { status: 'WITHDRAWN' },
    );
    if (!updated) throw versionConflict();
    return toProposal(updated);
  },

  async decide(userId, id, payload) {
    const proposal = await proposalRepository.findById(id);
    if (!proposal) throw new AppError('Proposal was not found.', 404, 'PROPOSAL_NOT_FOUND');
    const business = await businessFor(userId);
    if (proposal.campaign.business.id !== business.id) {
      throw new AppError('You do not own this proposal.', 403, 'PROPOSAL_FORBIDDEN');
    }
    const transitions = {
      SHORTLIST: {
        from: ['SUBMITTED', 'COUNTERED'],
        data: { status: 'SHORTLISTED' },
        shortlist: true,
      },
      COUNTER: {
        from: ['SUBMITTED', 'SHORTLISTED'],
        data: {
          status: 'COUNTERED',
          counterAmount: payload.counterAmount,
          counterMessage: payload.counterMessage || null,
        },
      },
      ACCEPT: {
        from: ['SUBMITTED', 'SHORTLISTED', 'COUNTERED'],
        data: { status: 'ACCEPTED' },
        shortlist: true,
      },
      REJECT: {
        from: ['SUBMITTED', 'SHORTLISTED', 'COUNTERED'],
        data: { status: 'REJECTED' },
      },
    };
    const transition = transitions[payload.action];
    if (!transition.from.includes(proposal.status)) {
      throw new AppError('This proposal decision is not allowed.', 409, 'INVALID_PROPOSAL_TRANSITION');
    }
    const updated = await proposalRepository.decide(
      proposal,
      payload.version || proposal.version,
      transition.data,
      transition.shortlist,
    );
    if (!updated) throw versionConflict();
    return toProposal(updated);
  },
};

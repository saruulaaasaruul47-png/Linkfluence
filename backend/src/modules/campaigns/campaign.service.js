import { AppError } from '../../shared/errors/AppError.js';
import { campaignRepository } from './campaign.repository.js';
import { toCampaign } from './campaign.mapper.js';

const pagination = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
  hasNextPage: page * limit < total,
  hasPreviousPage: page > 1,
});

const slugify = (value) => value
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[^\w\s-]/g, '')
  .trim()
  .replace(/[\s_]+/g, '-')
  .replace(/-+/g, '-')
  .slice(0, 70) || 'campaign';

async function uniqueSlug(title) {
  const base = slugify(title);
  if (!await campaignRepository.findBySlug(base)) return base;
  for (let index = 2; index <= 100; index += 1) {
    const candidate = `${base}-${index}`;
    if (!await campaignRepository.findBySlug(candidate)) return candidate;
  }
  throw new AppError('A unique campaign URL could not be created.', 409, 'CAMPAIGN_SLUG_CONFLICT');
}

async function businessFor(userId) {
  const business = await campaignRepository.findBusinessByUserId(userId);
  if (!business) throw new AppError('Create a business channel first.', 403, 'BUSINESS_PROFILE_REQUIRED');
  return business;
}

function validateBudget(payload) {
  if (payload.budgetMin !== undefined && payload.budgetMax !== undefined
    && payload.budgetMin > payload.budgetMax) {
    throw new AppError('Maximum budget must be at least the minimum budget.', 400, 'INVALID_BUDGET_RANGE');
  }
}

function assertPublishable(campaign) {
  if (!['DRAFT', 'PAUSED'].includes(campaign.status)) {
    throw new AppError('Only a draft or paused campaign can be published.', 409, 'INVALID_CAMPAIGN_TRANSITION');
  }
  if (!campaign.description?.trim() || !campaign.category) {
    throw new AppError('Complete the campaign brief before publishing.', 409, 'CAMPAIGN_BRIEF_INCOMPLETE');
  }
  if (campaign.applicationDeadline && campaign.applicationDeadline <= new Date()) {
    throw new AppError('Application deadline must be in the future.', 409, 'CAMPAIGN_DEADLINE_PASSED');
  }
}

function assertUpdated(campaign) {
  if (!campaign) {
    throw new AppError(
      'Campaign was changed in another session. Reload and try again.',
      409,
      'CAMPAIGN_VERSION_CONFLICT',
    );
  }
  return campaign;
}

async function owned(userId, identifier) {
  const [business, campaign] = await Promise.all([
    businessFor(userId),
    campaignRepository.findByIdentifier(identifier),
  ]);
  if (!campaign) throw new AppError('Campaign was not found.', 404, 'CAMPAIGN_NOT_FOUND');
  if (campaign.businessId !== business.id) {
    throw new AppError('You do not own this campaign.', 403, 'CAMPAIGN_FORBIDDEN');
  }
  return { business, campaign };
}

export const campaignService = {
  async listPublic(filters) {
    const result = await campaignRepository.listPublic(filters);
    return {
      items: result.items.map(toCampaign),
      pagination: pagination(filters.page, filters.limit, result.total),
    };
  },

  async listOwned(userId, filters) {
    const business = await businessFor(userId);
    const result = await campaignRepository.listOwned(business.id, filters);
    return {
      items: result.items.map(toCampaign),
      pagination: pagination(filters.page, filters.limit, result.total),
    };
  },

  async get(identifier, userId = null) {
    const campaign = await campaignRepository.findByIdentifier(identifier);
    if (!campaign) throw new AppError('Campaign was not found.', 404, 'CAMPAIGN_NOT_FOUND');
    const owner = userId && campaign.business.userId === userId;
    if (!owner && (!campaign.isPublic || campaign.status !== 'OPEN')) {
      throw new AppError('Campaign was not found.', 404, 'CAMPAIGN_NOT_FOUND');
    }
    return toCampaign(campaign);
  },

  async create(userId, payload) {
    validateBudget(payload);
    const business = await businessFor(userId);
    return toCampaign(await campaignRepository.create({
      businessId: business.id,
      slug: await uniqueSlug(payload.title),
      ...payload,
      status: 'DRAFT',
      isPublic: false,
    }));
  },

  async update(userId, identifier, payload) {
    const { campaign } = await owned(userId, identifier);
    if (['IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ARCHIVED'].includes(campaign.status)) {
      throw new AppError('This campaign can no longer be edited.', 409, 'CAMPAIGN_LOCKED');
    }
    validateBudget({
      budgetMin: payload.budgetMin
        ?? (campaign.budgetMin == null ? undefined : Number(campaign.budgetMin)),
      budgetMax: payload.budgetMax
        ?? (campaign.budgetMax == null ? undefined : Number(campaign.budgetMax)),
    });
    const { version, ...data } = payload;
    const updated = await campaignRepository.updateOwned(
      campaign.id,
      campaign.businessId,
      version || campaign.version,
      data,
    );
    if (!updated) {
      throw new AppError('Campaign was changed in another session. Reload and try again.', 409, 'CAMPAIGN_VERSION_CONFLICT');
    }
    return toCampaign(assertUpdated(updated));
  },

  async publish(userId, identifier, isPublic = true) {
    const { campaign } = await owned(userId, identifier);
    assertPublishable(campaign);
    const updated = await campaignRepository.updateOwned(
      campaign.id,
      campaign.businessId,
      campaign.version,
      { status: 'OPEN', isPublic, publishedAt: campaign.publishedAt || new Date(), archivedAt: null },
    );
    return toCampaign(assertUpdated(updated));
  },

  async pause(userId, identifier) {
    const { campaign } = await owned(userId, identifier);
    if (campaign.status !== 'OPEN') {
      throw new AppError('Only an open campaign can be paused.', 409, 'INVALID_CAMPAIGN_TRANSITION');
    }
    return toCampaign(assertUpdated(await campaignRepository.updateOwned(
      campaign.id,
      campaign.businessId,
      campaign.version,
      { status: 'PAUSED', isPublic: false },
    )));
  },

  async archive(userId, identifier) {
    const { campaign } = await owned(userId, identifier);
    if (campaign.status === 'IN_PROGRESS') {
      throw new AppError('An in-progress campaign cannot be archived.', 409, 'CAMPAIGN_IN_PROGRESS');
    }
    return toCampaign(assertUpdated(await campaignRepository.updateOwned(
      campaign.id,
      campaign.businessId,
      campaign.version,
      { status: 'ARCHIVED', isPublic: false, archivedAt: new Date() },
    )));
  },

  async remove(userId, identifier) {
    const { campaign } = await owned(userId, identifier);
    if (campaign.status !== 'DRAFT' || campaign._count.proposals > 0) {
      throw new AppError('Only an unused draft campaign can be deleted.', 409, 'CAMPAIGN_DELETE_NOT_ALLOWED');
    }
    await campaignRepository.remove(campaign.id);
    return null;
  },
};

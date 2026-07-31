import { AppError } from '../../shared/errors/AppError.js';
import { mediaService } from '../media/public.js';
import { toUserProfile } from '../users/public.js';
import { toCreatorProfile } from './creator.mapper.js';
import { creatorRepository } from './creator.repository.js';

const socialFields = {
  instagram: 'INSTAGRAM',
  facebook: 'FACEBOOK',
  tiktok: 'TIKTOK',
  manualLink: 'OTHER',
};

function parseRate(value) {
  if (value === undefined || value === '') return undefined;
  if (typeof value === 'number') return value;
  const parsed = Number(String(value).replace(/[^\d.]/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildSocialAccounts(userId, payload) {
  const touched = Object.keys(socialFields).some((field) => field in payload);
  if (!touched) return undefined;
  return Object.entries(socialFields)
    .filter(([field]) => payload[field])
    .map(([field, platform]) => ({
      platform,
      handle: `${userId}-${platform.toLowerCase()}`,
      profileUrl: payload[field],
    }));
}

function buildProfileData(payload, creating = false) {
  const data = {};
  const channelName = payload.channelName ?? payload.name;
  if (channelName !== undefined) data.channelName = channelName;
  if (payload.username !== undefined) data.slug = payload.username;
  if (payload.bio !== undefined) data.bio = payload.bio || null;
  if (payload.location !== undefined) data.location = payload.location || null;
  if (payload.niche !== undefined) data.categories = payload.niche ? [payload.niche] : [];
  if (payload.language !== undefined) data.languages = payload.language ? [payload.language] : [];
  if (payload.audience !== undefined) data.audienceDescription = payload.audience || null;
  if (payload.format !== undefined) data.contentFormat = payload.format || null;
  if (payload.publicRates !== undefined) data.publicRates = payload.publicRates;
  if (payload.availability !== undefined) {
    data.availability = payload.availability || null;
    data.availableForWork = !/not accepting|unavailable/i.test(payload.availability);
  }
  if (payload.avatar !== undefined) data.avatarUrl = payload.avatar || null;
  if (payload.cover !== undefined) data.coverUrl = payload.cover || null;

  const rateKeys = ['postRate', 'storyRate', 'reelRate'];
  if (creating || rateKeys.some((key) => key in payload)) {
    data.rates = Object.fromEntries(
      rateKeys.map((key) => [key, parseRate(payload[key])]).filter(([, value]) => value !== undefined),
    );
  }
  if ('rate' in payload) data.startingRate = parseRate(payload.rate) ?? null;
  else if (creating) {
    data.startingRate = parseRate(payload.reelRate)
      ?? parseRate(payload.postRate)
      ?? parseRate(payload.storyRate)
      ?? null;
  }

  const metadataKeys = ['workTitle', 'workCategory', 'workDescription'];
  if (creating || metadataKeys.some((key) => key in payload)) {
    data.metadata = Object.fromEntries(
      metadataKeys.map((key) => [key, payload[key] || '']),
    );
  }
  return data;
}

async function assertSlugAvailable(userId, slug) {
  if (!slug) return;
  const existing = await creatorRepository.findBySlug(slug);
  if (existing && existing.userId !== userId) {
    throw new AppError('This creator username is already in use.', 409, 'CREATOR_USERNAME_EXISTS');
  }
}

function requireProfile(profile) {
  if (!profile) throw new AppError('Creator profile was not found.', 404, 'CREATOR_PROFILE_NOT_FOUND');
  return profile;
}

async function applyOwnedMedia(userId, payload, data) {
  if (payload.avatarMediaId) {
    data.avatarUrl = (await mediaService.requireOwned(userId, payload.avatarMediaId, 'AVATAR')).url;
  }
  if (payload.coverMediaId) {
    data.coverUrl = (await mediaService.requireOwned(userId, payload.coverMediaId, 'COVER')).url;
  }
}

async function initialPortfolioItem(userId, payload) {
  if (!payload.sampleMediaId) return null;
  if (!payload.workTitle?.trim()) {
    throw new AppError('A title is required for the portfolio sample.', 400, 'PORTFOLIO_TITLE_REQUIRED');
  }
  const media = await mediaService.requireOwned(userId, payload.sampleMediaId, 'PORTFOLIO');
  return {
    mediaAssetId: media.id,
    title: payload.workTitle.trim(),
    description: payload.workDescription || null,
    category: payload.workCategory || null,
    mediaType: media.mimeType.startsWith('video/') ? 'VIDEO' : 'IMAGE',
    mediaUrl: media.url,
    status: 'PUBLISHED',
    publishedAt: new Date(),
  };
}

export const creatorService = {
  async create(userId, payload) {
    if (await creatorRepository.findByUserId(userId)) {
      throw new AppError('A creator profile already exists.', 409, 'CREATOR_PROFILE_EXISTS');
    }
    await assertSlugAvailable(userId, payload.username);
    const profileData = buildProfileData(payload, true);
    await applyOwnedMedia(userId, payload, profileData);
    const result = await creatorRepository.create(
      userId,
      profileData,
      buildSocialAccounts(userId, payload) || [],
      await initialPortfolioItem(userId, payload),
    );
    return {
      profile: toCreatorProfile(result.profile),
      user: toUserProfile(result.user),
    };
  },

  async get(userId) {
    return toCreatorProfile(requireProfile(await creatorRepository.findByUserId(userId)));
  },

  async update(userId, payload) {
    requireProfile(await creatorRepository.findByUserId(userId));
    await assertSlugAvailable(userId, payload.username);
    const profileData = buildProfileData(payload);
    await applyOwnedMedia(userId, payload, profileData);
    const profile = await creatorRepository.update(
      userId,
      profileData,
      buildSocialAccounts(userId, payload),
    );
    return toCreatorProfile(profile);
  },

  async remove(userId) {
    requireProfile(await creatorRepository.findByUserId(userId));
    return toUserProfile(await creatorRepository.remove(userId));
  },
};

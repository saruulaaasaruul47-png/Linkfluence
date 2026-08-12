import { AppError } from '../../shared/errors/AppError.js';
import { mediaService } from '../media/public.js';
import { toUserProfile } from '../users/public.js';
import { toBusinessProfile } from './business.mapper.js';
import { businessRepository } from './business.repository.js';
import { assertFeatureEnabled, assertSettingEnabled } from '../operations/platform-config.service.js';

function buildProfileData(payload, creating = false) {
  const data = {};
  const companyName = payload.organization ?? payload.name;
  if (companyName !== undefined) data.companyName = companyName;
  if (payload.username !== undefined) data.slug = payload.username;
  if (payload.description !== undefined) data.description = payload.description || null;
  if (payload.industry !== undefined) data.industry = payload.industry || null;
  if (payload.website !== undefined) data.website = payload.website || null;
  if (payload.companySize !== undefined) data.companySize = payload.companySize || null;
  if (payload.contactEmail !== undefined) data.contactEmail = payload.contactEmail || null;
  if (payload.location !== undefined) data.location = payload.location || null;
  if (payload.logo !== undefined) data.logoUrl = payload.logo || null;
  if (payload.cover !== undefined) data.coverUrl = payload.cover || null;

  const preferenceKeys = ['targetNiche', 'campaignGoal', 'monthlyBudget'];
  if (creating || preferenceKeys.some((key) => key in payload)) {
    data.preferences = Object.fromEntries(
      preferenceKeys.map((key) => [key, payload[key] || '']),
    );
  }
  return data;
}

function requireProfile(profile) {
  if (!profile) throw new AppError('Business profile was not found.', 404, 'BUSINESS_PROFILE_NOT_FOUND');
  return profile;
}

async function assertSlugAvailable(userId, slug) {
  if (!slug) return;
  const existing = await businessRepository.findBySlug(slug);
  if (existing && existing.userId !== userId) {
    throw new AppError('This business username is already in use.', 409, 'BUSINESS_USERNAME_EXISTS');
  }
}

async function applyOwnedMedia(userId, payload, data) {
  if (payload.logoMediaId) {
    data.logoUrl = (await mediaService.requireOwned(userId, payload.logoMediaId, 'LOGO')).url;
  }
  if (payload.coverMediaId) {
    data.coverUrl = (await mediaService.requireOwned(userId, payload.coverMediaId, 'COVER')).url;
  }
}

export const businessService = {
  async create(userId, payload) {
    await assertSettingEnabled('businessApplications', 'BUSINESS_APPLICATIONS_CLOSED', 'Business applications are temporarily closed.');
    await assertFeatureEnabled('business_onboarding', { id: userId, roles: ['VIEWER'] });
    if (await businessRepository.findByUserId(userId)) {
      throw new AppError('A business profile already exists.', 409, 'BUSINESS_PROFILE_EXISTS');
    }
    await assertSlugAvailable(userId, payload.username);
    const data = buildProfileData(payload, true);
    await applyOwnedMedia(userId, payload, data);
    const result = await businessRepository.create(userId, data);
    return {
      profile: toBusinessProfile(result.profile),
      user: toUserProfile(result.user),
    };
  },

  async get(userId) {
    return toBusinessProfile(requireProfile(await businessRepository.findByUserId(userId)));
  },

  async update(userId, payload) {
    requireProfile(await businessRepository.findByUserId(userId));
    await assertSlugAvailable(userId, payload.username);
    const data = buildProfileData(payload);
    await applyOwnedMedia(userId, payload, data);
    return toBusinessProfile(await businessRepository.update(userId, data));
  },

  async remove(userId) {
    requireProfile(await businessRepository.findByUserId(userId));
    return toUserProfile(await businessRepository.remove(userId));
  },
};

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

function toMember(member) {
  return {
    id: member.id,
    role: member.role,
    status: member.status,
    joinedAt: member.joinedAt,
    createdAt: member.createdAt,
    user: member.user,
  };
}

async function requireManagedBusiness(userId) {
  const profile = requireProfile(await businessRepository.findByUserId(userId));
  const membership = await businessRepository.findManagerMembership(profile.id, userId);
  if (!membership || membership.status !== 'ACTIVE' || !['OWNER', 'ADMIN'].includes(membership.role)) {
    throw new AppError('Only a business owner or admin can manage team members.', 403, 'BUSINESS_TEAM_FORBIDDEN');
  }
  return { profile, membership };
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

  async listMembers(userId) {
    const profile = requireProfile(await businessRepository.findByUserId(userId));
    return (await businessRepository.listMembers(profile.id)).map(toMember);
  },

  async inviteMember(userId, payload) {
    const { profile } = await requireManagedBusiness(userId);
    const invitedUser = await businessRepository.findUserByEmail(payload.email);
    if (!invitedUser || invitedUser.status !== 'ACTIVE') {
      throw new AppError('An active account with this email was not found.', 404, 'BUSINESS_MEMBER_USER_NOT_FOUND');
    }
    if (invitedUser.id === profile.userId) {
      throw new AppError('The business owner is already a team member.', 409, 'BUSINESS_OWNER_ALREADY_MEMBER');
    }
    return toMember(await businessRepository.upsertInvitation(
      profile.id,
      invitedUser.id,
      payload.role,
      userId,
    ));
  },

  async acceptMember(userId, memberId) {
    const member = await businessRepository.findMembership(memberId);
    if (!member || member.userId !== userId) {
      throw new AppError('Business invitation was not found.', 404, 'BUSINESS_INVITATION_NOT_FOUND');
    }
    if (member.status !== 'INVITED') {
      throw new AppError('This business invitation is no longer pending.', 409, 'BUSINESS_INVITATION_NOT_PENDING');
    }
    return toMember(await businessRepository.updateMember(memberId, {
      status: 'ACTIVE',
      joinedAt: new Date(),
    }));
  },

  async updateMember(userId, memberId, payload) {
    const { profile } = await requireManagedBusiness(userId);
    const member = await businessRepository.findMembership(memberId);
    if (!member || member.businessId !== profile.id) {
      throw new AppError('Business member was not found.', 404, 'BUSINESS_MEMBER_NOT_FOUND');
    }
    if (member.role === 'OWNER') {
      throw new AppError('The business owner membership cannot be changed.', 409, 'BUSINESS_OWNER_IMMUTABLE');
    }
    return toMember(await businessRepository.updateMember(memberId, payload));
  },

  async removeMember(userId, memberId) {
    const { profile } = await requireManagedBusiness(userId);
    const member = await businessRepository.findMembership(memberId);
    if (!member || member.businessId !== profile.id) {
      throw new AppError('Business member was not found.', 404, 'BUSINESS_MEMBER_NOT_FOUND');
    }
    if (member.role === 'OWNER') {
      throw new AppError('The business owner membership cannot be removed.', 409, 'BUSINESS_OWNER_IMMUTABLE');
    }
    await businessRepository.deleteMember(memberId);
  },
};

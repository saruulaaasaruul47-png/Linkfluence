import { AppError } from '../../shared/errors/AppError.js';
import { mediaService } from '../media/public.js';
import { toUserProfile } from '../users/public.js';
import { toCreatorProfile } from './creator.mapper.js';
import { creatorRepository } from './creator.repository.js';
import { assertFeatureEnabled, assertSettingEnabled } from '../operations/platform-config.service.js';
import PDFDocument from 'pdfkit';

const socialFields = {
  instagram: 'INSTAGRAM',
  facebook: 'FACEBOOK',
  tiktok: 'TIKTOK',
  youtube: 'YOUTUBE',
  manualLink: 'OTHER',
};

const availabilityMap = new Map([
  ['AVAILABLE_NOW', 'AVAILABLE_NOW'],
  ['Available now', 'AVAILABLE_NOW'],
  ['AVAILABLE_THIS_MONTH', 'AVAILABLE_THIS_MONTH'],
  ['Available this month', 'AVAILABLE_THIS_MONTH'],
  ['LIMITED', 'LIMITED'],
  ['Limited availability', 'LIMITED'],
  ['NOT_ACCEPTING', 'NOT_ACCEPTING'],
  ['Not accepting work', 'NOT_ACCEPTING'],
]);

function uniqueStrings(values) {
  return [...new Set((values || []).map((value) => value.trim()).filter(Boolean))];
}

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
  if (payload.categories !== undefined) data.categories = uniqueStrings(payload.categories);
  else if (payload.niche !== undefined) data.categories = payload.niche ? [payload.niche] : [];
  if (payload.skills !== undefined) data.skills = uniqueStrings(payload.skills);
  if (payload.languages !== undefined) data.languages = uniqueStrings(payload.languages);
  else if (payload.language !== undefined) data.languages = payload.language ? [payload.language] : [];
  if (payload.audience !== undefined) data.audienceDescription = payload.audience || null;
  if (payload.format !== undefined) data.contentFormat = payload.format || null;
  if (payload.publicRates !== undefined) data.publicRates = payload.publicRates;
  if (payload.currency !== undefined) data.currency = payload.currency;
  if (payload.availability !== undefined) {
    data.availability = availabilityMap.get(payload.availability);
    data.availableForWork = data.availability !== 'NOT_ACCEPTING';
  }
  if (payload.availableForWork !== undefined) data.availableForWork = payload.availableForWork;
  if (data.availability === 'NOT_ACCEPTING') data.availableForWork = false;
  if (payload.avatar !== undefined) data.avatarUrl = payload.avatar || null;
  if (payload.cover !== undefined) data.coverUrl = payload.cover || null;

  const rateKeys = ['postRate', 'storyRate', 'reelRate'];
  if (creating || rateKeys.some((key) => key in payload)) {
    data.rates = Object.fromEntries(
      rateKeys.map((key) => [key, parseRate(payload[key])]).filter(([, value]) => value !== undefined),
    );
  }
  if ('startingRate' in payload) data.startingRate = parseRate(payload.startingRate) ?? null;
  else if ('rate' in payload) data.startingRate = parseRate(payload.rate) ?? null;
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

function renderMediaKit(profile) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const document = new PDFDocument({ size: 'A4', margin: 48, info: { Title: `${profile.channelName} media kit` } });
    document.on('data', (chunk) => chunks.push(chunk));
    document.on('error', reject);
    document.on('end', () => resolve(Buffer.concat(chunks)));
    const followers = (profile.socialAccounts || []).reduce((sum, account) => sum + Number(account.followerCount || 0), 0);
    const engagement = (profile.socialAccounts || []).map((account) => Number(account.engagementRate || 0)).filter(Boolean);
    const averageEngagement = engagement.length ? engagement.reduce((sum, value) => sum + value, 0) / engagement.length : 0;
    document.fontSize(9).fillColor('#b44a83').text('VYRA · CREATOR MEDIA KIT');
    document.moveDown(0.7).fontSize(28).fillColor('#111111').text(profile.channelName);
    document.fontSize(11).fillColor('#666666').text(`@${profile.slug} · ${profile.location || 'Location not provided'}`);
    document.moveDown(1.5).fontSize(14).fillColor('#111111').text('Profile');
    document.fontSize(10).fillColor('#444444').text(profile.bio || 'No biography provided.', { lineGap: 3 });
    document.moveDown(1.2).fontSize(14).fillColor('#111111').text('Audience snapshot');
    document.fontSize(10).fillColor('#444444')
      .text(`Connected audience: ${followers.toLocaleString()}`)
      .text(`Average engagement: ${averageEngagement.toFixed(2)}%`)
      .text(`Categories: ${(profile.categories || []).join(', ') || 'Not provided'}`)
      .text(`Languages: ${(profile.languages || []).join(', ') || 'Not provided'}`);
    document.moveDown(1.2).fontSize(14).fillColor('#111111').text('Services and rates');
    document.fontSize(10).fillColor('#444444')
      .text(`Starting rate: ${profile.startingRate == null ? 'Contact creator' : `${profile.currency} ${Number(profile.startingRate).toLocaleString()}`}`)
      .text(`Availability: ${(profile.availability || 'Not provided').replaceAll('_', ' ')}`)
      .text(`Skills: ${(profile.skills || []).join(', ') || 'Not provided'}`);
    document.moveDown(1.2).fontSize(14).fillColor('#111111').text('Connected channels');
    if (profile.socialAccounts?.length) {
      profile.socialAccounts.forEach((account) => document.fontSize(10).fillColor('#444444').text(`${account.platform}: ${account.handle} · ${Number(account.followerCount || 0).toLocaleString()} followers`));
    } else document.fontSize(10).fillColor('#777777').text('No social channels connected.');
    document.moveDown(1.2).fontSize(14).fillColor('#111111').text('Selected work');
    const portfolio = (profile.portfolioItems || []).filter((item) => item.status === 'PUBLISHED').slice(0, 8);
    if (portfolio.length) portfolio.forEach((item, index) => document.fontSize(10).fillColor('#444444').text(`${index + 1}. ${item.title}${item.category ? ` · ${item.category}` : ''}`));
    else document.fontSize(10).fillColor('#777777').text('No published portfolio items.');
    document.moveDown(2).fontSize(8).fillColor('#888888').text(`Generated by VYRA on ${new Date().toISOString().slice(0, 10)}. Live statistics may change after generation.`);
    document.end();
  });
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
    await assertSettingEnabled('creatorApplications', 'CREATOR_APPLICATIONS_CLOSED', 'Creator applications are temporarily closed.');
    await assertFeatureEnabled('creator_onboarding', { id: userId, roles: ['VIEWER'] });
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

  async mediaKit(userId) {
    const profile = requireProfile(await creatorRepository.findByUserId(userId));
    return {
      filename: `${profile.slug}-media-kit.pdf`.replace(/[^a-z0-9_.-]/gi, '-'),
      buffer: await renderMediaKit(profile),
    };
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

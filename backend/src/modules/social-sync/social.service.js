import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';
import { hashToken } from '../../shared/utils/tokenHash.js';
import { socialProvider } from './providers/index.js';
import { toSocialAccount } from './social.mapper.js';
import { socialRepository } from './social.repository.js';
import { decryptSocialToken, encryptSocialToken } from './token-encryption.js';

const platformOf = (provider) => provider.toUpperCase();
const channelTypeOf = (channelType) => channelType?.toUpperCase() === 'BUSINESS' ? 'BUSINESS' : 'CREATOR';
const missingProfile = (channelType) => new AppError(
  `Create a ${channelType.toLowerCase()} channel before connecting social accounts.`,
  403,
  `${channelType}_PROFILE_REQUIRED`,
);
const missingAccount = () => new AppError('Social account was not found.', 404, 'SOCIAL_ACCOUNT_NOT_FOUND');

function assertProviderConfigured() {
  if (env.socialProviderMode !== 'meta') return;
  if (!env.metaAppId || !env.metaAppSecret) {
    throw new AppError('Meta social connection is not configured yet.', 503, 'SOCIAL_PROVIDER_NOT_CONFIGURED');
  }
}

function statData(stat) {
  return {
    followerCount: Math.max(0, stat.followerCount || 0),
    followingCount: stat.followingCount ?? null,
    mediaCount: stat.mediaCount ?? null,
    reach: stat.reach ?? null,
    impressions: stat.impressions ?? null,
    engagementCount: stat.engagementCount ?? null,
    engagementRate: stat.engagementRate ?? null,
    raw: stat.raw || undefined,
  };
}

function mediaData(items = []) {
  return items.filter((item) => item?.externalMediaId).slice(0, 25).map((item) => ({
    externalMediaId: String(item.externalMediaId),
    mediaType: String(item.mediaType || 'UNKNOWN').slice(0, 40),
    caption: item.caption ? String(item.caption).slice(0, 5000) : null,
    permalink: item.permalink || null,
    thumbnailUrl: item.thumbnailUrl || null,
    mediaUrl: item.mediaUrl || null,
    publishedAt: item.publishedAt || null,
    metrics: item.metrics ? {
      likeCount: item.metrics.likeCount ?? null,
      commentCount: item.metrics.commentCount ?? null,
      savedCount: item.metrics.savedCount ?? null,
      shareCount: item.metrics.shareCount ?? null,
      reach: item.metrics.reach ?? null,
      impressions: item.metrics.impressions ?? null,
      plays: item.metrics.plays ?? null,
    } : null,
  }));
}

function connectionData(profile, tokens, stats) {
  return {
    handle: profile.handle,
    profileUrl: profile.profileUrl,
    providerAccountId: profile.providerAccountId,
    providerPageId: profile.providerPageId || null,
    accessTokenEncrypted: encryptSocialToken(tokens.accessToken),
    refreshTokenEncrypted: encryptSocialToken(tokens.refreshToken),
    tokenExpiresAt: tokens.expiresAt || null,
    followerCount: Math.max(0, stats.followerCount || 0),
    engagementRate: stats.engagementRate ?? null,
    verificationStatus: 'VERIFIED',
    syncStatus: 'HEALTHY',
    syncError: null,
    lastSyncAt: new Date(),
    connectedAt: new Date(),
    metadata: profile.metadata || undefined,
  };
}

function safeCandidate(candidate) {
  return {
    providerAccountId: String(candidate.providerAccountId),
    providerPageId: candidate.providerPageId ? String(candidate.providerPageId) : null,
    handle: String(candidate.handle || candidate.displayName || candidate.providerAccountId).slice(0, 100),
    displayName: String(candidate.displayName || candidate.handle || candidate.providerAccountId).slice(0, 200),
    profileUrl: candidate.profileUrl || null,
    profileImageUrl: candidate.profileImageUrl || null,
    accountType: candidate.accountType || null,
  };
}

function manualHandle(payload) {
  if (payload.handle) return payload.handle;
  try {
    const url = new URL(payload.profileUrl);
    const path = url.pathname.split('/').filter(Boolean).pop();
    return (path || url.hostname.replace(/^www\./, '')).replace(/^@/, '').slice(0, 100);
  } catch {
    return 'manual-profile';
  }
}

function manualData(payload) {
  return {
    ...payload,
    handle: manualHandle(payload),
    followerCount: payload.followerCount || 0,
    engagementRate: payload.engagementRate ?? null,
    verificationStatus: 'UNVERIFIED',
    syncStatus: 'MANUAL',
    syncError: null,
    lastSyncAt: null,
    connectedAt: null,
    providerAccountId: null,
    providerPageId: null,
    accessTokenEncrypted: null,
    refreshTokenEncrypted: null,
    tokenExpiresAt: null,
  };
}

function translateUniqueError(error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return new AppError('A social account for this platform or handle already exists.', 409, 'SOCIAL_ACCOUNT_EXISTS');
  }
  return error;
}

function requiresReauthorization(error) {
  return error?.code === 'SOCIAL_TOKEN_DECRYPTION_FAILED'
    || error?.code === 'SOCIAL_PROVIDER_REAUTH_REQUIRED'
    || [401, 403].includes(error?.status)
    || /invalid|expired|revoked|unauthori[sz]ed.+token|token.+invalid|token.+expired/i.test(error?.message || '');
}

function ownsAccount(user, account) {
  return account?.creator?.userId === user.id || account?.business?.userId === user.id;
}

async function providerBundle(provider, platform, tokens, providerAccountId) {
  const input = { platform, accessToken: tokens.accessToken, providerAccountId };
  const [profile, stats, media] = await Promise.all([
    provider.fetchProfile(input),
    provider.fetchStats(input),
    provider.fetchMedia({ ...input, limit: 12 }),
  ]);
  return { profile, stats, media: mediaData(media) };
}

async function completeConnection(state, tokens, providerAccountId) {
  const channel = await socialRepository.findChannel(state.userId, state.channelType);
  if (!channel) throw missingProfile(state.channelType);
  const platform = state.provider;
  const provider = socialProvider();
  const bundle = await providerBundle(provider, platform, tokens, providerAccountId);
  try {
    const result = await socialRepository.completeConnection({
      stateId: state.id,
      channel,
      platform,
      account: connectionData(bundle.profile, tokens, bundle.stats),
      stat: statData(bundle.stats),
      mediaItems: bundle.media,
    });
    if (!result.account) throw new AppError('The social authorization was already consumed.', 409, 'SOCIAL_OAUTH_ALREADY_USED');
    return { account: toSocialAccount(result.account), redirectTo: state.redirectTo, idempotent: result.idempotent };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError('This social account is already connected to another channel.', 409, 'SOCIAL_ACCOUNT_ALREADY_CONNECTED');
    }
    throw error;
  }
}

async function synchronizeAccount(account) {
  const claimed = await socialRepository.claimSync(account.id);
  if (!claimed) throw new AppError('This social connection is already synchronizing.', 409, 'SOCIAL_SYNC_IN_PROGRESS');
  try {
    const provider = socialProvider();
    let accessToken = decryptSocialToken(account.accessTokenEncrypted);
    let tokenUpdate = {};
    if (account.tokenExpiresAt && account.tokenExpiresAt <= new Date(Date.now() + 5 * 60 * 1000)) {
      const refreshToken = decryptSocialToken(account.refreshTokenEncrypted) || accessToken;
      const refreshed = await provider.refreshToken({ platform: account.platform, accessToken, refreshToken });
      accessToken = refreshed.accessToken;
      tokenUpdate = {
        accessTokenEncrypted: encryptSocialToken(refreshed.accessToken),
        refreshTokenEncrypted: encryptSocialToken(refreshed.refreshToken || refreshToken),
        tokenExpiresAt: refreshed.expiresAt || null,
      };
    }
    const bundle = await providerBundle(
      provider,
      account.platform,
      { accessToken },
      account.providerAccountId,
    );
    const saved = await socialRepository.completeSync(account.id, {
      ...tokenUpdate,
      handle: bundle.profile.handle,
      profileUrl: bundle.profile.profileUrl,
      providerAccountId: bundle.profile.providerAccountId,
      providerPageId: bundle.profile.providerPageId || null,
      followerCount: Math.max(0, bundle.stats.followerCount || 0),
      engagementRate: bundle.stats.engagementRate ?? null,
      verificationStatus: 'VERIFIED',
      syncStatus: 'HEALTHY',
      syncError: null,
      lastSyncAt: new Date(),
      metadata: bundle.profile.metadata || undefined,
    }, statData(bundle.stats), bundle.media);
    return toSocialAccount(saved);
  } catch (error) {
    const status = requiresReauthorization(error) ? 'REAUTH_REQUIRED' : 'ERROR';
    await socialRepository.failSync(account.id, status, error.message || 'Social synchronization failed.').catch(() => {});
    throw error;
  }
}

export const socialService = {
  async authorize(userId, providerName, redirectTo, requestedChannelType = 'CREATOR') {
    assertProviderConfigured();
    const channelType = channelTypeOf(requestedChannelType);
    const channel = await socialRepository.findChannel(userId, channelType);
    if (!channel) throw missingProfile(channelType);
    const state = randomBytes(32).toString('base64url');
    const platform = platformOf(providerName);
    await socialRepository.cleanupOAuthStates(userId, platform);
    await socialRepository.createOAuthState({
      userId,
      provider: platform,
      channelType,
      tokenHash: hashToken(state),
      redirectTo: redirectTo || `/account?channel=${channelType.toLowerCase()}`,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    return {
      provider: providerName,
      channelType,
      authorizeUrl: socialProvider().authorizeUrl({ platform, state }),
      expiresInSeconds: 600,
    };
  },

  async callback(providerName, payload) {
    if (payload.error) {
      throw new AppError('Social authorization was cancelled or denied.', 400, 'SOCIAL_OAUTH_DENIED');
    }
    const state = await socialRepository.findOAuthState(hashToken(payload.state));
    if (!state || state.provider !== platformOf(providerName)) {
      throw new AppError('The social authorization state is invalid.', 400, 'SOCIAL_OAUTH_STATE_INVALID');
    }
    if (state.consumedAt && state.resultAccount) {
      return { account: toSocialAccount(state.resultAccount), redirectTo: state.redirectTo, idempotent: true };
    }
    if (state.expiresAt <= new Date()) {
      throw new AppError('The social authorization request expired. Start again.', 410, 'SOCIAL_OAUTH_STATE_EXPIRED');
    }
    if (state.selectionTokenHash) {
      throw new AppError('Choose one of the authorized social accounts to finish connecting.', 409, 'SOCIAL_ACCOUNT_SELECTION_PENDING');
    }
    const channel = await socialRepository.findChannel(state.userId, state.channelType);
    if (!channel) throw missingProfile(state.channelType);
    const provider = socialProvider();
    const tokens = await provider.exchangeCode({ platform: state.provider, code: payload.code });
    if (!tokens?.accessToken) throw new AppError('The social provider did not return an access token.', 502, 'SOCIAL_PROVIDER_TOKEN_MISSING');
    const candidates = (await provider.listAccounts({
      platform: state.provider,
      accessToken: tokens.accessToken,
    })).map(safeCandidate);
    if (!candidates.length) {
      throw new AppError(
        state.provider === 'INSTAGRAM'
          ? 'No Instagram professional account is available for this authorization.'
          : 'No Facebook Page is available for this authorization.',
        409,
        state.provider === 'INSTAGRAM' ? 'INSTAGRAM_PROFESSIONAL_ACCOUNT_REQUIRED' : 'FACEBOOK_PAGE_REQUIRED',
      );
    }
    if (candidates.length === 1) {
      return completeConnection(state, tokens, candidates[0].providerAccountId);
    }
    const selectionToken = randomBytes(32).toString('base64url');
    await socialRepository.savePendingSelection(state.id, {
      selectionTokenHash: hashToken(selectionToken),
      accessTokenEncrypted: encryptSocialToken(tokens.accessToken),
      refreshTokenEncrypted: encryptSocialToken(tokens.refreshToken),
      tokenExpiresAt: tokens.expiresAt || null,
      candidates,
    });
    return {
      selectionRequired: true,
      selectionToken,
      accounts: candidates,
      provider: providerName,
      redirectTo: state.redirectTo,
    };
  },

  async selectionOptions(userId, selectionToken) {
    const state = await socialRepository.findSelectionState(hashToken(selectionToken));
    if (!state || state.userId !== userId || state.consumedAt || state.expiresAt <= new Date()) {
      throw new AppError('The social account selection expired. Start again.', 410, 'SOCIAL_SELECTION_EXPIRED');
    }
    return {
      provider: state.provider.toLowerCase(),
      channelType: state.channelType,
      accounts: Array.isArray(state.candidates) ? state.candidates.map(safeCandidate) : [],
      expiresAt: state.expiresAt,
    };
  },

  async selectAccount(userId, selectionToken, externalAccountId) {
    const state = await socialRepository.findSelectionState(hashToken(selectionToken));
    if (!state || state.userId !== userId || state.consumedAt || state.expiresAt <= new Date()) {
      throw new AppError('The social account selection expired. Start again.', 410, 'SOCIAL_SELECTION_EXPIRED');
    }
    const candidates = Array.isArray(state.candidates) ? state.candidates : [];
    if (!candidates.some((item) => String(item.providerAccountId) === String(externalAccountId))) {
      throw new AppError('Choose an account returned by the social provider.', 400, 'SOCIAL_SELECTION_INVALID');
    }
    const accessToken = decryptSocialToken(state.accessTokenEncrypted);
    if (!accessToken) throw new AppError('The social authorization expired. Start again.', 410, 'SOCIAL_SELECTION_EXPIRED');
    return completeConnection(state, {
      accessToken,
      refreshToken: decryptSocialToken(state.refreshTokenEncrypted),
      expiresAt: state.tokenExpiresAt,
    }, externalAccountId);
  },

  async list(userId, requestedChannelType = 'CREATOR') {
    const channelType = channelTypeOf(requestedChannelType);
    const channel = await socialRepository.findChannel(userId, channelType);
    if (!channel) throw missingProfile(channelType);
    return (await socialRepository.list(channel)).map(toSocialAccount);
  },

  async createManual(userId, payload, requestedChannelType = 'CREATOR') {
    const channelType = channelTypeOf(requestedChannelType);
    const channel = await socialRepository.findChannel(userId, channelType);
    if (!channel) throw missingProfile(channelType);
    try {
      return toSocialAccount(await socialRepository.createManual(channel, manualData(payload)));
    } catch (error) {
      throw translateUniqueError(error);
    }
  },

  async updateManual(userId, id, payload, requestedChannelType = 'CREATOR') {
    const channelType = channelTypeOf(requestedChannelType);
    const channel = await socialRepository.findChannel(userId, channelType);
    if (!channel) throw missingProfile(channelType);
    const current = await socialRepository.findOwned(id, channel);
    if (!current) throw missingAccount();
    if (current.syncStatus !== 'MANUAL') {
      throw new AppError('OAuth connections can only be changed through their provider.', 409, 'SOCIAL_OAUTH_MANAGED');
    }
    const next = { ...payload };
    if (payload.profileUrl && !payload.handle) next.handle = manualHandle(payload);
    Object.assign(next, {
      verificationStatus: 'UNVERIFIED',
      syncStatus: 'MANUAL',
      syncError: null,
      lastSyncAt: null,
    });
    try {
      return toSocialAccount(await socialRepository.updateManual(id, channel, next));
    } catch (error) {
      throw translateUniqueError(error);
    }
  },

  async disconnect(userId, id, requestedChannelType = 'CREATOR') {
    const channelType = channelTypeOf(requestedChannelType);
    const channel = await socialRepository.findChannel(userId, channelType);
    if (!channel) throw missingProfile(channelType);
    const result = await socialRepository.deleteOwned(id, channel);
    if (result.count !== 1) throw missingAccount();
  },

  async sync(user, id) {
    const account = await socialRepository.findWithOwner(id);
    const isAdmin = user.roles.includes('ADMIN');
    if (!account || (!isAdmin && !ownsAccount(user, account))) throw missingAccount();
    if (account.syncStatus === 'MANUAL' || !account.accessTokenEncrypted) {
      throw new AppError('Manual social links cannot be synchronized.', 409, 'SOCIAL_ACCOUNT_NOT_CONNECTED');
    }
    return synchronizeAccount(account);
  },

  async syncStale({ limit = 50, now = new Date() } = {}) {
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 500);
    const cutoff = new Date(now.getTime() - env.socialSyncStaleHours * 60 * 60 * 1000);
    const accounts = await socialRepository.findStaleConnected(cutoff, safeLimit);
    const summary = { found: accounts.length, synchronized: 0, reauthRequired: 0, skipped: 0, failed: 0 };
    for (const account of accounts) {
      try {
        await synchronizeAccount(account);
        summary.synchronized += 1;
      } catch (error) {
        if (error?.code === 'SOCIAL_SYNC_IN_PROGRESS') summary.skipped += 1;
        else if (requiresReauthorization(error)) summary.reauthRequired += 1;
        else summary.failed += 1;
      }
    }
    return summary;
  },
};

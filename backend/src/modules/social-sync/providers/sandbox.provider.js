import { createHash } from 'node:crypto';
import { env } from '../../../config/env.js';
import { assertSocialProvider } from './provider.contract.js';

const stableNumber = (value, min, spread) => {
  const number = Number.parseInt(createHash('sha256').update(value).digest('hex').slice(0, 8), 16);
  return min + (number % spread);
};

export const sandboxSocialProvider = assertSocialProvider({
  authorizeUrl({ platform, state }) {
    const provider = platform.toLowerCase();
    const callback = new URL(`/api/v1/social-connections/${provider}/callback`, env.apiPublicUrl);
    // Keep sandbox identities unique per OAuth grant so multiple local creators can connect safely.
    callback.searchParams.set('code', `sandbox-${provider}-${state}`);
    callback.searchParams.set('state', state);
    return callback.toString();
  },

  async exchangeCode({ platform, code }) {
    return {
      accessToken: `sandbox-access-${platform.toLowerCase()}-${code}`,
      refreshToken: `sandbox-refresh-${platform.toLowerCase()}-${code}`,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    };
  },

  async refreshToken({ refreshToken }) {
    return {
      accessToken: `${refreshToken}-access`,
      refreshToken,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    };
  },

  async listAccounts({ platform, accessToken }) {
    const suffix = createHash('sha256').update(accessToken).digest('hex').slice(0, 10);
    const handle = `sandbox_${platform.toLowerCase()}_${suffix.slice(0, 5)}`;
    return [{
      providerAccountId: `sandbox-${platform.toLowerCase()}-${suffix}`,
      providerPageId: platform === 'FACEBOOK' ? `page-${suffix}` : null,
      handle,
      displayName: `Sandbox ${platform === 'INSTAGRAM' ? 'Instagram' : 'Facebook'}`,
      profileUrl: platform === 'INSTAGRAM'
        ? `https://instagram.com/${handle}`
        : `https://facebook.com/${handle}`,
      profileImageUrl: null,
      accountType: 'BUSINESS',
    }];
  },

  async fetchProfile({ platform, accessToken, providerAccountId }) {
    const accounts = await this.listAccounts({ platform, accessToken });
    const account = accounts.find((item) => item.providerAccountId === providerAccountId) || accounts[0];
    return {
      ...account,
      metadata: {
        provider: 'sandbox',
        accountType: account.accountType,
        displayName: account.displayName,
        profileImageUrl: account.profileImageUrl,
      },
    };
  },

  async fetchStats({ platform, accessToken }) {
    const followers = stableNumber(`${platform}:${accessToken}`, 10000, 490000);
    const engagementCount = stableNumber(`${accessToken}:engagement`, 500, 15000);
    return {
      followerCount: followers,
      followingCount: stableNumber(`${accessToken}:following`, 100, 1900),
      mediaCount: stableNumber(`${accessToken}:media`, 20, 980),
      reach: Math.round(followers * 0.72),
      impressions: Math.round(followers * 1.18),
      engagementCount,
      engagementRate: Number(((engagementCount / followers) * 100).toFixed(4)),
      raw: { source: 'sandbox', generatedAt: new Date().toISOString() },
    };
  },

  async fetchMedia({ platform, accessToken, limit = 12 }) {
    const suffix = createHash('sha256').update(`${platform}:${accessToken}`).digest('hex').slice(0, 8);
    const size = Math.min(Math.max(Number(limit) || 12, 1), 25);
    return Array.from({ length: Math.min(size, 3) }, (_, index) => ({
      externalMediaId: `sandbox-${platform.toLowerCase()}-${suffix}-${index + 1}`,
      mediaType: index === 0 ? 'VIDEO' : 'IMAGE',
      caption: `Sandbox ${platform.toLowerCase()} media ${index + 1}`,
      permalink: platform === 'INSTAGRAM'
        ? `https://instagram.com/p/${suffix}${index + 1}`
        : `https://facebook.com/${suffix}/posts/${index + 1}`,
      thumbnailUrl: null,
      mediaUrl: null,
      publishedAt: new Date(Date.now() - index * 86_400_000),
      metrics: {
        likeCount: stableNumber(`${suffix}:${index}:likes`, 100, 2000),
        commentCount: stableNumber(`${suffix}:${index}:comments`, 10, 200),
        savedCount: platform === 'INSTAGRAM' ? stableNumber(`${suffix}:${index}:saved`, 5, 100) : null,
        shareCount: stableNumber(`${suffix}:${index}:shares`, 2, 80),
        reach: null,
        impressions: null,
        plays: index === 0 ? stableNumber(`${suffix}:${index}:plays`, 1000, 10000) : null,
      },
    }));
  },
});

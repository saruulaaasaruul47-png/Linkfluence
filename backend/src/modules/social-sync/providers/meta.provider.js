import { env } from '../../../config/env.js';
import { AppError } from '../../../shared/errors/AppError.js';
import { assertSocialProvider } from './provider.contract.js';

const request = async (url, options = {}) => {
  let response;
  try {
    response = await fetch(url, { ...options, signal: AbortSignal.timeout(10_000) });
  } catch (error) {
    throw new AppError(
      error?.name === 'TimeoutError' ? 'Meta did not respond in time.' : 'Meta could not be reached.',
      503,
      'SOCIAL_PROVIDER_UNAVAILABLE',
    );
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    const providerCode = Number(data?.error?.code || 0);
    if (response.status === 401 || providerCode === 190) {
      throw new AppError('The Meta authorization expired or was revoked.', 401, 'SOCIAL_PROVIDER_REAUTH_REQUIRED');
    }
    if (response.status === 429 || providerCode === 4 || providerCode === 17 || providerCode === 32) {
      throw new AppError('Meta API rate limit was reached. Try again later.', 503, 'SOCIAL_PROVIDER_RATE_LIMITED');
    }
    throw new AppError('Meta could not complete the social connection request.', 502, 'SOCIAL_PROVIDER_ERROR');
  }
  return data;
};

const redirectUri = (platform) => {
  const configured = platform === 'INSTAGRAM'
    ? env.metaInstagramRedirectUri
    : env.metaFacebookRedirectUri;
  return configured
    || env.metaRedirectUri
    || new URL(`/api/v1/social-connections/${platform.toLowerCase()}/callback`, env.apiPublicUrl).toString();
};

const pictureUrl = (picture) => picture?.data?.url || picture?.url || null;

async function managedAccounts(platform, accessToken) {
  const url = new URL(`https://graph.facebook.com/${env.metaGraphVersion}/me/accounts`);
  url.searchParams.set('access_token', accessToken);
  url.searchParams.set(
    'fields',
    'id,name,link,followers_count,access_token,picture{url},instagram_business_account{id,username,name,biography,website,profile_picture_url,account_type,media_count,followers_count,follows_count}',
  );
  const response = await request(url);
  const pages = response.data || [];

  if (platform === 'INSTAGRAM') {
    return pages.filter((page) => page.instagram_business_account).map((page) => {
      const account = page.instagram_business_account;
      const handle = account.username || account.name || String(account.id);
      return {
        providerAccountId: String(account.id),
        providerPageId: String(page.id),
        handle,
        displayName: account.name || account.username || page.name || handle,
        profileUrl: `https://instagram.com/${handle}`,
        profileImageUrl: account.profile_picture_url || null,
        accountType: account.account_type || null,
        biography: account.biography || null,
        website: account.website || null,
        pageAccessToken: page.access_token || accessToken,
      };
    });
  }

  return pages.map((page) => ({
    providerAccountId: String(page.id),
    providerPageId: String(page.id),
    handle: page.name || String(page.id),
    displayName: page.name || String(page.id),
    profileUrl: page.link || `https://facebook.com/${page.id}`,
    profileImageUrl: pictureUrl(page.picture),
    accountType: 'PAGE',
    pageAccessToken: page.access_token || accessToken,
  }));
}

async function managedAccount(platform, accessToken, providerAccountId) {
  const accounts = await managedAccounts(platform, accessToken);
  const account = providerAccountId
    ? accounts.find((item) => item.providerAccountId === String(providerAccountId))
    : accounts[0];
  if (account) return account;
  throw new AppError(
    platform === 'INSTAGRAM'
      ? 'No Instagram professional account is connected to an authorized Facebook Page.'
      : 'No Facebook Page is available for this account.',
    409,
    platform === 'INSTAGRAM' ? 'INSTAGRAM_PROFESSIONAL_ACCOUNT_REQUIRED' : 'FACEBOOK_PAGE_REQUIRED',
  );
}

const safeCandidate = (account) => ({
  providerAccountId: account.providerAccountId,
  providerPageId: account.providerPageId,
  handle: account.handle,
  displayName: account.displayName,
  profileUrl: account.profileUrl,
  profileImageUrl: account.profileImageUrl,
  accountType: account.accountType,
});

const intOrNull = (value) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : null;

export const metaSocialProvider = assertSocialProvider({
  authorizeUrl({ platform, state }) {
    const url = new URL(`https://www.facebook.com/${env.metaGraphVersion}/dialog/oauth`);
    url.searchParams.set('client_id', env.metaAppId);
    url.searchParams.set('redirect_uri', redirectUri(platform));
    url.searchParams.set('state', state);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', platform === 'INSTAGRAM'
      ? 'instagram_basic,instagram_manage_insights,pages_show_list,pages_read_engagement'
      : 'pages_show_list,pages_read_engagement,pages_read_user_content,public_profile');
    return url.toString();
  },

  async exchangeCode({ platform, code }) {
    const url = new URL(`https://graph.facebook.com/${env.metaGraphVersion}/oauth/access_token`);
    url.searchParams.set('client_id', env.metaAppId);
    url.searchParams.set('client_secret', env.metaAppSecret);
    url.searchParams.set('redirect_uri', redirectUri(platform));
    url.searchParams.set('code', code);
    const data = await request(url);
    return {
      accessToken: data.access_token,
      refreshToken: data.access_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
    };
  },

  async refreshToken({ accessToken }) {
    const url = new URL(`https://graph.facebook.com/${env.metaGraphVersion}/oauth/access_token`);
    url.searchParams.set('grant_type', 'fb_exchange_token');
    url.searchParams.set('client_id', env.metaAppId);
    url.searchParams.set('client_secret', env.metaAppSecret);
    url.searchParams.set('fb_exchange_token', accessToken);
    const data = await request(url);
    return {
      accessToken: data.access_token,
      refreshToken: data.access_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
    };
  },

  async listAccounts({ platform, accessToken }) {
    return (await managedAccounts(platform, accessToken)).map(safeCandidate);
  },

  async fetchProfile({ platform, accessToken, providerAccountId }) {
    const account = await managedAccount(platform, accessToken, providerAccountId);
    return {
      ...safeCandidate(account),
      metadata: {
        accountType: account.accountType,
        displayName: account.displayName,
        profileImageUrl: account.profileImageUrl,
        biography: account.biography || null,
        website: account.website || null,
      },
    };
  },

  async fetchStats({ platform, accessToken, providerAccountId }) {
    const account = await managedAccount(platform, accessToken, providerAccountId);
    const url = new URL(`https://graph.facebook.com/${env.metaGraphVersion}/${account.providerAccountId}`);
    url.searchParams.set('access_token', account.pageAccessToken);
    url.searchParams.set('fields', platform === 'INSTAGRAM'
      ? 'followers_count,follows_count,media_count'
      : 'followers_count');
    const data = await request(url);
    return {
      followerCount: intOrNull(data.followers_count) || 0,
      followingCount: intOrNull(data.follows_count),
      mediaCount: intOrNull(data.media_count),
      reach: null,
      impressions: null,
      engagementCount: null,
      engagementRate: null,
      raw: { source: 'meta', account: data.id, pageId: account.providerPageId },
    };
  },

  async fetchMedia({ platform, accessToken, providerAccountId, limit = 12 }) {
    const account = await managedAccount(platform, accessToken, providerAccountId);
    const safeLimit = Math.min(Math.max(Number(limit) || 12, 1), 25);
    const resource = platform === 'INSTAGRAM' ? 'media' : 'posts';
    const url = new URL(`https://graph.facebook.com/${env.metaGraphVersion}/${account.providerAccountId}/${resource}`);
    url.searchParams.set('access_token', account.pageAccessToken);
    url.searchParams.set('limit', String(safeLimit));
    url.searchParams.set('fields', platform === 'INSTAGRAM'
      ? 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count'
      : 'id,message,created_time,permalink_url,full_picture,reactions.limit(0).summary(true),comments.limit(0).summary(true)');
    const response = await request(url);
    return (response.data || []).map((item) => ({
      externalMediaId: String(item.id),
      mediaType: platform === 'INSTAGRAM' ? (item.media_type || 'UNKNOWN') : 'POST',
      caption: item.caption || item.message || null,
      permalink: item.permalink || item.permalink_url || null,
      thumbnailUrl: item.thumbnail_url || item.full_picture || null,
      mediaUrl: item.media_url || item.full_picture || null,
      publishedAt: item.timestamp || item.created_time ? new Date(item.timestamp || item.created_time) : null,
      metrics: {
        likeCount: intOrNull(item.like_count ?? item.reactions?.summary?.total_count),
        commentCount: intOrNull(item.comments_count ?? item.comments?.summary?.total_count),
        savedCount: null,
        shareCount: null,
        reach: null,
        impressions: null,
        plays: null,
      },
    }));
  },
});

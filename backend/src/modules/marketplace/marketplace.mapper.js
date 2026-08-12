import { verifiedPayerTruth } from '../payments/payer-trust.js';
import { toSocialAccount } from '../social-sync/social.mapper.js';

const decimal = (value) => value == null ? null : Number(value);

const portfolio = (item) => ({
  id: item.id,
  title: item.title,
  description: item.description || '',
  category: item.category || '',
  mediaType: item.mediaType,
  mediaUrl: item.mediaUrl,
  thumbnailUrl: item.thumbnailUrl || '',
  verified: item.verified,
  publishedAt: item.publishedAt,
});

export function toPublicCreator(profile) {
  const followerCount = profile.socialAccounts.reduce(
    (total, account) => total + account.followerCount,
    0,
  );
  const engagementValues = profile.socialAccounts
    .map((account) => decimal(account.engagementRate))
    .filter((value) => value !== null);
  const engagementRate = engagementValues.length
    ? engagementValues.reduce((sum, value) => sum + value, 0) / engagementValues.length
    : null;
  const rates = profile.publicRates && profile.rates && typeof profile.rates === 'object'
    ? profile.rates
    : null;
  return {
    id: profile.id,
    slug: profile.slug,
    username: `@${profile.slug}`,
    name: profile.channelName,
    channelName: profile.channelName,
    bio: profile.bio || '',
    location: profile.location || '',
    categories: profile.categories,
    niche: profile.categories[0] || '',
    skills: profile.skills,
    languages: profile.languages,
    audience: profile.audienceDescription || '',
    format: profile.contentFormat || '',
    avatar: profile.avatarUrl || profile.user?.avatarUrl || '',
    avatarUrl: profile.avatarUrl || profile.user?.avatarUrl || '',
    cover: profile.coverUrl || '',
    coverUrl: profile.coverUrl || '',
    availability: profile.availability || '',
    availableForWork: profile.availableForWork,
    verified: profile.verificationStatus === 'VERIFIED',
    verificationStatus: profile.verificationStatus,
    followerCount,
    engagementRate,
    rating: decimal(profile.ratingAverage),
    ratingCount: profile.ratingCount,
    publicRates: profile.publicRates,
    startingRate: profile.publicRates ? decimal(profile.startingRate) : null,
    rates,
    currency: profile.currency,
    socialAccounts: profile.socialAccounts.map((account) => {
      const safe = toSocialAccount(account);
      return {
        platform: safe.platform,
        handle: safe.handle,
        profileUrl: safe.profileUrl,
        followerCount: safe.followerCount,
        engagementRate: safe.engagementRate,
        verified: safe.verified,
        verificationStatus: safe.verificationStatus,
        syncStatus: safe.syncStatus,
        syncError: safe.syncError,
        isStale: safe.isStale,
        lastSyncAt: safe.lastSyncAt,
        staleAt: safe.staleAt,
        latestStats: safe.latestStats,
        connectionType: safe.connectionType,
      };
    }),
    portfolio: profile.portfolioItems?.map(portfolio) || [],
    createdAt: profile.createdAt,
  };
}

export function toPublicBusiness(profile) {
  const payerTrust = verifiedPayerTruth(profile.collaborations);
  const socialAccounts = (profile.socialAccounts || []).map(toSocialAccount);
  const followerCount = socialAccounts.reduce((sum, account) => sum + Number(account.followerCount || 0), 0);
  const engagement = socialAccounts.map((account) => account.engagementRate).filter((value) => value != null);
  return {
    id: profile.id,
    slug: profile.slug,
    username: `@${profile.slug}`,
    name: profile.companyName,
    organization: profile.companyName,
    description: profile.description || '',
    industry: profile.industry || '',
    location: profile.location || '',
    website: profile.website || '',
    companySize: profile.companySize || '',
    logo: profile.logoUrl || '',
    logoUrl: profile.logoUrl || '',
    cover: profile.coverUrl || '',
    coverUrl: profile.coverUrl || '',
    verified: profile.verificationStatus === 'VERIFIED',
    verificationStatus: profile.verificationStatus,
    followerCount,
    engagementRate: engagement.length ? engagement.reduce((sum, value) => sum + value, 0) / engagement.length : null,
    socialAccounts: socialAccounts.map((account) => ({
      platform: account.platform,
      handle: account.handle,
      profileUrl: account.profileUrl,
      followerCount: account.followerCount,
      engagementRate: account.engagementRate,
      verified: account.verified,
      syncStatus: account.syncStatus,
      lastSyncAt: account.lastSyncAt,
    })),
    ...payerTrust,
    rating: decimal(profile.ratingAverage),
    ratingCount: profile.ratingCount,
    campaignCount: profile._count?.campaigns || 0,
    completedCollaborationCount: profile._count?.collaborations || 0,
    campaigns: profile.campaigns?.map((campaign) => ({
      ...campaign,
      budgetMin: decimal(campaign.budgetMin),
      budgetMax: decimal(campaign.budgetMax),
    })) || [],
    createdAt: profile.createdAt,
  };
}

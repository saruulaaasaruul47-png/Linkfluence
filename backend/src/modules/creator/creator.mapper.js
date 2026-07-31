const valueOf = (value) => value == null ? '' : String(value);

function socialUrl(accounts, platform) {
  return accounts?.find((account) => account.platform === platform)?.profileUrl || '';
}

const toPortfolioItem = (item) => ({
  id: item.id,
  title: item.title,
  description: item.description || '',
  category: item.category || '',
  mediaType: item.mediaType,
  mediaUrl: item.mediaUrl,
  thumbnailUrl: item.thumbnailUrl || '',
  status: item.status,
  sortOrder: item.sortOrder,
  publishedAt: item.publishedAt,
  createdAt: item.createdAt,
});

export function toCreatorProfile(profile) {
  const rates = profile.rates && typeof profile.rates === 'object' ? profile.rates : {};
  const metadata = profile.metadata && typeof profile.metadata === 'object' ? profile.metadata : {};

  return {
    id: profile.id,
    userId: profile.userId,
    channelName: profile.channelName,
    name: profile.channelName,
    slug: profile.slug,
    username: `@${profile.slug}`,
    bio: profile.bio || '',
    niche: profile.categories?.[0] || '',
    categories: profile.categories || [],
    skills: profile.skills || [],
    audience: profile.audienceDescription || '',
    format: profile.contentFormat || '',
    location: profile.location || '',
    language: profile.languages?.[0] || '',
    languages: profile.languages || [],
    instagram: socialUrl(profile.socialAccounts, 'INSTAGRAM'),
    facebook: socialUrl(profile.socialAccounts, 'FACEBOOK'),
    tiktok: socialUrl(profile.socialAccounts, 'TIKTOK'),
    manualLink: socialUrl(profile.socialAccounts, 'OTHER'),
    postRate: valueOf(rates.postRate),
    storyRate: valueOf(rates.storyRate),
    reelRate: valueOf(rates.reelRate),
    rate: valueOf(profile.startingRate),
    publicRates: profile.publicRates,
    availability: profile.availability || '',
    avatar: profile.avatarUrl || profile.user?.avatarUrl || '',
    avatarUrl: profile.avatarUrl || profile.user?.avatarUrl || '',
    cover: profile.coverUrl || '',
    coverUrl: profile.coverUrl || '',
    workTitle: metadata.workTitle || '',
    workCategory: metadata.workCategory || '',
    workDescription: metadata.workDescription || '',
    portfolio: profile.portfolioItems?.map(toPortfolioItem) || [],
    verificationStatus: profile.verificationStatus,
    availableForWork: profile.availableForWork,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

export function toBusinessProfile(profile) {
  const preferences = profile.preferences && typeof profile.preferences === 'object'
    ? profile.preferences
    : {};

  return {
    id: profile.id,
    userId: profile.userId,
    organization: profile.companyName,
    name: profile.companyName,
    slug: profile.slug,
    username: `@${profile.slug}`,
    description: profile.description || '',
    industry: profile.industry || '',
    website: profile.website || '',
    companySize: profile.companySize || '',
    contactEmail: profile.contactEmail || '',
    location: profile.location || '',
    targetNiche: preferences.targetNiche || '',
    campaignGoal: preferences.campaignGoal || '',
    monthlyBudget: preferences.monthlyBudget || '',
    logo: profile.logoUrl || '',
    logoUrl: profile.logoUrl || '',
    cover: profile.coverUrl || '',
    coverUrl: profile.coverUrl || '',
    verificationStatus: profile.verificationStatus,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

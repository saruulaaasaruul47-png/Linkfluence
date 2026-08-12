const decimal = (value) => value == null ? null : Number(value);

export function toSourcedCreator(entry) {
  const followers = entry.creator.socialAccounts
    .reduce((sum, account) => sum + account.followerCount, 0);
  const engagements = entry.creator.socialAccounts
    .map((account) => decimal(account.engagementRate))
    .filter((value) => value !== null);
  const verifiedSnapshots = entry.creator.socialAccounts
    .filter((account) => account.verificationStatus === 'VERIFIED' && account.stats?.[0]?.capturedAt)
    .map((account) => account.stats[0].capturedAt)
    .sort((left, right) => new Date(right) - new Date(left));
  return {
    id: entry.id,
    creatorId: entry.creator.id,
    campaignId: entry.campaignId,
    contextKey: entry.contextKey,
    note: entry.note || '',
    createdAt: entry.createdAt,
    creator: {
      id: entry.creator.id,
      slug: entry.creator.slug,
      name: entry.creator.channelName,
      avatar: entry.creator.avatarUrl || '',
      niche: entry.creator.categories[0] || '',
      location: entry.creator.location || '',
      followers,
      engagementRate: engagements.length
        ? engagements.reduce((sum, value) => sum + value, 0) / engagements.length
        : null,
      rating: decimal(entry.creator.ratingAverage),
      startingRate: decimal(entry.creator.startingRate),
      verified: entry.creator.verificationStatus === 'VERIFIED',
      statisticsVerified: verifiedSnapshots.length > 0,
      statisticsCapturedAt: verifiedSnapshots[0] || null,
      statisticsSource: verifiedSnapshots.length ? 'OAUTH' : 'MANUAL_OR_UNAVAILABLE',
      platforms: entry.creator.socialAccounts.map((account) => account.platform),
    },
    campaign: entry.campaign || null,
  };
}

export function toInvitation(invitation) {
  return {
    id: invitation.id,
    message: invitation.message || '',
    status: invitation.status,
    respondedAt: invitation.respondedAt,
    createdAt: invitation.createdAt,
    updatedAt: invitation.updatedAt,
    creator: {
      id: invitation.creator.id,
      slug: invitation.creator.slug,
      name: invitation.creator.channelName,
      avatar: invitation.creator.avatarUrl || '',
      verified: invitation.creator.verificationStatus === 'VERIFIED',
    },
    business: {
      id: invitation.business.id,
      slug: invitation.business.slug,
      name: invitation.business.companyName,
      logo: invitation.business.logoUrl || '',
      verified: invitation.business.verificationStatus === 'VERIFIED',
    },
    campaign: {
      ...invitation.campaign,
      budgetMin: decimal(invitation.campaign.budgetMin),
      budgetMax: decimal(invitation.campaign.budgetMax),
    },
  };
}

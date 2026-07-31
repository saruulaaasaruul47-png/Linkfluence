const decimal = (value) => value == null ? null : Number(value);

export function toProposal(proposal) {
  return {
    id: proposal.id,
    campaignId: proposal.campaignId,
    creatorId: proposal.creatorId,
    amount: decimal(proposal.amount),
    currency: proposal.currency,
    timeline: proposal.timeline || '',
    message: proposal.message || '',
    approach: proposal.message || '',
    deliverables: proposal.deliverables,
    counterAmount: decimal(proposal.counterAmount),
    counterMessage: proposal.counterMessage || '',
    status: proposal.status,
    version: proposal.version,
    submittedAt: proposal.submittedAt,
    updatedAt: proposal.updatedAt,
    creator: {
      id: proposal.creator.id,
      slug: proposal.creator.slug,
      name: proposal.creator.channelName,
      avatar: proposal.creator.avatarUrl || '',
      verified: proposal.creator.verificationStatus === 'VERIFIED',
      rating: decimal(proposal.creator.ratingAverage),
    },
    campaign: {
      id: proposal.campaign.id,
      slug: proposal.campaign.slug,
      title: proposal.campaign.title,
      status: proposal.campaign.status,
      applicationDeadline: proposal.campaign.applicationDeadline,
      business: {
        id: proposal.campaign.business.id,
        slug: proposal.campaign.business.slug,
        name: proposal.campaign.business.companyName,
        logo: proposal.campaign.business.logoUrl || '',
        verified: proposal.campaign.business.verificationStatus === 'VERIFIED',
      },
    },
  };
}

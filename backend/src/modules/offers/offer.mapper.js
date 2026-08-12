const statusMap = {
  INTERESTED: 'AWAITING_BUSINESS_APPROVAL',
  CHANGES_REQUESTED: 'BUSINESS_CHANGES_REQUESTED',
};

const decimal = (value) => value === null || value === undefined ? null : Number(value);

export function toOffer(offer) {
  const counter = offer.counterTerms || {};
  const final = offer.finalTerms || {};
  return {
    id: offer.id,
    version: offer.version,
    title: offer.title,
    contentType: offer.contentType,
    budget: decimal(offer.budget),
    paymentType: offer.paymentType,
    barterDetails: offer.barterDetails,
    currency: offer.currency,
    timeline: offer.timeline,
    message: offer.message,
    status: statusMap[offer.status] || offer.status,
    creatorResponse: counter.creatorResponse || null,
    businessResponse: final.businessResponse || null,
    finalBudget: final.finalBudget ?? null,
    finalTimeline: final.finalTimeline ?? null,
    workspaceId: offer.collaboration?.id || null,
    business: offer.business ? {
      id: offer.business.id,
      name: offer.business.companyName,
      slug: offer.business.slug,
      avatar: offer.business.logoUrl,
    } : null,
    creator: offer.creator ? {
      id: offer.creator.id,
      name: offer.creator.channelName,
      slug: offer.creator.slug,
      avatar: offer.creator.avatarUrl,
    } : null,
    campaign: offer.campaign ? {
      id: offer.campaign.id,
      title: offer.campaign.title,
      slug: offer.campaign.slug,
    } : null,
    respondedAt: offer.respondedAt,
    createdAt: offer.createdAt,
    updatedAt: offer.updatedAt,
  };
}

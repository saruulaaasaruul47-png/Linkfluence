const numeric = (value) => value === null || value === undefined || value === '' ? null : Number(value);

export function toContract(contract, actor = null) {
  const current = contract.versions.find((version) => version.version === contract.currentVersion)
    || contract.versions[0]
    || null;
  const terms = current?.terms || contract.collaboration.terms || {};
  const payments = contract.collaboration.payments || [];
  const funding = payments.find((payment) => ['FUNDING', 'BARTER_PLATFORM_FEE'].includes(payment.type)) || null;
  const release = payments.find((payment) => payment.type === 'MILESTONE_RELEASE') || null;
  const amount = numeric(funding?.amount ?? terms.finalBudget ?? terms.budget ?? terms.amount);
  const actorRole = actor?.roles?.includes('ADMIN')
    ? 'admin'
    : actor?.id === contract.collaboration.business.userId
      ? 'business'
      : actor?.id === contract.collaboration.creator.userId
        ? 'creator'
        : null;

  return {
    id: contract.id,
    collaborationId: contract.collaborationId,
    title: contract.collaboration.campaign?.title || contract.collaboration.offer?.title || 'Direct collaboration',
    status: contract.status,
    actorRole,
    currentVersion: contract.currentVersion,
    amount,
    currency: funding?.currency || terms.currency || 'MNT',
    deadline: contract.publishBy || terms.finalDeadline || terms.deadline || null,
    creatorSignedAt: contract.creatorSignedAt,
    businessSignedAt: contract.businessSignedAt,
    activatedAt: contract.activatedAt,
    revisionLimit: contract.revisionLimit,
    publishBy: contract.publishBy,
    retentionDays: contract.retentionDays,
    disputeWindowDays: contract.disputeWindowDays,
    disclosureRequired: contract.disclosureRequired,
    createdAt: contract.createdAt,
    updatedAt: contract.updatedAt,
    campaign: contract.collaboration.campaign,
    business: {
      id: contract.collaboration.business.id,
      name: contract.collaboration.business.companyName,
      slug: contract.collaboration.business.slug,
      avatarUrl: contract.collaboration.business.logoUrl || '',
    },
    creator: {
      id: contract.collaboration.creator.id,
      name: contract.collaboration.creator.channelName,
      slug: contract.collaboration.creator.slug,
      avatarUrl: contract.collaboration.creator.avatarUrl || '',
    },
    terms,
    approvals: {
      creator: Boolean(current?.creatorApprovedAt || contract.creatorSignedAt),
      business: Boolean(current?.businessApprovedAt || contract.businessSignedAt),
    },
    payment: {
      id: funding?.id || release?.id || null,
      status: release?.status === 'RELEASED' || funding?.status === 'RELEASED' ? 'RELEASED' : funding?.status || 'NOT_STARTED',
      amount,
      currency: funding?.currency || terms.currency || 'MNT',
      processedAt: release?.processedAt || funding?.processedAt || null,
    },
    versions: contract.versions.map((version) => ({
      version: version.version,
      terms: version.terms,
      documentUrl: version.documentUrl,
      changeNote: version.changeNote,
      approvals: {
        creator: Boolean(version.creatorApprovedAt),
        business: Boolean(version.businessApprovedAt),
      },
      createdAt: version.createdAt,
    })),
  };
}

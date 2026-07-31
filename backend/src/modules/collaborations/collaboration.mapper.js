const amount = (value) => value === null || value === undefined ? null : Number(value);

function roleReview(review, collaboration) {
  return review.reviewerId === collaboration.creator.userId ? 'creator' : 'business';
}

export function toCollaboration(item) {
  const agreement = item.agreementVersions?.[0] || null;
  const contract = item.contract || null;
  const contractVersion = contract?.versions?.[0] || null;
  const funding = item.payments?.find((payment) => payment.type === 'FUNDING') || null;
  const release = item.payments?.find((payment) => payment.type === 'MILESTONE_RELEASE') || null;
  const reviews = Object.fromEntries((item.reviews || []).map((review) => [
    roleReview(review, item),
    { id: review.id, rating: review.rating, comment: review.comment, createdAt: review.createdAt },
  ]));
  return {
    id: item.id,
    offerId: item.offerId,
    version: item.version,
    termsVersion: item.termsVersion,
    status: item.status,
    progress: item.progress,
    terms: item.terms,
    campaign: item.campaign ? { id: item.campaign.id, title: item.campaign.title, slug: item.campaign.slug } : null,
    business: { id: item.business.id, name: item.business.companyName, slug: item.business.slug, avatar: item.business.logoUrl },
    creator: { id: item.creator.id, name: item.creator.channelName, slug: item.creator.slug, avatar: item.creator.avatarUrl },
    agreement: {
      version: agreement?.version || item.termsVersion,
      locked: Boolean(agreement?.lockedAt),
      lockedAt: agreement?.lockedAt || null,
      approvals: {
        creator: Boolean(agreement?.creatorApprovedAt),
        business: Boolean(agreement?.businessApprovedAt),
      },
      changeRequests: (item.agreementVersions || [])
        .filter((version) => version.changeNote)
        .map((version) => ({ version: version.version, note: version.changeNote, createdAt: version.createdAt })),
    },
    contract: {
      id: contract?.id || null,
      generated: Boolean(contractVersion),
      status: contract?.status || 'DRAFT',
      version: contract?.currentVersion || 0,
      versions: (contract?.versions || []).map((version) => ({
        version: version.version,
        terms: version.terms,
        documentUrl: version.documentUrl,
        createdAt: version.createdAt,
      })),
      approvals: {
        creator: Boolean(contractVersion?.creatorApprovedAt),
        business: Boolean(contractVersion?.businessApprovedAt),
      },
      audit: [],
    },
    payment: {
      id: funding?.id || null,
      status: release?.status === 'RELEASED' ? 'RELEASED' : funding?.status || (contract?.status === 'ACTIVE' ? 'AWAITING_PAYMENT' : 'LOCKED'),
      amount: amount(funding?.amount ?? item.terms?.budget),
      currency: funding?.currency || item.terms?.currency || 'MNT',
      fundedAt: funding?.status === 'FUNDED' ? funding.processedAt : null,
    },
    tasks: (item.workspaceTasks || []).map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      owner: task.ownerRole,
      due: task.dueAt,
      done: Boolean(task.completedAt),
    })),
    files: (item.workspaceFiles || []).map((file) => ({
      id: file.id,
      name: file.name,
      url: file.url,
      type: file.mimeType,
      size: file.sizeBytes,
      addedBy: file.uploadedById === item.creator.userId ? 'creator' : 'business',
      createdAt: file.createdAt,
    })),
    activity: (item.activities || []).map((event) => ({
      id: event.id,
      text: event.message,
      actor: event.type,
      metadata: event.metadata,
      createdAt: event.createdAt,
    })),
    deliverables: (item.deliverables || []).map((entry) => ({
      id: entry.id,
      name: entry.title,
      note: entry.note,
      url: entry.fileUrl,
      type: entry.fileType,
      version: entry.version,
      status: entry.status === 'SUBMITTED' ? 'AWAITING_REVIEW' : entry.status,
      reviewNote: entry.reviewNote,
      reviewedAt: entry.reviewedAt,
      createdAt: entry.createdAt,
    })),
    reviews,
    showcasePublished: Boolean(item.showcasePost),
    completedAt: item.completedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

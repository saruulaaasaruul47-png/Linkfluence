const amount = (value) => value === null || value === undefined ? null : Number(value);

function roleReview(review, collaboration) {
  return review.reviewerId === collaboration.creator.userId ? 'creator' : 'business';
}

export function toCollaboration(item, { viewerId = null } = {}) {
  const agreement = item.agreementVersions?.[0] || null;
  const contract = item.contract || null;
  const contractVersion = contract?.versions?.[0] || null;
  const funding = item.payments?.find((payment) => ['FUNDING', 'BARTER_PLATFORM_FEE'].includes(payment.type)) || null;
  const release = item.payments?.find((payment) => payment.type === 'MILESTONE_RELEASE') || null;
  // A review stays hidden from the other party until both sides have reviewed (FR-7.2
  // simultaneous reveal) — you can always see your own review, just not the counterpart's early.
  const reviews = Object.fromEntries((item.reviews || []).map((review) => {
    const revealed = Boolean(review.publishedAt);
    const visible = revealed || review.reviewerId === viewerId;
    return [
      roleReview(review, item),
      {
        id: review.id,
        rating: visible ? review.rating : null,
        comment: visible ? review.comment : null,
        revealed,
        createdAt: review.createdAt,
      },
    ];
  }));
  const myConsent = (item.showcaseConsents || []).find((entry) => entry.userId === viewerId)?.decision || 'PENDING';
  const counterpartConsent = (item.showcaseConsents || []).find((entry) => entry.userId !== viewerId)?.decision || 'PENDING';
  return {
    id: item.id,
    offerId: item.offerId,
    version: item.version,
    termsVersion: item.termsVersion,
    status: item.status,
    progress: item.progress,
    terms: item.terms,
    paymentType: item.paymentType || item.terms?.paymentType || 'PAID',
    cashAmount: amount(item.cashAmount ?? item.terms?.cashAmount ?? item.terms?.budget),
    barterEstimatedValue: amount(item.barterEstimatedValue ?? item.terms?.barterEstimatedValue),
    barterDetails: item.barterDetails || item.terms?.barterDetails || null,
    campaign: item.campaign ? { id: item.campaign.id, title: item.campaign.title, slug: item.campaign.slug } : null,
    business: { id: item.business.id, userId: item.business.userId, name: item.business.companyName, slug: item.business.slug, avatar: item.business.logoUrl },
    creator: { id: item.creator.id, userId: item.creator.userId, name: item.creator.channelName, slug: item.creator.slug, avatar: item.creator.avatarUrl },
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
      revisionLimit: contract?.revisionLimit ?? 2,
      publishBy: contract?.publishBy || null,
      retentionDays: contract?.retentionDays ?? 30,
      disputeWindowDays: contract?.disputeWindowDays ?? 7,
      disclosureRequired: contract?.disclosureRequired ?? true,
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
      status: release?.status === 'RELEASED' || funding?.status === 'RELEASED' ? 'RELEASED' : funding?.status || (contract?.status === 'ACTIVE' ? 'AWAITING_PAYMENT' : 'LOCKED'),
      amount: amount(funding?.amount ?? item.terms?.budget),
      currency: funding?.currency || item.terms?.currency || 'MNT',
      fundedAt: funding?.fundedAt || (['FUNDED', 'RELEASED'].includes(funding?.status) ? funding.processedAt : null),
      intent: funding && ['PENDING', 'PROCESSING'].includes(funding.status) ? {
        provider: funding.provider,
        checkoutUrl: funding.metadata?.checkoutUrl || null,
        qrText: funding.metadata?.qrText || null,
        qrImage: funding.metadata?.qrImage || null,
        deeplinks: funding.metadata?.deeplinks || [],
        expiresAt: funding.metadata?.expiresAt || null,
      } : null,
    },
    tasks: (item.workspaceTasks || []).map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      owner: task.ownerRole,
      status: task.status,
      priority: task.priority,
      assigneeId: task.assigneeId,
      assignee: task.assignee ? { id: task.assignee.id, name: task.assignee.displayName, avatar: task.assignee.avatarUrl } : null,
      dueAt: task.dueAt,
      due: task.dueAt,
      done: task.status === 'DONE',
      sortOrder: task.sortOrder,
      version: task.version,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
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
      revisionOfId: entry.revisionOfId,
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
    publishProofs: (item.publishProofs || []).map((proof) => ({
      id: proof.id,
      deliverableId: proof.deliverableId,
      postUrl: proof.postUrl,
      platform: proof.platform,
      status: proof.status,
      metrics: proof.metrics,
      publishedAt: proof.publishedAt,
      createdAt: proof.createdAt,
    })),
    reviews,
    showcasePublished: Boolean(item.showcasePost),
    showcaseConsent: {
      mine: myConsent,
      counterpart: counterpartConsent,
    },
    completedAt: item.completedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

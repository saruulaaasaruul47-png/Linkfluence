export const toDeliverable = (entry) => ({
  id: entry.id,
  collaborationId: entry.collaborationId,
  revisionOfId: entry.revisionOfId,
  title: entry.title,
  note: entry.note,
  fileUrl: entry.fileUrl,
  fileType: entry.fileType,
  version: entry.version,
  status: entry.status === 'SUBMITTED' ? 'AWAITING_REVIEW' : entry.status,
  reviewNote: entry.reviewNote,
  reviewedAt: entry.reviewedAt,
  createdAt: entry.createdAt,
});

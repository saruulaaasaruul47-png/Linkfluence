export const toPortfolio = (item, { publicView = false } = {}) => ({
  id: item.id,
  title: item.title,
  description: item.description || '',
  category: item.category || '',
  mediaType: item.mediaType,
  mediaUrl: item.mediaUrl,
  thumbnailUrl: item.thumbnailUrl || '',
  status: item.status,
  verified: item.verified,
  collaborationId: item.collaborationId,
  sortOrder: item.sortOrder,
  publishedAt: item.publishedAt,
  createdAt: item.createdAt,
  ...(publicView && item.creator ? {
    creator: {
      id: item.creator.id,
      slug: item.creator.slug,
      name: item.creator.channelName,
      avatarUrl: item.creator.avatarUrl || '',
    },
  } : {}),
});

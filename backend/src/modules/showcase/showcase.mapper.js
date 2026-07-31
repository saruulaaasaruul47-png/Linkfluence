export function toShowcase(post, liked = false) {
  return {
    id: post.id,
    title: post.title,
    description: post.description || '',
    category: post.category || '',
    mediaType: post.mediaType,
    image: post.thumbnailUrl || post.mediaUrl,
    mediaUrl: post.mediaUrl,
    thumbnailUrl: post.thumbnailUrl || '',
    status: post.status,
    publishedAt: post.publishedAt,
    reactionCount: post._count?.reactions || 0,
    liked,
    creator: {
      id: post.creator.id,
      slug: post.creator.slug,
      name: post.creator.channelName,
      avatar: post.creator.avatarUrl || '',
      verified: post.creator.verificationStatus === 'VERIFIED',
    },
    ownerKey: `creator:${post.creator.id}`,
    saveKey: `showcase:${post.id}`,
    route: `/showcase/${post.id}`,
  };
}

const publicMediaUrl = (asset) => {
  if (!asset) return '';
  if (/^(https?:|data:)/i.test(asset.url || '')) return asset.url;
  return `/api/v1/media/assets/${asset.id}/content`;
};

export function toContentPost(post, viewer = {}) {
  const expiresAt = post.expiresAt ? new Date(post.expiresAt) : null;
  const expiresInSeconds = expiresAt ? Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)) : null;
  const creator = post.creator;
  const business = post.business;
  const author = creator
    ? {
        type: 'CREATOR', id: creator.id, slug: creator.slug, name: creator.channelName,
        avatarUrl: creator.avatarUrl || '', coverUrl: creator.coverUrl || '',
        verified: creator.verificationStatus === 'VERIFIED',
      }
    : {
        type: 'BUSINESS', id: business.id, slug: business.slug, name: business.companyName,
        avatarUrl: business.logoUrl || '', coverUrl: business.coverUrl || '',
        verified: business.verificationStatus === 'VERIFIED',
      };
  const media = (post.media || []).map((item) => ({
    id: item.id,
    assetId: item.mediaAssetId,
    mediaType: item.mediaType,
    url: publicMediaUrl(item.mediaAsset),
    thumbnailUrl: publicMediaUrl(item.thumbnail),
    altText: item.altText || '',
    width: item.width,
    height: item.height,
    durationMs: item.durationMs,
  }));
  const ownerKey = `${author.type.toLowerCase()}:${author.id}`;
  const audio = post.audioAsset && !post.audioAsset.deletedAt ? {
    assetId: post.audioAsset.id,
    url: publicMediaUrl(post.audioAsset),
    title: post.audioTitle || 'Story audio',
    artist: post.audioArtist || '',
    startMs: post.audioStartMs || 0,
    volume: post.audioVolume === null || post.audioVolume === undefined ? 0.7 : Number(post.audioVolume),
    rightsConfirmed: Boolean(post.audioRightsConfirmedAt),
  } : null;
  return {
    id: post.id,
    type: post.postType,
    title: post.title || '',
    caption: post.caption,
    storyStyle: post.storyStyle || null,
    storyAudio: audio,
    category: post.category || '',
    visibility: post.visibility,
    status: post.status,
    paidPartnership: post.paidPartnership,
    partnerCreatorId: post.partnerCreatorId,
    partnerBusinessId: post.partnerBusinessId,
    author: { ...author, following: viewer.followingKeys?.has(ownerKey) || false },
    media,
    campaign: post.campaign ? { id: post.campaign.id, slug: post.campaign.slug, title: post.campaign.title } : null,
    liked: viewer.likedIds?.has(post.id) || false,
    saved: viewer.savedIds?.has(post.id) || false,
    likeCount: post._count?.reactions || 0,
    ownerKey,
    saveKey: `content:${post.id}`,
    route: `/posts/${post.id}`,
    publishedAt: post.publishedAt,
    expiresAt: post.expiresAt,
    expiresInSeconds,
    expired: expiresAt ? expiresInSeconds === 0 : false,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

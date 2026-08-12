export function isContentVisibleTo(post, audience = 'PUBLIC') {
  if (!post || post.status === 'REMOVED') return false
  if (audience === 'OWNER') return true
  if (post.status !== 'PUBLISHED' || post.expired) return false
  if (audience === 'FOLLOWER') return true
  return post.visibility === 'PUBLIC'
}

export function mergeChannelContent(...collections) {
  return [...new Map(collections.flat().filter(Boolean).map((item) => [item.id, item])).values()]
}

export function channelVisibilityCounts(posts = []) {
  return {
    public: posts.filter((post) => post.status === 'PUBLISHED' && !post.expired && post.visibility === 'PUBLIC').length,
    followers: posts.filter((post) => post.status === 'PUBLISHED' && !post.expired && post.visibility === 'FOLLOWERS').length,
    drafts: posts.filter((post) => post.status === 'DRAFT').length,
    stories: posts.filter((post) => post.type === 'STORY' && post.status === 'PUBLISHED' && !post.expired).length,
  }
}

import { describe, expect, it } from 'vitest'
import { channelVisibilityCounts, isContentVisibleTo, mergeChannelContent } from '../src/lib/channelShowcase'

const post = (change = {}) => ({ id: 'post-1', status: 'PUBLISHED', visibility: 'PUBLIC', type: 'ORIGINAL', expired: false, ...change })

describe('Showcase Studio channel visibility', () => {
  it('keeps drafts and follower content out of the public preview', () => {
    expect(isContentVisibleTo(post(), 'PUBLIC')).toBe(true)
    expect(isContentVisibleTo(post({ visibility: 'FOLLOWERS' }), 'PUBLIC')).toBe(false)
    expect(isContentVisibleTo(post({ status: 'DRAFT' }), 'PUBLIC')).toBe(false)
    expect(isContentVisibleTo(post({ expired: true, type: 'STORY' }), 'PUBLIC')).toBe(false)
  })

  it('shows follower content to followers while keeping drafts private', () => {
    expect(isContentVisibleTo(post({ visibility: 'FOLLOWERS' }), 'FOLLOWER')).toBe(true)
    expect(isContentVisibleTo(post({ status: 'DRAFT' }), 'FOLLOWER')).toBe(false)
  })

  it('shows all non-removed channel content to its owner', () => {
    expect(isContentVisibleTo(post({ status: 'DRAFT' }), 'OWNER')).toBe(true)
    expect(isContentVisibleTo(post({ status: 'ARCHIVED' }), 'OWNER')).toBe(true)
    expect(isContentVisibleTo(post({ status: 'REMOVED' }), 'OWNER')).toBe(false)
  })

  it('deduplicates content and calculates studio counters', () => {
    const publicPost = post()
    const followerPost = post({ id: 'post-2', visibility: 'FOLLOWERS' })
    const story = post({ id: 'story-1', type: 'STORY' })
    const draft = post({ id: 'draft-1', status: 'DRAFT' })
    const merged = mergeChannelContent([publicPost, followerPost], [story, publicPost, draft])

    expect(merged).toHaveLength(4)
    expect(channelVisibilityCounts(merged)).toEqual({ public: 2, followers: 1, drafts: 1, stories: 1 })
  })
})

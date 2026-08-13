import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Bookmark,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Film,
  Heart,
  Images,
  RefreshCw,
  Search,
  Sparkles,
  Users,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { contentApi } from '../../api/content.api'
import { resolveMediaUrl } from '../../api/mediaUrl'
import { useAuth } from '../../context/auth-context'
import { useMarketplace } from '../../context/marketplace-context'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { storyBackgroundValue, storyFontSize } from '../../lib/storyStyle'
import { Avatar, EmptyState } from '../ui'
import { StoryViewer } from '../content/StoryViewer'
import { MarketplaceImage } from './MarketplaceImage'

const feedFilters = ['All', 'Beauty', 'Fashion', 'Food', 'Travel', 'Sport', 'Technology', 'Gaming', 'Music', 'Lifestyle']
const feedSections = [
  ['recommended', 'For you'],
  ['featured', 'Featured'],
  ['trending', 'Trending'],
  ['latest', 'Latest'],
]

function nameInitials(value = '') {
  return value.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
}

function profileRoute(ownerKey, fallbackRoute) {
  const [channelType, channelId] = String(ownerKey || '').split(':')
  if (!channelId) return fallbackRoute
  return channelType === 'business' ? `/businesses/${channelId}` : `/creators/${channelId}`
}

function compactNumber(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) return ''
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount)
}

const postTypeLabel = {
  ORIGINAL: 'Post',
  PORTFOLIO: 'Creator work',
  CAMPAIGN: 'Campaign',
  COLLABORATION: 'Collaboration',
  BRAND_STORY: 'Brand story',
  STORY: 'Story',
}

function toFeedItem(post) {
  const media = post.media?.[0]
  return {
    id: post.id,
    postId: post.id,
    type: postTypeLabel[post.type] || 'Post',
    label: post.category || postTypeLabel[post.type] || 'Post',
    category: post.category || 'Lifestyle',
    title: post.title || post.author?.name || 'Untitled post',
    copy: post.caption,
    image: resolveMediaUrl(media?.thumbnailUrl || media?.url || post.author?.coverUrl),
    author: post.author?.name || 'VYRA channel',
    avatar: resolveMediaUrl(post.author?.avatarUrl),
    fallback: nameInitials(post.author?.name),
    ownerKey: post.ownerKey,
    saveKey: post.saveKey,
    route: post.route,
    metric: post.paidPartnership ? 'Paid partnership' : `${post.likeCount || 0} likes`,
    mediaType: media?.mediaType || 'IMAGE',
    mediaUrl: resolveMediaUrl(media?.url),
    hasMedia: Boolean(media),
    storyStyle: post.storyStyle,
    storyAudio: post.storyAudio,
    likes: post.likeCount || 0,
    liked: post.liked,
    verified: post.author?.verified,
    expiresInSeconds: post.expiresInSeconds,
  }
}

export function FeedCard({
  item,
  following,
  saved,
  liked,
  onFollow,
  onSave,
  onLike,
  onOpen,
  onOpenProfile,
  onOpenStory,
  canInteract,
}) {
  const isFollowing = item.ownerKey && following.includes(item.ownerKey)
  const isSaved = saved.includes(item.saveKey)
  const openFromKeyboard = (event) => {
    if (event.target !== event.currentTarget) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onOpen()
    }
  }
  const action = (callback) => (event) => {
    event.stopPropagation()
    callback()
  }

  return (
    <div className="showcase-reel-row grid h-full w-full shrink-0 snap-start snap-always grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-2 py-3">
      <aside className="hidden h-full w-full min-w-0 flex-col justify-end self-stretch py-[8dvh] pl-44 pr-5 lg:flex" aria-label={`${item.title} information`}>
        <div className="border-l border-white/15 pl-4">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <button type="button" onClick={item.type === 'Story' ? onOpenStory : onOpenProfile} aria-label={item.type === 'Story' ? `View ${item.author} story` : `View ${item.author} profile`} className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-pink">
                <Avatar src={item.avatar} fallback={item.fallback} size="sm" story={item.type === 'Story'} />
              </button>
              <button type="button" onClick={onOpenProfile} className="group/profile min-w-0 flex-1 text-left outline-none">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-xs font-bold text-white transition group-hover/profile:text-pink">
                  <span className="truncate">{item.author}</span>
                  {item.verified && <CheckCircle2 size={12} className="shrink-0 text-mint" />}
                </p>
                <p className="mt-0.5 truncate text-[9px] text-white/40">{item.metric}</p>
              </div>
              </button>
            </div>
            {canInteract && item.ownerKey && (
              <button
                type="button"
                aria-label={isFollowing ? `Unfollow ${item.author}` : `Follow ${item.author}`}
                aria-pressed={isFollowing}
                onClick={onFollow}
                className={`min-h-7 shrink-0 rounded-full border px-2.5 text-[8px] font-bold transition ${
                  isFollowing
                    ? 'border-white/15 bg-white/[.06] text-white/60 hover:border-pink/35 hover:text-pink'
                    : 'border-white/20 bg-white text-black hover:bg-white/90'
                }`}
              >
                {isFollowing ? 'Unfollow' : 'Follow'}
              </button>
            )}
          </div>
          <button type="button" onClick={onOpenProfile} className="group/profile block w-full text-left outline-none">
            <p className="mt-4 text-[9px] font-bold uppercase tracking-[.14em] text-pink">{item.type}</p>
            <h2 className="mt-2 text-xl font-bold leading-[1.05] tracking-[-.035em] text-white transition group-hover/profile:text-white/75">{item.title}</h2>
            <p className="mt-2 line-clamp-4 text-[11px] leading-[1.65] text-white/50">{item.copy}</p>
          </button>
        </div>
      </aside>

      <article
        role="link"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={openFromKeyboard}
        aria-label={`Open ${item.title}`}
        className="showcase-reel-card group relative col-start-2 aspect-[9/16] w-[min(49dvh,30rem,calc(100vw-5rem))] cursor-pointer overflow-hidden rounded-[1.1rem] border border-white/12 bg-[#151515] shadow-[0_24px_80px_rgba(0,0,0,.45)] outline-none transition duration-300 hover:border-white/25 focus-visible:ring-2 focus-visible:ring-pink"
      >
        {item.mediaType === 'VIDEO' && item.mediaUrl ? (
          <video
            src={item.mediaUrl}
            className="absolute inset-0 size-full object-cover"
            autoPlay
            controls
            loop
            muted
            playsInline
            preload="metadata"
            onClick={(event) => event.stopPropagation()}
          />
        ) : item.storyStyle && !item.hasMedia ? (
          <div className="absolute inset-0" style={{ background: storyBackgroundValue(item.storyStyle.background) }} />
        ) : (
          <MarketplaceImage
            src={item.image}
            alt=""
            className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-[1.02]"
          />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-black/5 to-black/95" />
        {item.storyStyle && <p className="pointer-events-none absolute z-10 w-[82%] -translate-x-1/2 -translate-y-1/2 whitespace-pre-wrap break-words rounded-xl px-3 py-2 font-black leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,.7)]" style={{ left: `${item.storyStyle.x}%`, top: `${item.storyStyle.y}%`, color: item.storyStyle.textColor, fontSize: storyFontSize(item.storyStyle.fontSize), textAlign: item.storyStyle.textAlign }}>{item.copy}</p>}

        <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
          <span className="max-w-[76%] truncate rounded-full border border-white/15 bg-black/50 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[.1em] text-white/80 backdrop-blur-md">
            {item.label}
          </span>
          <span className="grid size-8 place-items-center rounded-full border border-white/15 bg-black/50 backdrop-blur-md">
            {item.type === 'Creator work' || item.type === 'Creator posts'
              ? <Film size={13} />
              : <Images size={13} />}
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4 lg:hidden">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <button type="button" onClick={action(item.type === 'Story' ? onOpenStory : onOpenProfile)} aria-label={item.type === 'Story' ? `View ${item.author} story` : `View ${item.author} profile`} className="shrink-0 rounded-full">
                <Avatar src={item.avatar} fallback={item.fallback} size="sm" story={item.type === 'Story'} />
              </button>
              <button type="button" onClick={action(onOpenProfile)} className="min-w-0 flex-1 text-left">
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 truncate text-xs font-bold">
                  <span className="truncate">{item.author}</span>
                  {item.verified && <CheckCircle2 size={12} className="shrink-0 text-mint" />}
                </span>
                <span className="mt-0.5 block truncate text-[9px] text-white/50">{item.metric}</span>
              </span>
              </button>
            </div>
            {canInteract && item.ownerKey && (
              <button
                type="button"
                aria-label={isFollowing ? `Unfollow ${item.author}` : `Follow ${item.author}`}
                aria-pressed={isFollowing}
                onClick={action(onFollow)}
                className={`min-h-8 shrink-0 rounded-full border px-3 text-[9px] font-bold transition ${
                  isFollowing
                    ? 'border-white/15 bg-white/10 text-white/70'
                    : 'border-white bg-white text-black'
                }`}
              >
                {isFollowing ? 'Unfollow' : 'Follow'}
              </button>
            )}
          </div>
          <h2 className="mt-3 line-clamp-2 text-xl font-bold leading-[1.02] tracking-[-.04em]">{item.title}</h2>
          <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-white/60">{item.copy}</p>
        </div>
      </article>

      <aside aria-label={`${item.title} actions`} className="showcase-reel-actions ml-2 flex w-12 flex-col items-center justify-end gap-4 justify-self-start self-stretch py-[8dvh] xl:ml-5">
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            aria-label={liked ? `Unlike ${item.title}` : `Like ${item.title}`}
            aria-pressed={liked}
            onClick={onLike}
            className={`grid size-11 place-items-center rounded-full border transition ${
              liked
                ? 'border-pink bg-pink text-black'
                : 'border-white/10 bg-white/10 text-white hover:bg-white/15'
            }`}
          >
            <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
          </button>
          <span className="max-w-12 truncate text-[9px] font-bold text-white/65">
            {compactNumber(item.likes) || (liked ? '1' : 'Like')}
          </span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            aria-label={isSaved ? `Remove ${item.title} from saved` : `Save ${item.title}`}
            aria-pressed={isSaved}
            onClick={onSave}
            className={`grid size-11 place-items-center rounded-full border transition ${
              isSaved
                ? 'border-mint bg-mint text-black'
                : 'border-white/10 bg-white/10 text-white hover:bg-white/15'
            }`}
          >
            <Bookmark size={18} fill={isSaved ? 'currentColor' : 'none'} />
          </button>
          <span className="text-[9px] font-bold text-white/65">{isSaved ? 'Saved' : 'Save'}</span>
        </div>
      </aside>
    </div>
  )
}

export function ShowcaseFeed() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isAuthenticated, hasRole } = useAuth()
  const {
    following,
    saved,
    toggleFollowing,
    toggleSaved,
    openCollection,
    markViewed,
  } = useMarketplace()
  const [tab, setTab] = useState(searchParams.get('section') === 'following' ? 'following' : 'contents')
  const [section, setSection] = useState(() => {
    const value = searchParams.get('section')
    return feedSections.some(([id]) => id === value) ? value : 'recommended'
  })
  const [filter, setFilter] = useState(searchParams.get('category') || 'All')
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [liked, setLiked] = useState([])
  const [remotePosts, setRemotePosts] = useState([])
  const [nextCursor, setNextCursor] = useState(null)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [storyViewer, setStoryViewer] = useState(null)
  const loadMoreRef = useRef(null)
  const feedScrollRef = useRef(null)
  const loadMoreControllerRef = useRef(null)
  const activeTab = isAuthenticated ? tab : 'contents'
  const activeSection = activeTab === 'following' ? 'following' : section
  const debouncedQuery = useDebouncedValue(query.trim())

  useEffect(() => {
    const next = new URLSearchParams()
    if (debouncedQuery) next.set('q', debouncedQuery)
    if (filter !== 'All') next.set('category', filter)
    if (activeSection !== 'recommended') next.set('section', activeSection)
    setSearchParams(next, { replace: true })
  }, [activeSection, debouncedQuery, filter, setSearchParams])

  const requestPage = useCallback((cursor = null, replace = false) => {
    if (!replace && (loading || !hasMore)) return Promise.resolve()
    setLoading(true)
    setError('')
    const params = {
      limit: 12,
      mode: activeTab === 'following' ? 'following' : 'for_you',
      section: activeSection,
      ...(filter !== 'All' && { category: filter }),
      ...(debouncedQuery && { q: debouncedQuery }),
      ...(cursor && { cursor }),
    }
    loadMoreControllerRef.current?.abort()
    const controller = new AbortController()
    loadMoreControllerRef.current = controller
    return contentApi.feed(params, { signal: controller.signal }).then((result) => {
      const items = (result.items || []).map(toFeedItem)
      setRemotePosts((current) => {
        const source = replace ? items : [...current, ...items]
        return [...new Map(source.map((item) => [item.id, item])).values()]
      })
      setNextCursor(result.nextCursor || null)
      setHasMore(Boolean(result.nextCursor))
      setLiked((current) => [...new Set([
        ...current,
        ...items.filter((item) => item.liked).map((item) => item.id),
      ])])
    }).catch((requestError) => {
      if (requestError.code !== 'ERR_CANCELED') setError(requestError.response?.data?.error?.message || requestError.response?.data?.message || 'The showcase feed could not be loaded.')
    }).finally(() => setLoading(false))
  }, [activeSection, activeTab, debouncedQuery, filter, hasMore, loading])

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    loadMoreControllerRef.current?.abort()
    queueMicrotask(() => {
      if (!active) return
      setRemotePosts([])
      setNextCursor(null)
      setHasMore(true)
      setLoading(true)
      setError('')
    })
    const params = {
      limit: 12,
      mode: activeTab === 'following' ? 'following' : 'for_you',
      section: activeSection,
      ...(filter !== 'All' && { category: filter }),
      ...(debouncedQuery && { q: debouncedQuery }),
    }
    contentApi.feed(params, { signal: controller.signal }).then((result) => {
      if (!active) return
      const items = (result.items || []).map(toFeedItem)
      setRemotePosts(items)
      setNextCursor(result.nextCursor || null)
      setHasMore(Boolean(result.nextCursor))
      setLiked((current) => [...new Set([
        ...current,
        ...items.filter((item) => item.liked).map((item) => item.id),
      ])])
    }).catch((requestError) => {
      if (active && requestError.code !== 'ERR_CANCELED') setError(requestError.response?.data?.error?.message || requestError.response?.data?.message || 'The showcase feed could not be loaded.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false; controller.abort() }
  }, [activeSection, activeTab, debouncedQuery, filter])

  useEffect(() => {
    const target = loadMoreRef.current
    const scrollRoot = feedScrollRef.current
    if (!target) return undefined
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && nextCursor && hasMore && !loading) {
        requestPage(nextCursor)
      }
    }, { root: scrollRoot, rootMargin: '600px 0px' })
    observer.observe(target)
    return () => observer.disconnect()
  }, [hasMore, loading, nextCursor, requestPage])
  const visible = useMemo(
    () => remotePosts.filter((item) => item.type !== 'Campaign' || hasRole('creator')),
    [hasRole, remotePosts],
  )

  const openItem = (item) => {
    markViewed(item.saveKey)
    navigate(item.route)
  }

  const openStory = (item) => {
    const stories = remotePosts.filter((post) => post.type === 'Story' && post.ownerKey === item.ownerKey)
    const index = Math.max(0, stories.findIndex((story) => story.id === item.id))
    markViewed(item.saveKey)
    setStoryViewer({ stories, index })
  }

  const saveItem = (item) => {
    const alreadySaved = saved.includes(item.saveKey)
    toggleSaved(item.saveKey)
    if (!alreadySaved) openCollection(item.saveKey)
  }

  const scrollReel = useCallback((direction) => {
    const feedElement = feedScrollRef.current
    if (!feedElement) return
    feedElement.scrollBy({
      top: direction * feedElement.clientHeight,
      behavior: 'smooth',
    })
  }, [])

  useEffect(() => {
    const handleKeyDown = (event) => {
      const tagName = event.target?.tagName
      if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') return
      if (event.key === 'ArrowDown' || event.key === 'PageDown') {
        event.preventDefault()
        scrollReel(1)
      }
      if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault()
        scrollReel(-1)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [scrollReel])

  const toggleLike = (item) => {
    const wasLiked = liked.includes(item.id)
    setLiked((items) => wasLiked ? items.filter((id) => id !== item.id) : [...items, item.id])
    setRemotePosts((items) => items.map((post) => post.id === item.id
      ? { ...post, likes: Math.max(0, post.likes + (wasLiked ? -1 : 1)) }
      : post))
    const request = wasLiked ? contentApi.unlike(item.postId) : contentApi.like(item.postId)
    request.catch(() => {
      setLiked((items) => wasLiked ? [...new Set([...items, item.id])] : items.filter((id) => id !== item.id))
      setRemotePosts((items) => items.map((post) => post.id === item.id
        ? { ...post, likes: Math.max(0, post.likes + (wasLiked ? 1 : -1)) }
        : post))
    })
  }

  return (
    <main className="showcase-feed-shell h-[calc(100dvh-76px)] overflow-hidden bg-[#0b0b0b]">
      <div className="relative h-full min-w-0">
        <aside className="absolute inset-y-0 left-0 z-20 hidden w-40 flex-col border-r border-white/[.07] bg-[#0b0b0b] px-2 py-4 lg:flex">
          <p className="px-2.5 text-[6px] font-bold uppercase tracking-[.15em] text-white/25">Watch</p>
          <div role="tablist" aria-label="Showcase feeds" className="mt-2.5 space-y-1">
            {feedSections.map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={activeTab === 'contents' && section === id}
                onClick={() => { setTab('contents'); setSection(id) }}
                className={`flex min-h-8 w-full items-center gap-2 rounded-lg px-2.5 text-left text-[9px] font-bold transition ${
                  activeTab === 'contents' && section === id ? 'bg-white text-black' : 'text-white/55 hover:bg-white/[.06] hover:text-white'
                }`}
              >
                {id === 'recommended' ? <Sparkles size={15} /> : <Film size={15} />}
                {label}
              </button>
            ))}
            {isAuthenticated && (
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'following'}
                onClick={() => setTab('following')}
                className={`flex min-h-8 w-full items-center gap-2 rounded-lg px-2.5 text-left text-[9px] font-bold transition ${
                  activeTab === 'following' ? 'bg-white text-black' : 'text-white/55 hover:bg-white/[.06] hover:text-white'
                }`}
              >
                <Users size={15} />
                Following
              </button>
            )}
          </div>

          <div className="my-3 border-t border-white/[.07]" />
          <p className="px-2.5 text-[6px] font-bold uppercase tracking-[.15em] text-white/25">Explore</p>
          <nav aria-label="Showcase filters" className="mt-2 grid grid-cols-1 gap-0.5">
            {feedFilters.map((item) => {
              const Icon = item === 'All' ? Sparkles : Images
              return (
                <button
                  key={item}
                  type="button"
                  aria-pressed={filter === item}
                  onClick={() => setFilter(item)}
                  className={`flex min-h-7 min-w-0 items-center gap-2 rounded-lg px-2 text-left text-[7px] font-semibold transition ${
                    filter === item
                      ? 'bg-white/[.1] text-white'
                      : 'text-white/40 hover:bg-white/[.05] hover:text-white/75'
                  }`}
                >
                  <Icon size={11} className={`shrink-0 ${filter === item ? 'text-pink' : ''}`} />
                  <span className="truncate">{item}</span>
                </button>
              )
            })}
          </nav>

          <label className="relative mt-auto block" aria-label="Search showcase content">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-white/35" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              className="h-9 w-full rounded-lg border border-white/[.08] bg-white/[.035] pl-8 pr-2 text-[8px] text-white outline-none transition placeholder:text-white/30 focus:border-pink/40 focus:bg-white/[.055]"
            />
          </label>
        </aside>

        <section className="relative h-full min-w-0 overflow-hidden" aria-label="Showcase reels viewer">
          <div className="absolute inset-x-0 top-2 z-30 flex flex-col items-center gap-1.5 px-3 lg:hidden">
            <label className="relative w-full max-w-xs" aria-label="Search showcase content">
              <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search creators, businesses or descriptions"
                className="h-9 w-full rounded-full border border-white/10 bg-black/75 pl-8 pr-3 text-[9px] text-white outline-none backdrop-blur-xl placeholder:text-white/35 focus:border-pink/45"
              />
            </label>
            <div role="tablist" aria-label="Showcase feeds" className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-white/10 bg-black/70 p-1 backdrop-blur-xl [scrollbar-width:none]">
              {feedSections.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'contents' && section === id}
                  onClick={() => { setTab('contents'); setSection(id) }}
                  className={`min-h-8 shrink-0 rounded-full px-3 text-[10px] font-bold ${activeTab === 'contents' && section === id ? 'bg-white text-black' : 'text-white/60'}`}
                >
                  {label}
                </button>
              ))}
              {isAuthenticated && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'following'}
                  onClick={() => setTab('following')}
                  className={`min-h-8 shrink-0 rounded-full px-3 text-[10px] font-bold ${activeTab === 'following' ? 'bg-white text-black' : 'text-white/60'}`}
                >
                  Following
                </button>
              )}
              {feedFilters.filter((item) => item !== 'All').map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={filter === item}
                  onClick={() => setFilter(filter === item ? 'All' : item)}
                  className={`min-h-8 shrink-0 rounded-full px-3 text-[10px] font-bold ${filter === item ? 'bg-pink text-black' : 'text-white/50'}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div role="alert" className="absolute left-1/2 top-14 z-40 w-[min(28rem,calc(100%-2rem))] -translate-x-1/2 rounded-xl border border-red-400/20 bg-[#2a1518]/95 p-3 text-xs text-red-200 backdrop-blur">
              {error}
              <button type="button" onClick={() => requestPage(nextCursor, remotePosts.length === 0)} className="ml-3 font-bold underline">Retry</button>
            </div>
          )}

          <div
            ref={feedScrollRef}
            className="h-full min-w-0 snap-y snap-mandatory overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {visible.length ? (
              <div className="flex h-full min-h-full min-w-0 flex-col">
                {visible.map((item) => (
                  <FeedCard
                    key={item.id}
                    item={item}
                    following={following}
                    saved={saved}
                    liked={liked.includes(item.id)}
                    onFollow={() => toggleFollowing(item.ownerKey)}
                    onSave={() => {
                      if (!isAuthenticated) {
                        navigate('/login', { state: { from: '/showcase' } })
                        return
                      }
                      saveItem(item)
                    }}
                    onLike={() => {
                      if (!isAuthenticated) {
                        navigate('/login', { state: { from: '/showcase' } })
                        return
                      }
                      toggleLike(item)
                    }}
                    onOpen={() => openItem(item)}
                    onOpenProfile={() => navigate(profileRoute(item.ownerKey, item.route))}
                    onOpenStory={() => openStory(item)}
                    canInteract={isAuthenticated}
                  />
                ))}
                <div ref={loadMoreRef} className="h-px shrink-0" aria-hidden="true" />
              </div>
            ) : (
              <div className="grid h-full place-items-center px-4">
                <EmptyState
                  title={activeTab === 'following'
                    ? 'No content from followed channels yet'
                    : debouncedQuery
                      ? 'No showcase content matches your search'
                      : 'No content in this category'}
                  description={activeTab === 'following'
                    ? 'Follow creators or businesses, then their work will appear here.'
                    : debouncedQuery
                      ? 'Search by creator, business, title or description, or clear the current category.'
                      : 'Choose another content filter to continue watching.'}
                  action={activeTab === 'following' ? 'Find channels' : debouncedQuery ? 'Clear search' : 'Show all content'}
                  onAction={() => {
                    if (activeTab === 'following') navigate('/search/creators')
                    else if (debouncedQuery) setQuery('')
                    else setFilter('All')
                  }}
                />
              </div>
            )}
          </div>

          <button
            type="button"
            aria-label="Shuffle showcase content"
            onClick={() => requestPage(null, true)}
            className="absolute right-3 top-3 z-30 grid size-10 place-items-center rounded-full border border-white/10 bg-[#202020]/90 text-white/65 backdrop-blur transition hover:bg-[#2c2c2c] hover:text-white max-lg:hidden"
          >
            <RefreshCw size={16} />
          </button>

          <div className="pointer-events-none absolute right-3 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-2 md:flex">
            <button
              type="button"
              aria-label="Previous reel"
              onClick={() => scrollReel(-1)}
              className="pointer-events-auto grid size-12 place-items-center rounded-full border border-white/10 bg-[#202020] text-white transition hover:bg-[#303030]"
            >
              <ChevronUp size={22} />
            </button>
            <button
              type="button"
              aria-label="Next reel"
              onClick={() => scrollReel(1)}
              className="pointer-events-auto grid size-12 place-items-center rounded-full border border-white/10 bg-[#202020] text-white transition hover:bg-[#303030]"
            >
              <ChevronDown size={22} />
            </button>
          </div>

          {loading && (
            <span role="status" aria-live="polite" className="pointer-events-none absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/65 px-3 py-2 text-[9px] font-bold uppercase tracking-[.12em] text-white/50 backdrop-blur">
              <RefreshCw size={12} className="animate-spin" />
              Loading
            </span>
          )}
        </section>
      </div>
      {storyViewer && <StoryViewer stories={storyViewer.stories} initialIndex={storyViewer.index} onClose={() => setStoryViewer(null)} liked={liked} saved={saved} onLike={isAuthenticated ? toggleLike : undefined} onSave={isAuthenticated ? saveItem : undefined} />}
    </main>
  )
}

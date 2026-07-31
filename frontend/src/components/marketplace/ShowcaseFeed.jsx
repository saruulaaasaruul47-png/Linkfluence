import { useEffect, useMemo, useState } from 'react'
import {
  Bookmark,
  CheckCircle2,
  Film,
  Heart,
  Images,
  MessageCircle,
  RefreshCw,
  Search,
  Share2,
  Sparkles,
  Users,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { showcaseApi } from '../../api/showcase.api'
import { businesses, campaigns, creators, showcases } from '../../data/marketplace'
import { useCollaboration } from '../../context/collaboration-context'
import { useAuth } from '../../context/auth-context'
import { useMarketplace } from '../../context/marketplace-context'
import { Avatar, EmptyState } from '../ui'
import { MarketplaceImage } from './MarketplaceImage'

const feedFilters = ['All', 'Creator work', 'Campaigns', 'Creator posts', 'Brand stories']

function creatorById(id) {
  return creators.find((item) => item.id === id)
}

function businessById(id) {
  return businesses.find((item) => item.id === id)
}

function nameInitials(value = '') {
  return value.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
}

function shuffleScore(id, seed) {
  let score = 2166136261 + seed * 101
  for (const character of id) {
    score ^= character.charCodeAt(0)
    score = Math.imul(score, 16777619)
  }
  return score >>> 0
}

function buildFeed(publishedShowcases) {
  const completedWork = [...publishedShowcases, ...showcases].map((item) => {
    const creatorId = item.creatorId || item.creator?.id
    const creator = creatorById(creatorId)
    const creatorName = typeof item.creator === 'object' ? item.creator.name : item.creator
    return {
      id: `work:${item.id}`,
      showcaseId: item.id,
      type: 'Creator work',
      label: item.category || 'Creator work',
      title: item.title,
      copy: item.performance || 'A completed creator collaboration.',
      image: item.image,
      author: creatorName || creator?.name || 'VYRA creator',
      avatar: item.creator?.avatar || creator?.avatar,
      fallback: nameInitials(creatorName || creator?.name),
      ownerKey: creatorId ? `creator:${creatorId}` : '',
      saveKey: `showcase:${item.id}`,
      route: `/showcase/${item.id}`,
      metric: item.performance || 'Featured work',
    }
  })

  const campaignPosts = campaigns.map((item) => {
    const business = businessById(item.businessId)
    return {
      id: `campaign:${item.id}`,
      type: 'Campaigns',
      label: `${item.mode} campaign`,
      title: item.title,
      copy: `${item.goal} · ${item.deliverables}`,
      image: item.image,
      author: item.business,
      fallback: business?.logo || nameInitials(item.business),
      ownerKey: `business:${item.businessId}`,
      saveKey: `campaign:${item.id}`,
      route: `/campaigns/${item.id}`,
      metric: `${item.applications} interested`,
    }
  })

  const creatorPosts = creators.map((item) => ({
    id: `creator-post:${item.id}`,
    type: 'Creator posts',
    label: item.niche,
    title: item.name,
    copy: item.bio,
    image: item.cover,
    author: item.name,
    avatar: item.avatar,
    fallback: nameInitials(item.name),
    ownerKey: `creator:${item.id}`,
    saveKey: `creator:${item.id}`,
    route: `/creators/${item.id}`,
    metric: `${item.engagement} engagement`,
    verified: item.verified,
  }))

  const brandPosts = businesses.map((item) => ({
    id: `brand-post:${item.id}`,
    type: 'Brand stories',
    label: item.industry,
    title: item.name,
    copy: item.description,
    image: item.cover,
    author: item.name,
    fallback: item.logo || nameInitials(item.name),
    ownerKey: `business:${item.id}`,
    saveKey: `business:${item.id}`,
    route: `/businesses/${item.id}`,
    metric: `${item.campaigns} active campaigns`,
    verified: item.verifiedPayer,
  }))

  return [...completedWork, ...campaignPosts, ...creatorPosts, ...brandPosts]
}

function FeedCard({
  item,
  following,
  saved,
  liked,
  onFollow,
  onSave,
  onLike,
  onShare,
  onOpen,
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
    <article
      role="link"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={openFromKeyboard}
      aria-label={`Open ${item.title}`}
      className="group relative mx-auto aspect-[9/14] w-full max-w-[27rem] cursor-pointer overflow-hidden rounded-[1.45rem] border border-white/12 bg-[#151515] outline-none transition duration-300 hover:-translate-y-1 hover:border-white/25 focus-visible:ring-2 focus-visible:ring-pink"
    >
      <MarketplaceImage
        src={item.image}
        alt=""
        className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-[1.035]"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/5 to-black/95" />

      <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
        <span className="max-w-[70%] truncate rounded-full border border-white/15 bg-black/45 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[.1em] text-white/75 backdrop-blur-md">
          {item.label}
        </span>
        <span className="grid size-8 place-items-center rounded-full border border-white/15 bg-black/45 backdrop-blur-md">
          {item.type === 'Creator work' || item.type === 'Creator posts'
            ? <Film size={13} />
            : <Images size={13} />}
        </span>
      </div>

      <div className="absolute bottom-24 right-3 z-10 flex flex-col gap-2">
        {canInteract && <button
          type="button"
          aria-label={liked ? `Unlike ${item.title}` : `Like ${item.title}`}
          onClick={action(onLike)}
          className={`grid size-9 place-items-center rounded-full border backdrop-blur-md transition ${
            liked ? 'border-pink bg-pink text-black' : 'border-white/20 bg-black/45 text-white'
          }`}
        >
          <Heart size={14} fill={liked ? 'currentColor' : 'none'} />
        </button>}
        {canInteract && <button
          type="button"
          aria-label={isSaved ? `Remove ${item.title} from saved` : `Save ${item.title}`}
          onClick={action(onSave)}
          className={`grid size-9 place-items-center rounded-full border backdrop-blur-md transition ${
            isSaved ? 'border-mint bg-mint text-black' : 'border-white/20 bg-black/45 text-white'
          }`}
        >
          <Bookmark size={14} fill={isSaved ? 'currentColor' : 'none'} />
        </button>}
        <button
          type="button"
          aria-label={`Open ${item.title} details`}
          onClick={action(onOpen)}
          className="grid size-9 place-items-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur-md"
        >
          <MessageCircle size={14} />
        </button>
        <button
          type="button"
          aria-label={`Share ${item.title}`}
          onClick={action(onShare)}
          className="grid size-9 place-items-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur-md"
        >
          <Share2 size={14} />
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-0 p-4 pr-14">
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar src={item.avatar} fallback={item.fallback} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate text-xs font-bold">
              <span className="truncate">{item.author}</span>
              {item.verified && <CheckCircle2 size={12} className="shrink-0 text-mint" />}
            </p>
            <p className="mt-0.5 truncate text-[9px] text-white/45">{item.metric}</p>
          </div>
          {canInteract && item.ownerKey && (
            <button
              type="button"
              onClick={action(onFollow)}
              className={`min-h-8 shrink-0 rounded-full border px-2.5 text-[9px] font-bold transition ${
                isFollowing
                  ? 'border-white/15 bg-white/10 text-white/65'
                  : 'border-pink bg-pink text-black'
              }`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
        </div>
        <h2 className="mt-3 line-clamp-2 text-xl font-bold leading-[1.02] tracking-[-.04em]">{item.title}</h2>
        <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-white/55">{item.copy}</p>
      </div>
    </article>
  )
}

export function ShowcaseFeed() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { publishedShowcases } = useCollaboration()
  const {
    following,
    saved,
    toggleFollowing,
    toggleSaved,
    openCollection,
    share,
    markViewed,
  } = useMarketplace()
  const [tab, setTab] = useState('contents')
  const [filter, setFilter] = useState('All')
  const [seed, setSeed] = useState(0)
  const [liked, setLiked] = useState([])
  const [remoteShowcases, setRemoteShowcases] = useState([])
  const activeTab = isAuthenticated ? tab : 'contents'
  useEffect(() => {
    let active = true
    const request = activeTab === 'following' ? showcaseApi.following({ limit: 30 }) : showcaseApi.list({ limit: 30 })
    request.then((result) => {
      if (!active) return
      setRemoteShowcases(result.items || [])
      setLiked((items) => [...new Set([
        ...items,
        ...(result.items || []).filter((item) => item.liked).map((item) => `work:${item.id}`),
      ])])
    }).catch(() => {})
    return () => { active = false }
  }, [activeTab])
  const feed = useMemo(() => buildFeed([...remoteShowcases, ...publishedShowcases]), [publishedShowcases, remoteShowcases])
  const visible = useMemo(() => {
    const scoped = feed.filter((item) => (
      (activeTab === 'contents' || following.includes(item.ownerKey))
      && (filter === 'All' || item.type === filter)
    ))
    return [...scoped].sort((left, right) => (
      shuffleScore(left.id, seed) - shuffleScore(right.id, seed)
    ))
  }, [activeTab, feed, filter, following, seed])

  const openItem = (item) => {
    markViewed(item.saveKey)
    navigate(item.route)
  }

  const saveItem = (item) => {
    const alreadySaved = saved.includes(item.saveKey)
    toggleSaved(item.saveKey)
    if (!alreadySaved) openCollection(item.saveKey)
  }

  const toggleLike = (item) => {
    const wasLiked = liked.includes(item.id)
    setLiked((items) => wasLiked ? items.filter((id) => id !== item.id) : [...items, item.id])
    if (!item.showcaseId) return
    const request = wasLiked ? showcaseApi.unlike(item.showcaseId) : showcaseApi.like(item.showcaseId)
    request.catch(() => {
      setLiked((items) => wasLiked ? [...new Set([...items, item.id])] : items.filter((id) => id !== item.id))
    })
  }

  return (
    <main>
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_18%_0%,rgba(255,105,180,.12),transparent_34%)]">
        <div className="mx-auto flex max-w-[1500px] flex-col justify-between gap-6 px-5 py-10 md:flex-row md:items-end lg:px-8 lg:py-12">
          <div>
            <p className="eyebrow text-white/35">Creator culture · Campaign moments</p>
            <h1 className="mt-3 text-4xl font-extrabold uppercase leading-none tracking-[-.065em] sm:text-5xl">
              Showcase
            </h1>
            <p className="mt-3 max-w-xl text-xs leading-5 text-white/45 sm:text-sm">
              Scroll creator work, fresh posts and campaign stories. Save what inspires you and follow the channels you want to see more from.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/search')}
            className="flex min-h-10 w-max items-center gap-2 rounded-full border border-white/12 bg-white/[.035] px-4 text-xs font-bold text-white/65 transition hover:border-white/25 hover:text-white"
          >
            <Search size={14} />
            Search marketplace
          </button>
        </div>
      </section>

      <div className="sticky top-[76px] z-30 border-b border-white/10 bg-[#0d0d0d]/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3 px-5 py-2.5 lg:px-8">
          <div role="tablist" aria-label="Showcase feeds" className="flex rounded-xl border border-white/10 bg-white/[.025] p-1">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'contents'}
              onClick={() => setTab('contents')}
              className={`flex min-h-9 items-center gap-2 rounded-lg px-3 text-[11px] font-bold transition ${
                activeTab === 'contents' ? 'bg-white text-black' : 'text-white/45 hover:text-white'
              }`}
            >
              <Sparkles size={13} />
              Contents
            </button>
            {isAuthenticated && <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'following'}
              onClick={() => setTab('following')}
              className={`flex min-h-9 items-center gap-2 rounded-lg px-3 text-[11px] font-bold transition ${
                activeTab === 'following' ? 'bg-mint text-black' : 'text-white/45 hover:text-white'
              }`}
            >
              <Users size={13} />
              Following
              <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[8px]">{following.length}</span>
            </button>}
          </div>
          <button
            type="button"
            aria-label="Shuffle showcase content"
            onClick={() => setSeed((value) => value + 1)}
            className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 text-white/45 transition hover:border-white/25 hover:text-white"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-[1500px] px-5 py-6 lg:px-8 lg:py-8">
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {feedFilters.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={filter === item}
              onClick={() => setFilter(item)}
              className={`min-h-8 shrink-0 rounded-full border px-3 text-[10px] font-bold transition ${
                filter === item
                  ? 'border-pink bg-pink text-black'
                  : 'border-white/10 text-white/40 hover:border-white/20 hover:text-white'
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {visible.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {visible.map((item) => (
              <FeedCard
                key={item.id}
                item={item}
                following={following}
                saved={saved}
                liked={liked.includes(item.id)}
                onFollow={() => toggleFollowing(item.ownerKey)}
                onSave={() => saveItem(item)}
                onLike={() => toggleLike(item)}
                onShare={() => share(item.title, `${window.location.origin}${item.route}`, item.saveKey)}
                onOpen={() => openItem(item)}
                canInteract={isAuthenticated}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title={activeTab === 'following' ? 'No content from followed channels yet' : 'No content in this category'}
            description={activeTab === 'following'
              ? 'Follow creators or businesses, then their work and campaign posts will appear here.'
              : 'Choose another content filter to continue watching.'}
            action={activeTab === 'following' ? 'Find channels' : 'Show all content'}
            onAction={() => {
              if (activeTab === 'following') navigate('/search/creators')
              else setFilter('All')
            }}
          />
        )}
      </div>
    </main>
  )
}

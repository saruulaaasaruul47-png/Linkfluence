import {
  Bookmark,
  BriefcaseBusiness,
  Camera,
  CheckCircle2,
  Clapperboard,
  Globe2,
  HeartHandshake,
  Link2,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { marketplaceApi } from '../../api/marketplace.api'
import { resolveMediaUrl } from '../../api/mediaUrl'
import { verifiedPayerCopy } from '../../lib/trustPresentation'
import { CampaignCard } from '../../components/marketplace/cards'
import { MarketplaceImage } from '../../components/marketplace/MarketplaceImage'
import { Avatar, Badge, Button, Dialog, EmptyState, SpotlightCard, Textarea, useToast } from '../../components/ui'
import { useMarketplace } from '../../context/marketplace-context'
import { useCollaboration } from '../../context/collaboration-context'
import { useAuth } from '../../context/auth-context'
import { contentApi } from '../../api/content.api'
import { libraryApi } from '../../api/library.api'
import { messagingApi } from '../../api/dashboard.api'
import { usePageSeo } from '../../hooks/usePageSeo'

const mediaSource = (value) => resolveMediaUrl(value) || ''

const compactNumber = (value) => {
  if (!Number.isFinite(Number(value))) return '—'
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value))
}

const money = (value, currency = 'MNT') => {
  if (!Number.isFinite(Number(value))) return 'Contact for rate'
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency: currency || 'MNT',
    maximumFractionDigits: 0,
  }).format(Number(value))
}

function publicCreatorView(profile) {
  return {
    ...profile,
    avatar: resolveMediaUrl(profile.avatar) || '',
    cover: resolveMediaUrl(profile.cover) || '',
    followers: compactNumber(profile.followerCount),
    engagement: profile.engagementRate == null ? '—' : `${Number(profile.engagementRate).toFixed(1)}%`,
    price: money(profile.startingRate, profile.currency),
    platforms: profile.socialAccounts?.map((account) => account.platform) || [],
  }
}

function publicPortfolioView(profile) {
  return (profile.portfolio || []).map((item) => ({
    ...item,
    creatorId: profile.id,
    creator: profile.name,
    category: item.category || profile.niche || '',
    image: resolveMediaUrl(item.thumbnailUrl || item.mediaUrl) || profile.cover,
  }))
}

function publicBusinessView(profile) {
  const initials = profile.name?.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  return {
    ...profile,
    logo: resolveMediaUrl(profile.logo) || initials || 'B',
    cover: resolveMediaUrl(profile.cover) || '',
    verifiedPayer: Boolean(profile.verifiedPayer),
    verifiedPayerSince: profile.verifiedPayerSince || null,
    campaignItems: profile.campaigns || [],
    campaigns: profile.campaignCount,
  }
}

function publicCampaignView(campaign, business) {
  const budget = campaign.budgetMin == null && campaign.budgetMax == null
    ? 'Budget on request'
    : `${money(campaign.budgetMin, campaign.currency)}–${money(campaign.budgetMax, campaign.currency)}`
  return {
    ...campaign,
    business: business.name,
    image: business.cover,
    platform: campaign.platforms?.join(' · ') || 'Not specified',
    mode: campaign.status === 'OPEN' ? 'Open' : campaign.status || 'Not specified',
    goal: campaign.goal || campaign.category || 'Not specified',
    niche: campaign.category || business.industry,
    deliverables: Array.isArray(campaign.deliverables)
      ? campaign.deliverables.join(' · ')
      : campaign.deliverables || 'Not specified',
    applications: campaign._count?.proposals ?? campaign.proposalCount ?? 0,
    budget,
    deadline: campaign.applicationDeadline || campaign.deadline
      ? new Intl.DateTimeFormat('en', { month: 'short', day: '2-digit' }).format(new Date(campaign.applicationDeadline || campaign.deadline))
      : 'Not set',
  }
}

function platformIcon(platform) {
  const value = platform.toLowerCase()
  if (value.includes('youtube')) return Clapperboard
  if (value.includes('instagram')) return Camera
  if (value.includes('tiktok')) return Clapperboard
  return Link2
}

function reviewSummary(creator) {
  const reviewCount = Number.isInteger(creator.ratingCount) ? creator.ratingCount : 0
  if (!reviewCount) {
    return {
      hasReviews: false,
      label: 'Not rated yet',
      copy: 'Business rating unlocks only after a completed collaboration.',
    }
  }
  return {
    hasReviews: true,
    label: creator.rating,
    copy: `${reviewCount} completed business collaboration${reviewCount === 1 ? '' : 's'}`,
  }
}

function MiniMetric({ icon: Icon, label, value, tone = 'white' }) {
  return (
    <SpotlightCard className="rounded-[1.1rem] border border-white/10 bg-white/[.03] p-3">
      <span className={`grid size-8 place-items-center rounded-full ${tone === 'mint' ? 'bg-mint/10 text-mint' : tone === 'pink' ? 'bg-pink/10 text-pink' : 'bg-white/[.06] text-white/45'}`}>
        <Icon size={15} />
      </span>
      <p className="mt-3 text-[9px] font-bold uppercase tracking-[.12em] text-white/30">{label}</p>
      <strong className="mt-1 block truncate text-sm tracking-[-.02em]">{value}</strong>
    </SpotlightCard>
  )
}

function MessageRequestDialog({ open, onClose, recipientType, recipient }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  useEffect(() => {
    if (!open) return undefined
    const timer = window.setTimeout(() => setMessage(''), 0)
    return () => window.clearTimeout(timer)
  }, [open, recipient?.id])
  const submit = async (event) => {
    event.preventDefault()
    if (message.trim().length < 2) return
    setSending(true)
    try {
      const result = await messagingApi.createRequest({ recipientType, recipientId: recipient.id, message: message.trim() })
      toast(result.conversationId ? 'Conversation already exists.' : result.existing ? 'A message request is already waiting.' : 'Message request sent.', { type: 'success' })
      onClose()
      navigate(`/${recipientType === 'CREATOR' ? 'business' : 'creator'}/messages`, { state: { conversationId: result.conversationId || null, showRequests: !result.conversationId } })
    } catch (error) {
      toast(error.response?.data?.error?.message || 'Message request could not be sent.', { type: 'error' })
    } finally { setSending(false) }
  }
  return <Dialog open={open} onClose={onClose} title={`Message ${recipient?.name || 'channel'}`} description="They must accept this request before the conversation opens.">
    <form onSubmit={submit} className="space-y-4"><Textarea label="Introduction" rows={5} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Introduce yourself and explain why you want to connect."/><Button className="w-full" type="submit" variant="pink" loading={sending} disabled={message.trim().length < 2}><MessageSquare size={14}/>Send message request</Button></form>
  </Dialog>
}

function ProfileSection({ title, action, children }) {
  return (
    <section className="rounded-[1.4rem] border border-white/10 bg-white/[.025] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold tracking-[-.035em]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function CreatorProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState('posts')
  const [remoteCreator, setRemoteCreator] = useState(null)
  const [channelPosts, setChannelPosts] = useState([])
  const [socialSummary, setSocialSummary] = useState(null)
  const [messageOpen, setMessageOpen] = useState(false)
  const {
    account,
    saved,
    following,
    toggleSaved,
    toggleFollowing,
    openCollection,
  } = useMarketplace()
  const { openOfferComposer } = useCollaboration()
  const { isAuthenticated, hasRole } = useAuth()

  useEffect(() => {
    let active = true
    if (id === 'my-creator') {
      return () => { active = false }
    }
    marketplaceApi.getCreator(id)
      .then((profile) => {
        if (active) setRemoteCreator({ ...publicCreatorView(profile), requestedId: id })
      })
      .catch(() => {
        if (active) setRemoteCreator({ notFoundId: id })
      })
    return () => { active = false }
  }, [id])

  useEffect(() => {
    let active = true
    if (id === 'my-creator') return () => { active = false }
    Promise.all([
      contentApi.channel('creator', id, { limit: 24 }).catch(() => ({ items: [] })),
      libraryApi.socialSummary('creator', id).catch(() => null),
    ]).then(([posts, summary]) => {
      if (!active) return
      setChannelPosts(posts.items || [])
      setSocialSummary(summary)
    })
    return () => { active = false }
  }, [id])

  const localCreator = id === 'my-creator' ? {
    id: 'my-creator',
    name: account.creator.name,
    username: account.creator.username,
    niche: account.creator.niche,
    location: account.creator.location,
    bio: account.creator.bio,
    price: account.creator.rate || 'Contact for rate',
    cover: mediaSource(account.creator.cover),
    avatar: mediaSource(account.creator.avatar),
    platforms: [account.creator.instagram && 'Instagram', account.creator.facebook && 'Facebook', account.creator.tiktok && 'TikTok'].filter(Boolean),
    skills: account.creator.skills || [],
    verified: false,
    rating: null,
    ratingCount: 0,
  } : null
  const creator = localCreator || (remoteCreator?.requestedId === id ? remoteCreator : null)

  usePageSeo({
    enabled: Boolean(creator),
    title: `${creator?.name || 'Creator'} · Creator on VYRA`,
    description: creator?.bio || `Explore ${creator?.name || 'this creator'}'s work, audience and collaboration profile on VYRA.`,
    canonicalPath: `/creators/${creator?.slug || id}`,
    image: creator?.cover || creator?.avatar,
    type: 'profile',
    jsonLd: creator ? {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: creator.name,
      description: creator.bio || undefined,
      image: creator.avatar || creator.cover || undefined,
      url: new URL(`/creators/${creator.slug || id}`, window.location.origin).toString(),
      sameAs: creator.socialAccounts?.map((account) => account.profileUrl).filter(Boolean) || [],
      knowsAbout: [...new Set([...(creator.categories || []), ...(creator.skills || [])])],
    } : null,
  })

  if (!creator) {
    const loading = remoteCreator?.notFoundId !== id
    return <EmptyState title={loading ? 'Loading creator…' : 'Creator not found'} />
  }

  const key = `creator:${creator.id}`
  const work = remoteCreator?.requestedId === id
    ? publicPortfolioView(remoteCreator)
    : []
  const rating = reviewSummary(creator)
  const skills = creator.skills || []
  const isSaved = saved.includes(key)
  const isFollowing = following.includes(key)
  const tabs = [
    ['posts', 'Posts', channelPosts.length || work.length],
    ['about', 'About', skills.length],
    ['reviews', 'Reviews', rating.hasReviews ? creator.ratingCount : 0],
  ]

  return (
    <main className="mx-auto max-w-[1180px] px-4 pb-14 pt-5 sm:px-5 lg:px-8">
      <section className="overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#151515] shadow-[0_22px_70px_rgba(0,0,0,.24)]">
        <div className="relative min-h-[11rem] bg-gradient-to-br from-pink/15 via-[#171717] to-mint/10 sm:min-h-[13rem]">
          {creator.cover && <MarketplaceImage
            src={creator.cover}
            alt={`${creator.name} cover`}
            className="absolute inset-0 size-full object-cover"
          />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-black/10" />
        </div>

        <div className="relative px-4 pb-0 sm:px-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 items-end gap-4">
              <Avatar
                src={creator.avatar}
                alt={creator.name}
                fallback={creator.name}
                size="xl"
                className="-mt-10 size-20 border-4 border-[#151515] bg-[#151515] shadow-xl sm:-mt-11 sm:size-24"
              />
              <div className="min-w-0 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="break-words text-2xl font-black tracking-[-.045em] sm:text-3xl">{creator.name}</h1>
                  {creator.verified && <CheckCircle2 size={16} className="shrink-0 text-mint" aria-label="Verified creator" />}
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/45">
                  <span>{creator.username}</span>
                  <span className="flex items-center gap-1"><MapPin size={13} />{creator.location}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pb-1">
              {hasRole('business') && id !== 'my-creator' && <Button size="sm" variant="outline" onClick={() => setMessageOpen(true)}><MessageSquare size={13}/>Message</Button>}
              {hasRole('business') && <Button size="sm" variant="pink" onClick={() => openOfferComposer(creator)}>
                <BriefcaseBusiness size={13} /> Work with me
              </Button>}
              {isAuthenticated && <Button size="sm" aria-pressed={isFollowing} variant={isFollowing ? 'mint' : 'outline'} onClick={() => {
                toggleFollowing(key)
                setSocialSummary((value) => value ? { ...value, followerCount: Math.max(0, value.followerCount + (isFollowing ? -1 : 1)), following: !isFollowing } : value)
              }}>
                {isFollowing ? <UserCheck size={13} /> : <UserPlus size={13} />}{isFollowing ? 'Following' : 'Follow'}
              </Button>}
              {isAuthenticated && <Button
                size="sm"
                aria-pressed={isSaved}
                variant={isSaved ? 'secondary' : 'outline'}
                onClick={() => {
                  toggleSaved(key)
                  if (!isSaved) openCollection(key)
                }}
              >
                <Bookmark size={13} />{isSaved ? 'Saved' : 'Save'}
              </Button>}
            </div>
          </div>

          <p className="mt-3 max-w-3xl text-xs leading-5 text-white/60 sm:ml-28">{creator.bio}</p>
          <div className="mt-3 flex flex-wrap gap-2 sm:ml-28">
            <Badge variant="pink">{creator.niche}</Badge>
            {creator.platforms.map((platform) => <Badge key={platform} variant="outline">{platform}</Badge>)}
          </div>

          <dl className="mt-4 grid grid-cols-2 border-y border-white/10 sm:grid-cols-5">
            {[
              ['Audience', creator.followers],
              ['Followers', compactNumber(socialSummary?.followerCount || 0)],
              ['Engagement', creator.engagement],
              ['Completed work', String(work.length)],
              ['Rating', rating.label],
            ].map(([label, value], index) => (
              <div key={label} className={`px-3 py-3 text-center ${index % 2 ? 'border-l border-white/10' : ''} sm:border-l sm:first:border-l-0`}>
                <dd className="text-base font-black tracking-[-.025em] sm:text-lg">{value}</dd>
                <dt className="mt-1 text-[9px] font-bold uppercase tracking-[.12em] text-white/30">{label}</dt>
              </div>
            ))}
          </dl>

          <nav aria-label="Creator profile sections" className="sticky top-[76px] z-20 -mx-4 flex overflow-x-auto bg-[#151515]/95 px-4 backdrop-blur-xl [scrollbar-width:none] sm:-mx-7 sm:px-7">
            {tabs.map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                aria-current={tab === value ? 'page' : undefined}
                onClick={() => setTab(value)}
                className={`min-w-max border-b-2 px-4 py-3 text-xs font-bold transition ${
                  tab === value
                    ? 'border-pink text-white'
                    : 'border-transparent text-white/38 hover:text-white'
                }`}
              >
                {label} <span className="ml-1 text-[10px] text-white/25">{count}</span>
              </button>
            ))}
          </nav>
        </div>
      </section>

      {tab === 'posts' && (
        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[19rem_minmax(0,1fr)]">
          <aside className="space-y-4 lg:sticky lg:top-24">
            <ProfileSection title="Intro">
              <p className="text-sm leading-6 text-white/60">{creator.bio}</p>
              <div className="mt-4 space-y-3 border-t border-white/10 pt-4 text-xs text-white/48">
                <p className="flex items-center gap-2"><MapPin size={14} />{creator.location}</p>
                <p className="flex items-center gap-2"><Sparkles size={14} className="text-pink" />{creator.niche}</p>
                <p className="flex items-center gap-2"><Camera size={14} className="text-mint" />Starting at {creator.price}</p>
              </div>
            </ProfileSection>
            <ProfileSection title="Skills">
              {skills.length ? <div className="flex flex-wrap gap-2">
                {skills.map((skill) => <Badge key={skill} variant="outline">{skill}</Badge>)}
              </div> : <p className="text-xs text-white/35">No skills added yet.</p>}
            </ProfileSection>
          </aside>

          <ProfileSection
            title={channelPosts.length ? 'Channel posts' : 'Completed work'}
            action={<Badge variant={(channelPosts.length || work.length) ? 'mint' : 'outline'}>{channelPosts.length || work.length ? `${channelPosts.length || work.length} posts` : 'No posts'}</Badge>}
          >
            {(channelPosts.length || work.length) ? (
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {(channelPosts.length ? channelPosts : work).map((item) => {
                  const postMedia = item.media?.[0]
                  const image = resolveMediaUrl(postMedia?.thumbnailUrl || postMedia?.url) || item.image
                  const title = item.title || item.caption || 'Creator post'
                  return (
                  <article key={item.id} onClick={() => channelPosts.length && navigate(`/posts/${item.id}`)} className={`group relative aspect-square overflow-hidden rounded-lg bg-white/[.04] ${channelPosts.length ? 'cursor-pointer' : ''}`}>
                    <MarketplaceImage src={image} alt={title} className="size-full object-cover transition duration-500 group-hover:scale-[1.04]" />
                    <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/85 via-transparent to-transparent p-3 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                      <span className="min-w-0">
                        <strong className="block truncate text-sm">{title}</strong>
                        <small className="mt-1 block truncate text-[10px] text-white/55">{item.caption || item.description || item.category}</small>
                      </span>
                    </div>
                  </article>
                )})}
              </div>
            ) : (
              <div className="grid min-h-64 place-items-center rounded-xl border border-dashed border-white/12 text-center">
                <div>
                  <Camera className="mx-auto text-white/25" />
                  <h3 className="mt-3 text-sm font-bold">No completed work yet</h3>
                  <p className="mt-1 max-w-sm text-xs leading-5 text-white/35">Approved collaborations will appear here as profile posts.</p>
                </div>
              </div>
            )}
          </ProfileSection>
        </div>
      )}

      {tab === 'about' && (
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <ProfileSection title="About">
            <p className="text-sm leading-7 text-white/62">{creator.bio}</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <MiniMetric icon={Users} label="Audience" value={creator.followers} />
              <MiniMetric icon={TrendingUp} label="Engagement" value={creator.engagement} tone="mint" />
              <MiniMetric icon={Camera} label="Starting rate" value={creator.price} tone="pink" />
              <MiniMetric icon={HeartHandshake} label="Completed" value={String(work.length)} />
            </div>
          </ProfileSection>
          <ProfileSection title="Social channels">
            <div className="space-y-2">
              {creator.platforms.length ? creator.platforms.map((platform) => {
                const Icon = platformIcon(platform)
                return <div key={platform} className="flex items-center justify-between rounded-xl border border-white/10 p-3"><span className="flex items-center gap-2 text-sm font-semibold"><Icon size={15} className="text-pink" />{platform}</span><Badge variant="outline">Connected</Badge></div>
              }) : <p className="text-xs text-white/35">No social channel connected yet.</p>}
            </div>
          </ProfileSection>
          <ProfileSection title="Skills">
            {skills.length ? <div className="grid gap-2 sm:grid-cols-2">
              {skills.map((skill) => <div key={skill} className="flex items-center gap-2 rounded-xl border border-white/10 p-3 text-sm"><Sparkles size={14} className="text-pink" />{skill}</div>)}
            </div> : <p className="text-xs text-white/35">No skills added yet.</p>}
          </ProfileSection>
        </div>
      )}

      {tab === 'reviews' && (
        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[19rem_minmax(0,1fr)]">
          <ProfileSection title="Rating">
            <div className="text-center">
              <strong className="text-5xl tracking-[-.07em]">{rating.label}</strong>
              {rating.hasReviews && <div className="mt-3 flex justify-center gap-1 text-pink">{[1, 2, 3, 4, 5].map((value) => <Star key={value} size={15} fill="currentColor" />)}</div>}
              <p className="mt-3 text-xs leading-5 text-white/40">{rating.copy}</p>
            </div>
          </ProfileSection>
          <ProfileSection title="Business ratings">
            <div className="grid min-h-48 place-items-center text-center">
              <div><ShieldCheck className="mx-auto text-mint" /><h3 className="mt-3 text-sm font-bold">{rating.hasReviews ? `${creator.ratingCount} verified rating${creator.ratingCount === 1 ? '' : 's'}` : 'Not rated yet'}</h3><p className="mt-1 text-xs text-white/35">Only businesses from completed collaborations can leave a rating.</p></div>
            </div>
          </ProfileSection>
        </div>
      )}
      <MessageRequestDialog open={messageOpen} onClose={() => setMessageOpen(false)} recipientType="CREATOR" recipient={creator} />
    </main>
  )
}

export function BusinessProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState('posts')
  const [remoteBusiness, setRemoteBusiness] = useState(null)
  const [channelPosts, setChannelPosts] = useState([])
  const [socialSummary, setSocialSummary] = useState(null)
  const [messageOpen, setMessageOpen] = useState(false)
  const { account, saved, following, toggleSaved, toggleFollowing, openCollection } = useMarketplace()
  const { isAuthenticated, hasRole } = useAuth()

  useEffect(() => {
    let active = true
    if (id === 'my-business') return () => { active = false }
    marketplaceApi.getBusiness(id).then((profile) => {
      if (active) setRemoteBusiness({ ...publicBusinessView(profile), requestedId: id })
    }).catch(() => { if (active) setRemoteBusiness({ notFoundId: id }) })
    return () => { active = false }
  }, [id])

  useEffect(() => {
    let active = true
    if (id === 'my-business') return () => { active = false }
    Promise.all([
      contentApi.channel('business', id, { limit: 24 }).catch(() => ({ items: [] })),
      libraryApi.socialSummary('business', id).catch(() => null),
    ]).then(([posts, summary]) => {
      if (!active) return
      setChannelPosts(posts.items || [])
      setSocialSummary(summary)
    })
    return () => { active = false }
  }, [id])

  const localBusiness = id === 'my-business' ? {
    id: 'my-business', name: account.business.name, industry: account.business.industry,
    location: account.business.location, description: account.business.description,
    logo: mediaSource(account.business.logo), cover: mediaSource(account.business.cover),
    website: account.business.website, campaignItems: [], campaigns: 0,
  } : null
  const business = localBusiness || (remoteBusiness?.requestedId === id ? remoteBusiness : null)
  usePageSeo({
    enabled: Boolean(business),
    title: `${business?.name || 'Business'} · Business on VYRA`,
    description: business?.description || `Explore ${business?.name || 'this business'} and its creator partnership activity on VYRA.`,
    canonicalPath: `/businesses/${business?.slug || id}`,
    image: business?.cover || (business?.logo?.startsWith?.('http') ? business.logo : ''),
    type: 'profile',
    jsonLd: business ? {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: business.name,
      description: business.description || undefined,
      logo: business.logo?.startsWith?.('http') ? business.logo : undefined,
      image: business.cover || undefined,
      url: new URL(`/businesses/${business.slug || id}`, window.location.origin).toString(),
      sameAs: business.website ? [business.website] : [],
    } : null,
  })
  if (!business) return <EmptyState title={remoteBusiness?.notFoundId === id ? 'Business not found' : 'Loading business…'} />

  const key = `business:${business.id}`
  const isSaved = saved.includes(key)
  const isFollowing = following.includes(key)
  const campaignItems = business.campaignItems || []
  const tabs = [['posts', 'Posts', channelPosts.length], ['campaigns', 'Campaigns', campaignItems.length], ['about', 'About', 0]]

  return <main className="mx-auto max-w-[1180px] px-4 pb-14 pt-5 sm:px-5 lg:px-8">
    <section className="overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#151515] shadow-[0_22px_70px_rgba(0,0,0,.24)]">
      <div className="relative min-h-[11rem] bg-gradient-to-br from-mint/15 via-[#171717] to-pink/10 sm:min-h-[13rem]">{business.cover && <MarketplaceImage src={business.cover} alt={`${business.name} cover`} className="absolute inset-0 size-full object-cover" />}<div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-black/10" /></div>
      <div className="relative px-4 sm:px-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 items-end gap-4"><Avatar src={business.logo?.startsWith?.('http') ? business.logo : ''} fallback={business.logo || business.name} size="lg" className="-mt-10 size-20 border-4 border-[#151515] bg-mint text-black sm:-mt-11 sm:size-24" /><div className="min-w-0 pb-1"><div className="flex items-center gap-2"><h1 className="text-2xl font-black tracking-[-.045em] sm:text-3xl">{business.name}</h1>{business.verifiedPayer && <CheckCircle2 size={16} className="text-mint" />}</div><p className="mt-1 flex items-center gap-1 text-xs text-white/45"><MapPin size={12} />{business.location || 'Location not set'}</p></div></div>
          <div className="flex flex-wrap gap-2 pb-1">{hasRole('creator') && id !== 'my-business' && <Button size="sm" variant="outline" onClick={() => setMessageOpen(true)}><MessageSquare size={13}/>Message</Button>}{isAuthenticated && <Button size="sm" aria-pressed={isFollowing} variant={isFollowing ? 'mint' : 'outline'} onClick={() => { toggleFollowing(key); setSocialSummary((value) => value ? { ...value, followerCount: Math.max(0, value.followerCount + (isFollowing ? -1 : 1)), following: !isFollowing } : value) }}>{isFollowing ? <UserCheck size={13} /> : <UserPlus size={13} />}{isFollowing ? 'Following' : 'Follow'}</Button>}{isAuthenticated && <Button size="sm" aria-pressed={isSaved} variant={isSaved ? 'secondary' : 'outline'} onClick={() => { toggleSaved(key); if (!isSaved) openCollection(key) }}><Bookmark size={13} />{isSaved ? 'Saved' : 'Save'}</Button>}</div>
        </div>
        <p className="mt-3 max-w-3xl text-xs leading-5 text-white/60 sm:ml-28">{business.description}</p>
        <div className="mt-3 flex flex-wrap gap-2 sm:ml-28"><Badge variant="mint">{business.industry || 'Business'}</Badge>{business.website && <a href={business.website} target="_blank" rel="noreferrer"><Badge variant="outline"><Globe2 size={11} />Website</Badge></a>}</div>
        <dl className="mt-4 grid grid-cols-3 border-y border-white/10">{[['Followers', compactNumber(socialSummary?.followerCount || 0)], ['Posts', channelPosts.length], ['Campaigns', campaignItems.length]].map(([label, value], index) => <div key={label} className={`px-3 py-3 text-center ${index ? 'border-l border-white/10' : ''}`}><dd className="text-lg font-black">{value}</dd><dt className="mt-1 text-[9px] font-bold uppercase tracking-[.12em] text-white/30">{label}</dt></div>)}</dl>
        <nav className="sticky top-[76px] z-20 -mx-4 flex bg-[#151515]/95 px-4 backdrop-blur-xl sm:-mx-7 sm:px-7">{tabs.map(([value, label, count]) => <button key={value} onClick={() => setTab(value)} className={`border-b-2 px-4 py-3 text-xs font-bold ${tab === value ? 'border-mint text-white' : 'border-transparent text-white/38'}`}>{label}{count > 0 && <span className="ml-1 text-[10px] text-white/25">{count}</span>}</button>)}</nav>
      </div>
    </section>

    {tab === 'posts' && <section className="mt-5 rounded-[1.4rem] border border-white/10 bg-white/[.025] p-4"><div className="mb-4 flex items-center justify-between"><h2 className="text-base font-bold">Brand posts</h2><Badge variant={channelPosts.length ? 'mint' : 'outline'}>{channelPosts.length} posts</Badge></div>{channelPosts.length ? <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">{channelPosts.map((post) => { const media = post.media?.[0]; return <button key={post.id} onClick={() => navigate(`/posts/${post.id}`)} className="group relative aspect-square overflow-hidden rounded-lg bg-white/[.04] text-left"><MarketplaceImage src={resolveMediaUrl(media?.thumbnailUrl || media?.url) || business.cover} alt={post.title || ''} className="size-full object-cover transition duration-500 group-hover:scale-[1.04]" /><span className="absolute inset-0 flex items-end bg-gradient-to-t from-black/85 via-transparent to-transparent p-3"><strong className="line-clamp-2 text-sm">{post.title || post.caption}</strong></span></button> })}</div> : <EmptyState title="No brand posts yet" description="Published posts from this business channel will appear here." />}</section>}
    {tab === 'campaigns' && <section className="mt-5 rounded-[1.4rem] border border-white/10 bg-white/[.025] p-4">{campaignItems.length ? <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{campaignItems.map((campaign) => <CampaignCard key={campaign.id} campaign={campaign.title ? publicCampaignView(campaign, business) : campaign} />)}</div> : <EmptyState title="No public campaigns" />}</section>}
    {tab === 'about' && <div className="mt-5 grid gap-5 md:grid-cols-2"><ProfileSection title="About"><p className="text-sm leading-7 text-white/60">{business.description}</p></ProfileSection><ProfileSection title="Trust"><div className="space-y-3 text-xs text-white/45"><p className="flex items-start gap-2"><ShieldCheck size={14} className={business.verifiedPayer ? 'mt-0.5 shrink-0 text-mint' : 'mt-0.5 shrink-0 text-white/30'} /><span>{verifiedPayerCopy(business.verifiedPayer)}{business.verifiedPayerSince && <small className="mt-1 block text-[10px] text-white/30">Qualified since {new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(business.verifiedPayerSince))}</small>}</span></p><p className="flex items-center gap-2"><BriefcaseBusiness size={14} className="text-pink" />{campaignItems.length} public campaigns</p></div></ProfileSection></div>}
    <MessageRequestDialog open={messageOpen} onClose={() => setMessageOpen(false)} recipientType="BUSINESS" recipient={business} />
  </main>
}

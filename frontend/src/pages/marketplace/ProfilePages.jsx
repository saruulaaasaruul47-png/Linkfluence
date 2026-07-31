import {
  ArrowUpRight,
  Bookmark,
  BriefcaseBusiness,
  Camera,
  CheckCircle2,
  Clapperboard,
  Globe2,
  HeartHandshake,
  Link2,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { marketplaceApi } from '../../api/marketplace.api'
import { resolveMediaUrl } from '../../api/mediaUrl'
import { BusinessCard, CampaignCard } from '../../components/marketplace/cards'
import { SectionHeader } from '../../components/marketplace/MarketplaceLayout'
import { Avatar, Badge, Button, EmptyState, SpotlightCard } from '../../components/ui'
import { businesses, campaigns, creators, showcases } from '../../data/marketplace'
import { useMarketplace } from '../../context/marketplace-context'
import { useCollaboration } from '../../context/collaboration-context'
import { useAuth } from '../../context/auth-context'

const mediaSource = (value, fallback) => value?.startsWith('http') || value?.startsWith('data:') ? value : fallback

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
    avatar: resolveMediaUrl(profile.avatar) || creators[0].avatar,
    cover: resolveMediaUrl(profile.cover) || creators[0].cover,
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
    business: 'Published portfolio',
    category: item.category || profile.niche || 'Creator work',
    performance: 'Published work',
    image: resolveMediaUrl(item.thumbnailUrl || item.mediaUrl) || profile.cover,
  }))
}

function publicBusinessView(profile) {
  const initials = profile.name?.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  return {
    ...profile,
    logo: resolveMediaUrl(profile.logo) || initials || 'B',
    cover: resolveMediaUrl(profile.cover) || businesses[0].cover,
    verifiedPayer: profile.verified,
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
    platform: 'Creator marketplace',
    mode: 'Open',
    goal: campaign.category || 'Brand collaboration',
    niche: campaign.category || business.industry,
    deliverables: 'View brief for deliverables',
    applications: 0,
    budget,
    deadline: campaign.deadline
      ? new Intl.DateTimeFormat('en', { month: 'short', day: '2-digit' }).format(new Date(campaign.deadline))
      : 'Flexible',
  }
}

const creatorSkills = {
  'amara-b': ['Editorial styling', 'Short-form storytelling', 'Fashion direction', 'Brand-safe integrations'],
  'temuulen-film': ['Cinematic travel film', 'Location storytelling', 'Drone / field production', 'Documentary pacing'],
  'nara-eats': ['Recipe content', 'Food styling', 'Warm lifestyle voice', 'Community prompts'],
  'enkh-tech': ['Product explainers', 'Tutorial scripting', 'Tech education', 'Clear CTA writing'],
  'solongo-moves': ['Movement demos', 'Wellness routines', 'Recovery education', 'Friendly coaching tone'],
  'mika-play': ['Livestream segments', 'Gaming culture', 'Community hosting', 'Event diary content'],
}

const creatorProcess = [
  ['01', 'Creative fit check', 'Reviews the campaign, audience, product constraints and brand safety needs.'],
  ['02', 'Structured proposal', 'Suggests deliverables, timeline, content angle and production requirements.'],
  ['03', 'Production + review', 'Uploads drafts, handles revision rounds, then submits final deliverables.'],
]

function platformIcon(platform) {
  const value = platform.toLowerCase()
  if (value.includes('youtube')) return Clapperboard
  if (value.includes('instagram')) return Camera
  if (value.includes('tiktok')) return Clapperboard
  return Link2
}

function reviewSummary(creator, work) {
  const reviewCount = Number.isInteger(creator.ratingCount) ? creator.ratingCount : work.length
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

function WorkGalleryCard({ item }) {
  return (
    <SpotlightCard className="group relative min-h-60 overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#171717]">
      <img src={item.image} alt="" className="absolute inset-0 size-full object-cover opacity-72 transition duration-700 group-hover:scale-[1.04] group-hover:opacity-88" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
      <div className="absolute inset-x-3 bottom-3 rounded-2xl border border-white/15 bg-black/45 p-3 backdrop-blur-xl">
        <p className="truncate text-[9px] font-bold uppercase tracking-[.12em] text-white/42">{item.business} · {item.category}</p>
        <h3 className="mt-1 truncate text-lg font-black tracking-[-.045em]">{item.title}</h3>
        <p className="mt-1 truncate text-[11px] text-mint/80">{item.performance}</p>
      </div>
    </SpotlightCard>
  )
}

export function LegacyCreatorProfilePage() {
  const { id } = useParams()
  const {
    account,
    saved,
    following,
    toggleSaved,
    toggleFollowing,
    openCollection,
  } = useMarketplace()
  const { openOfferComposer } = useCollaboration()
  const localCreator = id === 'my-creator' ? {
    ...creators[0],
    id: 'my-creator',
    name: account.creator.name,
    username: account.creator.username,
    niche: account.creator.niche,
    location: account.creator.location,
    bio: account.creator.bio,
    price: account.creator.rate || 'Contact for rate',
    cover: mediaSource(account.creator.cover, creators[0].cover),
    avatar: mediaSource(account.creator.avatar, creators[0].avatar),
    platforms: [account.creator.instagram && 'Instagram', account.creator.facebook && 'Facebook', account.creator.tiktok && 'TikTok'].filter(Boolean),
    verified: false,
    rating: null,
  } : null
  const creator = localCreator || creators.find((item) => item.id === id)

  if (!creator) return <EmptyState title="Creator not found" />

  const key = `creator:${creator.id}`
  const work = showcases.filter((item) => item.creatorId === id)
  const rating = reviewSummary(creator, work)
  const skills = creatorSkills[creator.id] || ['Content strategy', 'Creator storytelling', 'Community trust', 'Campaign delivery']
  const isSaved = saved.includes(key)
  const isFollowing = following.includes(key)

  return (
    <main className="mx-auto max-w-[1500px] px-5 py-8 lg:px-8">
      <section className="grid overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/[.03] lg:grid-cols-[18rem_minmax(0,1fr)_18rem]">
        <div className="relative min-h-56 lg:min-h-full">
          <img src={creator.cover} alt="" className="absolute inset-0 size-full object-cover opacity-75" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
          <Avatar src={creator.avatar} alt={creator.name} size="xl" className="absolute bottom-4 left-4 ring-4 ring-[#0d0d0d]" />
        </div>

        <div className="min-w-0 p-5 lg:p-6">
          <div className="flex flex-wrap gap-2">
            <Badge variant="pink">{creator.niche}</Badge>
            {creator.verified && <Badge variant="mint"><CheckCircle2 size={10} /> Verified social</Badge>}
            <Badge variant="outline">{work.length ? `${work.length} work samples` : 'No completed work yet'}</Badge>
          </div>
          <h1 className="mt-4 truncate text-4xl font-black tracking-[-.065em] md:text-5xl">{creator.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/42">
            <span>{creator.username}</span>
            <span className="flex items-center gap-1"><MapPin size={13} />{creator.location}</span>
          </p>
          <p className="mt-4 line-clamp-3 max-w-4xl text-sm leading-6 text-white/62">{creator.bio}</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MiniMetric icon={Users} label="Audience" value={creator.followers} />
            <MiniMetric icon={TrendingUp} label="ER" value={creator.engagement} tone="mint" />
            <MiniMetric icon={Camera} label="Starts at" value={creator.price} tone="pink" />
            <MiniMetric icon={HeartHandshake} label="Completed" value={work.length ? work.length : '—'} />
          </div>
        </div>

        <aside className="border-t border-white/10 p-5 lg:border-l lg:border-t-0">
          <p className="text-[10px] font-bold uppercase tracking-[.13em] text-white/28">Business rating</p>
          <div className="mt-3">
            {rating.hasReviews ? (
              <strong className="flex items-center gap-1.5 text-3xl tracking-[-.055em]"><Star size={21} fill="currentColor" className="text-pink" />{rating.label}</strong>
            ) : (
              <strong className="block text-xl tracking-[-.035em]">{rating.label}</strong>
            )}
            <p className="mt-2 text-xs leading-5 text-white/38">{rating.copy}</p>
          </div>
          <div className="mt-5 grid gap-2">
            <Button variant="mint" onClick={() => openOfferComposer(creator)}><BriefcaseBusiness size={15} />Offer</Button>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant={isFollowing ? 'secondary' : 'outline'} onClick={() => toggleFollowing(key)}><UserPlus size={14} />{isFollowing ? 'Following' : 'Follow'}</Button>
              <Button size="sm" variant="outline" onClick={() => { toggleSaved(key); if (!isSaved) openCollection(key) }}><Bookmark size={14} />{isSaved ? 'Saved' : 'Save'}</Button>
            </div>
          </div>
        </aside>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-5">
          <ProfileSection title="Work gallery" action={<Badge variant={work.length ? 'mint' : 'outline'}>{work.length ? `${work.length} completed` : 'Empty'}</Badge>}>
            {work.length ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {work.map((item) => <WorkGalleryCard key={item.id} item={item} />)}
              </div>
            ) : (
              <div className="grid min-h-48 place-items-center rounded-[1.1rem] border border-dashed border-white/12 bg-black/10 p-6 text-center">
                <div>
                  <BriefcaseBusiness className="mx-auto text-white/35" size={22} />
                  <h3 className="mt-3 text-sm font-bold">Ажил хийсний дараа gallery энд орно</h3>
                  <p className="mt-1 max-w-md text-xs leading-5 text-white/38">Completed collaboration байхгүй үед random work харуулахгүй. Business ажлаа approve/review хийсний дараа л work sample, rating гарна.</p>
                </div>
              </div>
            )}
          </ProfileSection>

          <div className="grid gap-5 lg:grid-cols-2">
            <ProfileSection title="Skills">
              <div className="grid gap-2 sm:grid-cols-2">
                {skills.map((skill) => (
                  <div key={skill} className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/10 p-3 text-sm">
                    <Sparkles size={14} className="shrink-0 text-pink" />
                    <span className="truncate">{skill}</span>
                  </div>
                ))}
              </div>
            </ProfileSection>

            <ProfileSection title="Experience flow">
              <div className="space-y-2">
                {creatorProcess.map(([step, title, copy]) => (
                  <div key={step} className="flex gap-3 rounded-xl border border-white/10 bg-black/10 p-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-pink text-[10px] font-black text-black">{step}</span>
                    <span className="min-w-0">
                      <strong className="block truncate text-sm">{title}</strong>
                      <small className="line-clamp-2 text-xs leading-5 text-white/35">{copy}</small>
                    </span>
                  </div>
                ))}
              </div>
            </ProfileSection>
          </div>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-24 xl:h-max">
          <ProfileSection title="Social">
            <div className="space-y-2">
              {creator.platforms.map((platform) => {
                const Icon = platformIcon(platform)
                return (
                  <div key={platform} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/10 p-3">
                    <span className="flex min-w-0 items-center gap-2 text-sm font-semibold"><Icon size={15} className="shrink-0 text-pink" /><span className="truncate">{platform}</span></span>
                    <Badge variant="outline">Connected</Badge>
                  </div>
                )
              })}
            </div>
          </ProfileSection>

          <ProfileSection title="Trust">
            <div className="space-y-3 text-xs leading-5 text-white/42">
              <p className="flex gap-2"><ShieldCheck size={15} className="shrink-0 text-mint" />Rating-г зөвхөн completed collaboration-ийн business өгнө.</p>
              <p className="flex gap-2"><Globe2 size={15} className="shrink-0 text-pink" />Social metrics бол review биш, profile signal.</p>
              <p className="flex gap-2"><ArrowUpRight size={15} className="shrink-0 text-white/45" />Gallery зөвхөн бодит completed work харуулна.</p>
            </div>
          </ProfileSection>
        </aside>
      </div>
    </main>
  )
}

export function CreatorProfilePage() {
  const { id } = useParams()
  const [tab, setTab] = useState('posts')
  const [remoteCreator, setRemoteCreator] = useState(null)
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
  const fixtureCreator = creators.find((item) => item.id === id)

  useEffect(() => {
    let active = true
    if (id === 'my-creator' || fixtureCreator) {
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
  }, [fixtureCreator, id])

  const localCreator = id === 'my-creator' ? {
    ...creators[0],
    id: 'my-creator',
    name: account.creator.name,
    username: account.creator.username,
    niche: account.creator.niche,
    location: account.creator.location,
    bio: account.creator.bio,
    price: account.creator.rate || 'Contact for rate',
    cover: mediaSource(account.creator.cover, creators[0].cover),
    avatar: mediaSource(account.creator.avatar, creators[0].avatar),
    platforms: [account.creator.instagram && 'Instagram', account.creator.facebook && 'Facebook', account.creator.tiktok && 'TikTok'].filter(Boolean),
    verified: false,
    rating: null,
  } : null
  const creator = localCreator || fixtureCreator || (remoteCreator?.requestedId === id ? remoteCreator : null)

  if (!creator) {
    const loading = remoteCreator?.notFoundId !== id
    return <EmptyState title={loading ? 'Loading creator…' : 'Creator not found'} />
  }

  const key = `creator:${creator.id}`
  const work = remoteCreator?.requestedId === id
    ? publicPortfolioView(remoteCreator)
    : showcases.filter((item) => item.creatorId === id)
  const rating = reviewSummary(creator, work)
  const skills = remoteCreator?.skills?.length
    ? remoteCreator.skills
    : creatorSkills[creator.id] || ['Content strategy', 'Creator storytelling', 'Community trust', 'Campaign delivery']
  const isSaved = saved.includes(key)
  const isFollowing = following.includes(key)
  const tabs = [
    ['posts', 'Posts', work.length],
    ['about', 'About', skills.length],
    ['reviews', 'Reviews', rating.hasReviews ? work.length : 0],
  ]

  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-16 pt-5 sm:px-5 lg:px-8">
      <section className="overflow-hidden rounded-[1.7rem] border border-white/10 bg-[#151515] shadow-[0_28px_90px_rgba(0,0,0,.28)]">
        <div className="relative min-h-[17rem] sm:min-h-[21rem]">
          <img
            src={creator.cover}
            alt={`${creator.name} cover`}
            decoding="async"
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-black/10" />
        </div>

        <div className="relative px-4 pb-0 sm:px-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 items-end gap-4">
              <Avatar
                src={creator.avatar}
                alt={creator.name}
                size="xl"
                className="-mt-14 size-28 border-[5px] border-[#151515] bg-[#151515] shadow-xl sm:-mt-16 sm:size-32"
              />
              <div className="min-w-0 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="break-words text-3xl font-black tracking-[-.055em] sm:text-4xl">{creator.name}</h1>
                  {creator.verified && <CheckCircle2 size={19} className="shrink-0 text-mint" aria-label="Verified creator" />}
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/45">
                  <span>{creator.username}</span>
                  <span className="flex items-center gap-1"><MapPin size={13} />{creator.location}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pb-1">
              {hasRole('business') && <Button variant="pink" onClick={() => openOfferComposer(creator)}>
                <BriefcaseBusiness size={15} /> Work with me
              </Button>}
              {isAuthenticated && <Button variant={isFollowing ? 'mint' : 'outline'} onClick={() => toggleFollowing(key)}>
                <UserPlus size={15} />{isFollowing ? 'Following' : 'Follow'}
              </Button>}
              {isAuthenticated && <Button
                variant={isSaved ? 'secondary' : 'outline'}
                onClick={() => {
                  toggleSaved(key)
                  if (!isSaved) openCollection(key)
                }}
              >
                <Bookmark size={15} />{isSaved ? 'Saved' : 'Save'}
              </Button>}
            </div>
          </div>

          <p className="mt-5 max-w-3xl text-sm leading-6 text-white/65">{creator.bio}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="pink">{creator.niche}</Badge>
            {creator.platforms.map((platform) => <Badge key={platform} variant="outline">{platform}</Badge>)}
          </div>

          <dl className="mt-6 grid grid-cols-2 border-y border-white/10 sm:grid-cols-4">
            {[
              ['Audience', creator.followers],
              ['Engagement', creator.engagement],
              ['Completed work', String(work.length)],
              ['Rating', rating.label],
            ].map(([label, value], index) => (
              <div key={label} className={`px-3 py-4 text-center ${index % 2 ? 'border-l border-white/10' : ''} sm:border-l sm:first:border-l-0`}>
                <dd className="text-lg font-black tracking-[-.035em] sm:text-xl">{value}</dd>
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
                className={`min-w-max border-b-2 px-5 py-4 text-sm font-bold transition ${
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
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => <Badge key={skill} variant="outline">{skill}</Badge>)}
              </div>
            </ProfileSection>
          </aside>

          <ProfileSection
            title="Completed work"
            action={<Badge variant={work.length ? 'mint' : 'outline'}>{work.length ? `${work.length} posts` : 'No posts'}</Badge>}
          >
            {work.length ? (
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {work.map((item) => (
                  <article key={item.id} className="group relative aspect-square overflow-hidden rounded-lg bg-white/[.04]">
                    <img src={item.image} alt={item.title} loading="lazy" decoding="async" className="size-full object-cover transition duration-500 group-hover:scale-[1.04]" />
                    <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/85 via-transparent to-transparent p-3 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                      <span className="min-w-0">
                        <strong className="block truncate text-sm">{item.title}</strong>
                        <small className="mt-1 block truncate text-[10px] text-white/55">{item.business} · {item.performance}</small>
                      </span>
                    </div>
                  </article>
                ))}
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
            <div className="grid gap-2 sm:grid-cols-2">
              {skills.map((skill) => <div key={skill} className="flex items-center gap-2 rounded-xl border border-white/10 p-3 text-sm"><Sparkles size={14} className="text-pink" />{skill}</div>)}
            </div>
          </ProfileSection>
          <ProfileSection title="How collaboration works">
            <div className="space-y-2">
              {creatorProcess.map(([step, title, copy]) => (
                <div key={step} className="flex gap-3 rounded-xl border border-white/10 p-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-pink text-[10px] font-black text-black">{step}</span>
                  <span><strong className="block text-sm">{title}</strong><small className="mt-1 block text-xs leading-5 text-white/35">{copy}</small></span>
                </div>
              ))}
            </div>
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
          <ProfileSection title="Completed collaboration history">
            {work.length ? (
              <div className="space-y-2">
                {work.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-xl border border-white/10 p-3">
                    <img src={item.image} alt="" loading="lazy" decoding="async" className="size-14 rounded-lg object-cover" />
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-sm">{item.business}</strong>
                      <small className="mt-1 block truncate text-xs text-white/35">{item.title} · Completed collaboration</small>
                    </span>
                    <Badge variant="mint">Verified work</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid min-h-48 place-items-center text-center">
                <div><ShieldCheck className="mx-auto text-mint" /><h3 className="mt-3 text-sm font-bold">Not rated yet</h3><p className="mt-1 text-xs text-white/35">Only businesses from completed collaborations can leave a rating.</p></div>
              </div>
            )}
          </ProfileSection>
        </div>
      )}
    </main>
  )
}

export function BusinessProfilePage(){
  const {id}=useParams(); const {account,saved,following,toggleSaved,toggleFollowing,requestChannel}=useMarketplace(); const fixtureBusiness=businesses.find((item)=>item.id===id); const [remoteBusiness,setRemoteBusiness]=useState(null)
  useEffect(()=>{let active=true;if(id==='my-business'||fixtureBusiness)return()=>{active=false};marketplaceApi.getBusiness(id).then((profile)=>{if(active)setRemoteBusiness({...publicBusinessView(profile),requestedId:id})}).catch(()=>{if(active)setRemoteBusiness({notFoundId:id})});return()=>{active=false}},[fixtureBusiness,id])
  const localBusiness=id==='my-business'?{...businesses[0],id:'my-business',name:account.business.name,username:account.business.username,industry:account.business.industry,description:account.business.description,location:account.business.location,website:account.business.website,logo:account.business.logo || account.business.name?.split(' ').map((part)=>part[0]).join('').slice(0,2),cover:mediaSource(account.business.cover,businesses[0].cover),rating:null,campaigns:0,verifiedPayer:false}:null; const business=localBusiness||fixtureBusiness||(remoteBusiness?.requestedId===id?remoteBusiness:null); if(!business){const loading=remoteBusiness?.notFoundId!==id;return <EmptyState title={loading?'Loading business…':'Business not found'}/>} const key=`business:${business.id}`; const active=remoteBusiness?.requestedId===id?remoteBusiness.campaignItems.map((item)=>publicCampaignView(item,remoteBusiness)):campaigns.filter((item)=>item.businessId===id)
  return <main><section className="relative min-h-[26rem] overflow-hidden border-b border-white/10"><img src={business.cover} alt="" decoding="async" className="absolute inset-0 size-full object-cover opacity-40"/><div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-black/50 to-black/20"/><div className="relative mx-auto flex min-h-[26rem] max-w-[1500px] items-end px-5 pb-10 lg:px-8"><div className="flex w-full flex-col gap-5 sm:flex-row sm:items-end">{business.logo?.startsWith('data:')?<img src={business.logo} alt="" loading="lazy" decoding="async" className="size-24 rounded-3xl border border-white/20 object-cover"/>:<span className="grid size-24 place-items-center rounded-3xl border border-white/20 bg-black/65 text-3xl font-black backdrop-blur-xl">{business.logo}</span>}<div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2"><Badge variant="pink">{business.industry}</Badge>{business.verifiedPayer&&<Badge variant="mint"><CheckCircle2 size={10}/> Verified payer</Badge>}</div><h1 className="mt-3 break-words text-4xl font-extrabold tracking-[-.065em] md:text-5xl xl:text-6xl">{business.name}</h1><p className="mt-2 text-sm text-white/45">{business.username}</p></div><div className="flex flex-wrap gap-2"><Button variant={following.includes(key)?'secondary':'outline'} onClick={()=>toggleFollowing(key)}><UserPlus size={15}/>{following.includes(key)?'Following':'Follow'}</Button><Button variant="outline" onClick={()=>toggleSaved(key)}><Bookmark size={15}/>{saved.includes(key)?'Saved':'Save'}</Button><Button variant="pink" onClick={()=>requestChannel('Contacting a business')}><MessageCircle size={15}/> Pitch collaboration</Button></div></div></div></section><div className="mx-auto max-w-[1500px] px-5 py-14 lg:px-8"><div className="grid gap-12 lg:grid-cols-[1fr_20rem]"><div><p className="max-w-3xl text-xl leading-8 text-white/70">{business.description}</p><div className="mt-14"><SectionHeader eyebrow={`${active.length} opportunities`} title="Active campaigns"/>{active.length?<div className="grid gap-5 xl:grid-cols-2">{active.map((item)=><CampaignCard key={item.id} campaign={item}/>)}</div>:<EmptyState title="No active campaigns"/>}</div></div><aside className="h-max rounded-3xl border border-white/10 bg-white/[.035] p-5"><p className="eyebrow text-white/30">Business trust</p><div className="mt-5 space-y-5 text-sm"><div className="flex justify-between gap-3"><span className="text-white/40">Rating</span>{business.rating?<strong className="flex items-center gap-1"><Star size={13} fill="currentColor" className="text-pink"/>{business.rating}</strong>:<strong>Not rated yet</strong>}</div><div className="flex justify-between"><span className="text-white/40">Campaigns</span><strong>{business.campaigns}</strong></div><div className="flex items-center gap-2 border-t border-white/10 pt-5 text-white/45"><Globe2 size={14}/>{business.verifiedPayer?'Verified organization profile':'Verification pending'}</div></div></aside></div><div className="mt-20"><SectionHeader eyebrow="Similar partners" title="You may also like"/><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{businesses.filter((item)=>item.id!==id).slice(0,3).map((item)=><BusinessCard key={item.id} business={item}/>)}</div></div></div></main>
}

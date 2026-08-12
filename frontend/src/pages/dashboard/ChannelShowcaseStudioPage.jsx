import {
  Archive,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  FileEdit,
  FolderOpen,
  Image as ImageIcon,
  MapPin,
  Search,
  Send,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { businessApi } from '../../api/business.api'
import { contentApi } from '../../api/content.api'
import { creatorApi } from '../../api/creator.api'
import { resolveMediaUrl } from '../../api/mediaUrl'
import { showcaseApi } from '../../api/showcase.api'
import { MarketplaceImage } from '../../components/marketplace/MarketplaceImage'
import { DashboardHeader, DashboardPage, DashboardPanel } from '../../components/dashboard/DashboardUI'
import { Avatar, Badge, Button, EmptyState, Spinner, useToast } from '../../components/ui'
import { channelVisibilityCounts, isContentVisibleTo, mergeChannelContent } from '../../lib/channelShowcase'

const filters = [
  ['ALL', 'All'],
  ['PUBLIC', 'Public'],
  ['FOLLOWERS', 'Followers only'],
  ['DRAFT', 'Drafts'],
  ['STORY', 'Stories'],
]

const displayDate = (value) => value
  ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
  : 'Not published'

function firstMedia(post) {
  const media = post.media?.[0]
  return resolveMediaUrl(media?.thumbnailUrl || media?.url)
}

function contentKind(post) {
  if (post.type === 'STORY') return post.expired || post.status === 'ARCHIVED' ? 'Archived story' : 'Active story'
  if (post.type === 'BRAND_STORY') return 'Brand post'
  return 'Post'
}

function visibilityDetails(post) {
  if (post.status === 'DRAFT') return { label: 'Only you', copy: 'Not shown on your channel', tone: 'outline', icon: EyeOff }
  if (post.status === 'ARCHIVED' || post.expired) return { label: 'Archived', copy: 'Hidden from viewers', tone: 'outline', icon: EyeOff }
  if (post.visibility === 'FOLLOWERS') return { label: 'Followers', copy: post.type === 'STORY' ? 'Followers · up to 24h' : 'Signed-in followers', tone: 'pink', icon: Users }
  return { label: 'Public', copy: post.type === 'STORY' ? 'Everyone · up to 24h' : 'Everyone', tone: 'mint', icon: Eye }
}

function PreviewTile({ post, active, onClick }) {
  const image = firstMedia(post)
  const visibility = visibilityDetails(post)
  return <button type="button" onClick={onClick} className={`group relative aspect-square overflow-hidden rounded-lg border text-left transition ${active ? 'border-white/55' : 'border-white/[.07] hover:border-white/25'}`}>
    {image
      ? <MarketplaceImage src={image} alt={post.title || post.caption} className="size-full object-cover transition duration-500 group-hover:scale-[1.03]" />
      : <span className="grid size-full place-items-center bg-gradient-to-br from-pink/25 via-[#241820] to-mint/15 px-3 text-center text-[10px] font-bold leading-4 text-white/75">{post.caption}</span>}
    <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
    <span className="absolute left-2 top-2 rounded-full bg-black/65 px-2 py-1 text-[7px] font-bold uppercase tracking-[.08em] text-white/75 backdrop-blur">{visibility.label}</span>
    <span className="absolute inset-x-2 bottom-2 line-clamp-1 text-[9px] font-bold">{post.title || post.caption}</span>
  </button>
}

function ChannelPreview({ role, profile, posts, portfolioCount, selectedId, onSelect, audience, onAudienceChange }) {
  const [tab, setTab] = useState('HOME')
  const avatar = role === 'creator' ? profile.avatar || profile.avatarUrl : profile.logo || profile.logoUrl
  const cover = profile.cover || profile.coverUrl
  const name = profile.name || profile.channelName || profile.organization || 'Your channel'
  const handle = profile.username || (profile.slug ? `@${profile.slug}` : '')
  const description = role === 'creator' ? profile.bio : profile.description
  const categories = role === 'creator' ? profile.categories || [] : [profile.industry].filter(Boolean)
  const selected = posts.find((post) => post.id === selectedId)
  const visiblePosts = posts.filter((post) => isContentVisibleTo(post, audience))

  return <div className="overflow-hidden rounded-[1.2rem] border border-white/10 bg-[#111]">
    <div className="relative h-28 overflow-hidden bg-gradient-to-br from-pink/15 via-[#181818] to-mint/10">
      {cover && <MarketplaceImage src={resolveMediaUrl(cover)} alt="" className="absolute inset-0 size-full object-cover opacity-80" />}
      <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-black/10" />
    </div>
    <div className="relative px-4 pb-0">
      <div className="flex items-end gap-3">
        <Avatar src={resolveMediaUrl(avatar)} fallback={name} className="-mt-8 size-16 border-4 border-[#111]" />
        <div className="min-w-0 pb-1"><div className="flex items-center gap-1.5"><strong className="truncate text-base">{name}</strong>{profile.verificationStatus === 'VERIFIED' && <CheckCircle2 size={13} className="text-mint" />}</div><p className="mt-0.5 truncate text-[10px] text-white/35">{handle || `${role} channel`}</p></div>
      </div>
      <p className="mt-3 line-clamp-2 text-[10px] leading-4 text-white/50">{description || 'Add a channel description so viewers know what you create.'}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">{categories.slice(0, 3).map((item) => <Badge key={item} variant={role === 'creator' ? 'pink' : 'mint'}>{item}</Badge>)}</div>
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/10">
        <div className="flex">{[['HOME', 'Home'], ['CONTENT', 'Content'], ['ABOUT', 'About']].map(([value, label]) => <button type="button" key={value} onClick={() => setTab(value)} className={`border-b-2 px-3 py-2.5 text-[10px] font-bold ${tab === value ? `${role === 'creator' ? 'border-pink' : 'border-mint'} text-white` : 'border-transparent text-white/35'}`}>{label}</button>)}</div>
        <label className="flex items-center gap-1.5 pr-1 text-[9px] text-white/35"><Eye size={11}/><span className="sr-only">Preview audience</span><select value={audience} onChange={(event) => onAudienceChange(event.target.value)} className="max-w-28 rounded-lg border border-white/10 bg-[#181818] px-2 py-1.5 text-[9px] font-bold text-white/65 outline-none"><option value="PUBLIC">Public visitor</option><option value="FOLLOWER">Follower</option><option value="OWNER">Channel owner</option></select></label>
      </div>
    </div>
    <div className="min-h-52 border-t border-white/[.06] p-4">
      {tab === 'ABOUT' ? <div className="space-y-3 text-[10px] leading-4 text-white/50"><p>{description || 'No public description yet.'}</p><p className="flex items-center gap-2"><MapPin size={12} />{profile.location || 'Location not added'}</p><p className="flex items-center gap-2"><ImageIcon size={12} />{portfolioCount} public portfolio item{portfolioCount === 1 ? '' : 's'}</p></div>
        : visiblePosts.length ? <><div className="mb-3 flex items-center justify-between"><strong className="text-xs">{tab === 'HOME' ? 'Latest from this channel' : audience === 'OWNER' ? 'All channel content' : 'Visible content'}</strong><span className="text-[9px] text-white/30">{visiblePosts.length} visible to {audience === 'PUBLIC' ? 'public' : audience === 'FOLLOWER' ? 'followers' : 'you'}</span></div><div className="grid grid-cols-3 gap-1.5">{visiblePosts.slice(0, tab === 'HOME' ? 6 : 9).map((post) => <PreviewTile key={post.id} post={post} active={selected?.id === post.id} onClick={() => onSelect(post.id)} />)}</div></>
          : <div className="grid min-h-40 place-items-center text-center"><div><FolderOpen size={22} className="mx-auto text-white/20"/><p className="mt-3 text-xs font-bold">{audience === 'PUBLIC' ? 'Nothing public yet' : audience === 'FOLLOWER' ? 'Nothing visible to followers yet' : 'No channel content yet'}</p><p className="mt-1 text-[10px] text-white/35">Publish a post to fill this channel view.</p></div></div>}
    </div>
  </div>
}

function VisibilityRow({ icon: Icon, label, audience, value, tone = 'outline' }) {
  return <div className="flex items-center gap-3 rounded-xl border border-white/[.07] bg-black/15 p-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/[.045] text-white/45"><Icon size={14}/></span><span className="min-w-0 flex-1"><strong className="block truncate text-xs">{label}</strong><small className="mt-0.5 block truncate text-[9px] text-white/32">{audience}</small></span><Badge variant={tone}>{value}</Badge></div>
}

function ChannelContentRow({ post, role, busy, onVisibility, onStatus, onNavigate }) {
  const visibility = visibilityDetails(post)
  const canView = post.status === 'PUBLISHED' && !post.expired
  return <tr className="border-b border-white/[.06] text-xs last:border-0">
    <td className="px-2 py-3"><div className="flex min-w-0 items-center gap-3"><div className="size-14 shrink-0 overflow-hidden rounded-lg border border-white/[.08] bg-white/[.03]">{firstMedia(post) ? <MarketplaceImage src={firstMedia(post)} alt="" className="size-full object-cover"/> : <span className="grid size-full place-items-center bg-gradient-to-br from-pink/15 to-mint/10"><ImageIcon size={16} className="text-white/25"/></span>}</div><span className="min-w-0"><strong className="block truncate text-xs">{post.title || post.caption}</strong><small className="mt-1 block truncate text-[9px] text-white/30">{post.category || 'Uncategorized'} · {post.likeCount || 0} likes</small></span></div></td>
    <td className="px-2 py-3"><select aria-label={`Audience for ${post.title || post.caption}`} disabled={busy || post.status === 'ARCHIVED' || post.expired} value={post.visibility} onChange={(event) => onVisibility(post, event.target.value)} className="h-8 max-w-[8.5rem] rounded-lg border border-white/10 bg-[#171717] px-2 text-[9px] font-bold text-white/65 outline-none disabled:opacity-40"><option value="PUBLIC">Public</option><option value="FOLLOWERS">Followers only</option></select><small className="mt-1 block text-[8px] text-white/25">{visibility.copy}</small></td>
    <td className="px-2 py-3 text-[10px] text-white/48">{contentKind(post)}</td>
    <td className="px-2 py-3 text-[10px] text-white/40">{displayDate(post.publishedAt || post.updatedAt)}</td>
    <td className="px-2 py-3"><div className="flex justify-end gap-1.5"><button type="button" disabled={busy} onClick={() => canView ? onNavigate(`/posts/${post.id}`) : onNavigate(`/${role}/posts`)} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[9px] font-bold text-white/55 transition hover:border-white/25 hover:text-white disabled:opacity-40">{canView ? 'View' : 'Edit'}</button>{canView ? <button type="button" disabled={busy} onClick={() => onStatus(post, 'archive')} className="grid size-7 place-items-center rounded-lg border border-white/10 text-white/40 transition hover:text-white disabled:opacity-40" aria-label="Archive"><Archive size={11}/></button> : <button type="button" disabled={busy} onClick={() => onStatus(post, 'publish')} className="grid size-7 place-items-center rounded-lg border border-white/10 text-mint transition hover:bg-mint/10 disabled:opacity-40" aria-label="Publish"><Send size={11}/></button>}</div></td>
  </tr>
}

function ChannelContentCard({ post, role, busy, onVisibility, onStatus, onNavigate }) {
  const visibility = visibilityDetails(post)
  const canView = post.status === 'PUBLISHED' && !post.expired
  return <article className="rounded-xl border border-white/[.08] bg-black/15 p-3">
    <div className="flex min-w-0 gap-3"><div className="size-16 shrink-0 overflow-hidden rounded-lg border border-white/[.08] bg-white/[.03]">{firstMedia(post) ? <MarketplaceImage src={firstMedia(post)} alt="" className="size-full object-cover"/> : <span className="grid size-full place-items-center bg-gradient-to-br from-pink/15 to-mint/10"><ImageIcon size={17} className="text-white/25"/></span>}</div><div className="min-w-0 flex-1"><strong className="block truncate text-xs">{post.title || post.caption}</strong><p className="mt-1 truncate text-[9px] text-white/30">{contentKind(post)} · {displayDate(post.publishedAt || post.updatedAt)}</p><Badge variant={visibility.tone} className="mt-2">{visibility.label}</Badge></div></div>
    <div className="mt-3 flex items-center gap-2 border-t border-white/[.06] pt-3"><select aria-label={`Audience for ${post.title || post.caption}`} disabled={busy || post.status === 'ARCHIVED' || post.expired} value={post.visibility} onChange={(event) => onVisibility(post, event.target.value)} className="h-8 min-w-0 flex-1 rounded-lg border border-white/10 bg-[#171717] px-2 text-[9px] font-bold text-white/65 outline-none disabled:opacity-40"><option value="PUBLIC">Public</option><option value="FOLLOWERS">Followers only</option></select><button type="button" disabled={busy} onClick={() => canView ? onNavigate(`/posts/${post.id}`) : onNavigate(`/${role}/posts`)} className="h-8 rounded-lg border border-white/10 px-3 text-[9px] font-bold text-white/55 disabled:opacity-40">{canView ? 'View' : 'Edit'}</button>{canView ? <button type="button" disabled={busy} onClick={() => onStatus(post, 'archive')} className="grid size-8 place-items-center rounded-lg border border-white/10 text-white/45 disabled:opacity-40" aria-label="Archive"><Archive size={12}/></button> : <button type="button" disabled={busy} onClick={() => onStatus(post, 'publish')} className="grid size-8 place-items-center rounded-lg border border-white/10 text-mint disabled:opacity-40" aria-label="Publish"><Send size={12}/></button>}</div>
  </article>
}

export default function ChannelShowcaseStudioPage({ role }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [portfolio, setPortfolio] = useState([])
  const [caseStudies, setCaseStudies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [previewAudience, setPreviewAudience] = useState('PUBLIC')
  const [mutatingId, setMutatingId] = useState('')
  const authorType = role.toUpperCase()
  const accent = role === 'creator' ? 'pink' : 'mint'

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    const profileRequest = role === 'creator' ? creatorApi.getProfile() : businessApi.getProfile()
    return Promise.all([
      profileRequest,
      contentApi.mine({ authorType, limit: 30 }),
      contentApi.mine({ authorType, postType: 'STORY', limit: 30 }),
      role === 'creator' ? creatorApi.listPortfolio() : Promise.resolve({ items: [] }),
      role === 'creator' ? showcaseApi.mine() : Promise.resolve({ items: [] }),
    ]).then(([profileResult, contentResult, storyResult, portfolioResult, showcaseResult]) => {
      const uniquePosts = mergeChannelContent(contentResult.items || [], storyResult.items || [])
      setProfile(profileResult.profile || profileResult)
      setPosts(uniquePosts)
      setPortfolio(portfolioResult.items || portfolioResult.portfolio || [])
      setCaseStudies(showcaseResult.items || [])
      setSelectedId((current) => current || uniquePosts.find((item) => item.status === 'PUBLISHED' && !item.expired)?.id || '')
    }).catch((requestError) => setError(requestError.response?.data?.error?.message || requestError.response?.data?.message || 'Showcase Studio could not be loaded.'))
      .finally(() => setLoading(false))
  }, [authorType, role])

  useEffect(() => {
    let active = true
    queueMicrotask(() => { if (active) load() })
    return () => { active = false }
  }, [load])

  const counts = useMemo(() => channelVisibilityCounts(posts), [posts])

  const visibleRows = useMemo(() => posts.filter((post) => {
    if (filter === 'PUBLIC' && !(post.status === 'PUBLISHED' && !post.expired && post.visibility === 'PUBLIC')) return false
    if (filter === 'FOLLOWERS' && !(post.status === 'PUBLISHED' && !post.expired && post.visibility === 'FOLLOWERS')) return false
    if (filter === 'DRAFT' && post.status !== 'DRAFT') return false
    if (filter === 'STORY' && post.type !== 'STORY') return false
    const text = `${post.title || ''} ${post.caption || ''} ${post.category || ''}`.toLowerCase()
    return text.includes(query.trim().toLowerCase())
  }), [filter, posts, query])

  const profileId = profile?.id
  const publicProfilePath = profileId ? `/${role === 'creator' ? 'creators' : 'businesses'}/${profileId}` : ''
  const channelName = profile?.name || profile?.channelName || profile?.organization || `Your ${role} channel`

  const replacePost = (nextPost) => setPosts((current) => current.map((item) => item.id === nextPost.id ? nextPost : item))
  const changeVisibility = async (post, visibility) => {
    setMutatingId(post.id)
    try {
      const result = await contentApi.update(post.id, { visibility })
      replacePost(result.post || result)
      toast(`Audience changed to ${visibility === 'PUBLIC' ? 'Public' : 'Followers only'}.`, { type: 'success' })
    } catch (requestError) {
      toast(requestError.response?.data?.error?.message || 'Audience could not be updated.', { type: 'error' })
    } finally {
      setMutatingId('')
    }
  }

  const changeStatus = async (post, action) => {
    setMutatingId(post.id)
    try {
      const result = action === 'publish' ? await contentApi.publish(post.id) : await contentApi.archive(post.id)
      replacePost(result.post || result)
      toast(action === 'publish' ? 'Content is now visible on the channel.' : 'Content moved to the private archive.', { type: 'success' })
    } catch (requestError) {
      toast(requestError.response?.data?.error?.message || `Content could not be ${action === 'publish' ? 'published' : 'archived'}.`, { type: 'error' })
    } finally {
      setMutatingId('')
    }
  }

  return <DashboardPage>
    <DashboardHeader
      eyebrow={`${role} channel · public presence`}
      title="Showcase Studio"
      copy={`See exactly what appears on ${channelName}, who can see it, and what is still private.`}
      accent={accent}
      secondary={<Button variant="outline" size="sm" onClick={() => navigate(`/${role}/posts`)}><FileEdit size={13}/>Manage content</Button>}
      action={<Button variant={accent} size="sm" disabled={!publicProfilePath} onClick={() => navigate(publicProfilePath)}><ArrowUpRight size={13}/>View public channel</Button>}
    />

    {error && <div className="mb-5 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-xs text-red-200" role="alert"><p>{error}</p><button type="button" onClick={load} className="mt-2 font-bold underline">Try again</button></div>}
    {loading ? <div className="grid min-h-[28rem] place-items-center"><Spinner label="Loading Showcase Studio"/></div> : profile ? <>
      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[['Public content', counts.public, 'Everyone can see these', Eye], ['Followers only', counts.followers, 'Only signed-in followers', Users], ['Active stories', counts.stories, 'Visible for up to 24 hours', Clock3], ['Private drafts', counts.drafts, 'Only you can see these', EyeOff]].map(([label, value, copy, Icon]) => <article key={label} className="rounded-2xl border border-white/10 bg-white/[.028] p-4"><div className="flex items-start justify-between"><span><small className="text-[9px] font-bold uppercase tracking-[.12em] text-white/30">{label}</small><strong className="mt-3 block text-2xl">{value}</strong></span><span className={`grid size-8 place-items-center rounded-lg ${role === 'creator' ? 'bg-pink/10 text-pink' : 'bg-mint/10 text-mint'}`}><Icon size={14}/></span></div><p className="mt-2 text-[10px] text-white/32">{copy}</p></article>)}
      </section>

      <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,.55fr)]">
        <DashboardPanel title="Channel preview" eyebrow={`Viewing as ${previewAudience === 'PUBLIC' ? 'a public visitor' : previewAudience === 'FOLLOWER' ? 'a follower' : 'the channel owner'} · ${channelName}`} accent={accent} action={<Badge variant={accent}>{role} channel</Badge>}>
          <ChannelPreview role={role} profile={profile} posts={posts} portfolioCount={portfolio.filter((item) => item.status === 'PUBLISHED').length} selectedId={selectedId} onSelect={setSelectedId} audience={previewAudience} onAudienceChange={setPreviewAudience}/>
        </DashboardPanel>
        <div className="space-y-5">
          <DashboardPanel title="Who sees what" eyebrow="Visibility map" accent={accent}>
            <div className="space-y-2">
              <VisibilityRow icon={Eye} label="Channel profile" audience="Name, image, bio and public details" value="Everyone" tone="mint"/>
              <VisibilityRow icon={ImageIcon} label="Public content" audience="Posts visible in Showcase and your profile" value={counts.public} tone="mint"/>
              <VisibilityRow icon={Users} label="Follower content" audience="Visible after a viewer follows your channel" value={counts.followers} tone="pink"/>
              <VisibilityRow icon={EyeOff} label="Drafts and archive" audience="Never shown to public viewers" value={counts.drafts + posts.filter((post) => post.status === 'ARCHIVED' || post.expired).length}/>
              {role === 'creator' && <VisibilityRow icon={Sparkles} label="Portfolio & case studies" audience="Published work on your creator profile" value={portfolio.filter((item) => item.status === 'PUBLISHED').length + caseStudies.filter((item) => item.status === 'PUBLISHED').length} tone="mint"/>}
            </div>
          </DashboardPanel>
          <DashboardPanel title="Channel setup" eyebrow="Public details" accent={accent}>
            <div className="space-y-2 text-[10px] text-white/42"><p className="flex justify-between gap-3"><span>Channel</span><strong className="max-w-44 truncate text-white/75">{channelName}</strong></p><p className="flex justify-between gap-3"><span>Handle</span><strong className="max-w-44 truncate text-white/75">{profile.username || `@${profile.slug}`}</strong></p><p className="flex justify-between gap-3"><span>Status</span><strong className="text-mint">Public</strong></p></div>
            <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => navigate(`/${role}/settings`)}><Settings size={13}/>Edit channel details</Button>
          </DashboardPanel>
        </div>
      </section>

      <DashboardPanel title="Channel content" eyebrow={`${visibleRows.length} of ${posts.length} items`} accent={accent} className="mt-5" action={<Button size="sm" variant={accent} onClick={() => navigate(`/${role}/posts`)}><FileEdit size={13}/>Create or edit</Button>}>
        <div className="mb-4 flex flex-col gap-3 border-b border-white/[.08] pb-4 lg:flex-row lg:items-center">
          <label className="relative min-w-0 flex-1"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this channel's content" className="h-10 w-full rounded-xl border border-white/10 bg-black/20 pl-9 pr-3 text-xs outline-none transition placeholder:text-white/25 focus:border-white/25"/></label>
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-white/10 bg-black/20 p-1 [scrollbar-width:none]">{filters.map(([value, label]) => <button type="button" key={value} onClick={() => setFilter(value)} className={`min-w-max rounded-lg px-3 py-2 text-[9px] font-bold transition ${filter === value ? 'bg-white text-black' : 'text-white/38 hover:bg-white/[.05] hover:text-white'}`}>{label}</button>)}</div>
        </div>
        {visibleRows.length ? <><div className="grid gap-2 lg:hidden">{visibleRows.map((post) => <ChannelContentCard key={post.id} post={post} role={role} busy={mutatingId === post.id} onVisibility={changeVisibility} onStatus={changeStatus} onNavigate={navigate}/>)}</div><div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[820px] table-fixed text-left"><thead><tr className="border-b border-white/10 text-[9px] uppercase tracking-[.1em] text-white/25"><th className="w-[37%] px-2 pb-3 font-semibold">Content</th><th className="w-[19%] px-2 pb-3 font-semibold">Audience</th><th className="w-[13%] px-2 pb-3 font-semibold">Type</th><th className="w-[13%] px-2 pb-3 font-semibold">Date</th><th className="w-[18%] px-2 pb-3 text-right font-semibold">Actions</th></tr></thead><tbody>{visibleRows.map((post) => <ChannelContentRow key={post.id} post={post} role={role} busy={mutatingId === post.id} onVisibility={changeVisibility} onStatus={changeStatus} onNavigate={navigate}/>)}</tbody></table></div></> : <EmptyState title="No matching channel content" description="Change the filter or publish something from Posts & stories." action="Open content manager" onAction={() => navigate(`/${role}/posts`)}/>} 
      </DashboardPanel>
    </> : <EmptyState title={`${role === 'creator' ? 'Creator' : 'Business'} channel is unavailable`} description="Complete your channel setup before opening Showcase Studio." action="Open channel settings" onAction={() => navigate(`/${role}/settings`)}/>} 
  </DashboardPage>
}

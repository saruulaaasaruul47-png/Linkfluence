import { useEffect, useState } from 'react'
import { ArrowUpRight, Bookmark, CheckCircle2, Edit3, FolderPlus, Heart, Layers3, Plus, Search, Share2, Trash2, UserCheck, X } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHero, SectionHeader } from '../../components/marketplace/MarketplaceLayout'
import { CollectionCard, ShowcaseCard } from '../../components/marketplace/cards'
import { MarketplaceItem } from '../../components/marketplace/MarketplaceItem'
import { ShowcaseFeed } from '../../components/marketplace/ShowcaseFeed'
import { Button, Dialog, EmptyState, Input, Select, Textarea, useToast } from '../../components/ui'
import { useMarketplace } from '../../context/marketplace-context'
import { contentApi } from '../../api/content.api'
import { marketplaceApi } from '../../api/marketplace.api'
import { showcaseApi } from '../../api/showcase.api'
import { toBusinessCard, toCreatorCard, toShowcaseCard } from '../../api/marketplace.mapper'
import { useAuth } from '../../context/auth-context'
import { Avatar } from '../../components/ui'
import { safetyApi } from '../../api/safety.api'
import { usePageSeo } from '../../hooks/usePageSeo'

export function ShowcasePage() {
  return <ShowcaseFeed />
}

export function ShowcaseDetailPage() {
  const { id }=useParams()
  const navigate=useNavigate()
  const { saved,toggleSaved,share,openCollection,markViewed }=useMarketplace()
  const [item,setItem]=useState(null)
  const [notFound,setNotFound]=useState(false)
  const [related,setRelated]=useState([])
  useEffect(()=>{
    let active=true
    showcaseApi.get(id).then((result)=>{ if(active) setItem(toShowcaseCard(result.post)) }).catch(()=>{ if(active) setNotFound(true) })
    return ()=>{active=false}
  },[id])
  useEffect(()=>{
    let active=true
    marketplaceApi.discover({limit:4}).then((result)=>{ if(active) setRelated((result.showcase||[]).filter((entry)=>entry.id!==id).map(toShowcaseCard).slice(0,3)) }).catch(()=>{})
    return ()=>{active=false}
  },[id])
  usePageSeo({
    enabled: Boolean(item),
    title: `${item?.title || 'Showcase'} · VYRA Showcase`,
    description: item?.description || `Explore ${item?.title || 'this completed creator collaboration'} on VYRA.`,
    canonicalPath: `/showcase/${id}`,
    image: item?.image,
    type: 'article',
    jsonLd: item ? {
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      name: item.title,
      description: item.description || undefined,
      image: item.image || undefined,
      datePublished: item.publishedAt || undefined,
      url: new URL(`/showcase/${id}`, window.location.origin).toString(),
      creator: item.creator ? { '@type': 'Person', name: item.creator } : undefined,
    } : null,
  })
  if(notFound)return <main className="mx-auto max-w-[1500px] px-5 py-28"><EmptyState title="Showcase not found"/></main>
  if(!item)return <main className="mx-auto grid min-h-[60vh] max-w-[1500px] place-items-center px-5 py-28"><p className="text-sm text-white/40">Loading…</p></main>
  const key=`showcase:${item.id}`
  const isSaved=saved.includes(key)
  const metrics=[
    ...Object.entries(item.statistics||{}).map(([label,value])=>({ label,value })),
    ...(item.likes!==undefined?[{ label:'Likes',value:item.likes.toLocaleString() }]:[]),
    ...(item.saves!==undefined?[{ label:'Saves',value:item.saves.toLocaleString() }]:[]),
    ...(item.shares!==undefined?[{ label:'Shares',value:item.shares.toLocaleString() }]:[]),
  ]
  return <main onMouseEnter={()=>markViewed(key)}><section className="mx-auto grid max-w-[1500px] gap-8 px-5 pb-16 pt-12 lg:grid-cols-[1.35fr_.65fr] lg:px-8 lg:pt-20"><div className="overflow-hidden rounded-[2rem] border border-white/10"><img src={item.image} alt={item.title} loading="lazy" decoding="async" className="max-h-[78vh] w-full object-cover"/></div><aside className="flex flex-col justify-between py-3"><div><p className="eyebrow text-white/35">{item.category} · Completed campaign</p><h1 className="mt-5 break-words text-4xl font-extrabold uppercase leading-[.86] tracking-[-.07em] md:text-5xl xl:text-6xl">{item.title}</h1><p className="mt-7 text-sm leading-6 text-white/50">A creator-led collaboration built around a clear cultural insight, distinctive execution and measurable audience response.</p><div className="mt-8 border-y border-white/10 py-5"><button onClick={()=>navigate(`/creators/${item.creatorId}`)} className="flex w-full items-center justify-between py-2 text-left"><span><small className="block uppercase tracking-[.12em] text-white/30">Creator</small><strong className="mt-1 block">{item.creator}</strong></span><ArrowUpRight size={16}/></button><div className="flex items-center justify-between py-2"><span><small className="block uppercase tracking-[.12em] text-white/30">Business</small><strong className="mt-1 block">{item.business}</strong></span></div></div><div className="mt-6 rounded-2xl bg-mint-soft p-5 text-black"><small className="uppercase tracking-[.12em] opacity-50">Performance summary</small><strong className="mt-2 block text-xl">{item.performance}</strong></div>{metrics.length>0&&<dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">{metrics.map(({ label,value })=><div key={label} className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><dt className="text-[10px] uppercase tracking-[.12em] text-white/30">{label}</dt><dd className="mt-2 text-lg font-bold">{value}</dd></div>)}</dl>}</div><div className="mt-8 grid grid-cols-2 gap-2"><Button aria-pressed={isSaved} variant={isSaved?'pink':'outline'} onClick={()=>toggleSaved(key)}><Bookmark size={15}/>{isSaved?'Saved':'Save'}</Button><Button variant="outline" onClick={()=>share(item.title,window.location.href,key)}><Share2 size={15}/>Share</Button><Button className="col-span-2" variant="secondary" onClick={()=>openCollection(key)}><Layers3 size={15}/>Add to collection</Button></div></aside></section>{related.length>0&&<section className="mx-auto max-w-[1500px] border-t border-white/10 px-5 py-16 lg:px-8"><SectionHeader eyebrow="More standout work" title="Continue exploring"/><div className="columns-1 gap-5 md:columns-2 xl:columns-3">{related.map((value)=><ShowcaseCard key={value.id} item={value}/>)}</div></section>}</main>
}

export function ContentPostPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { toast } = useToast()
  const { saved, following, toggleSaved, toggleFollowing, openCollection, markViewed } = useMarketplace()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reportOpen, setReportOpen] = useState(false)
  const [report, setReport] = useState({ reason: 'SPAM', details: '' })

  useEffect(() => {
    let active = true
    queueMicrotask(() => {
      if (!active) return
      setLoading(true)
      setError('')
      contentApi.get(id).then((result) => {
        if (active) setPost(result.post)
      }).catch((requestError) => {
        if (active) setError(requestError.response?.data?.error?.message || requestError.response?.data?.message || 'This post could not be loaded.')
      }).finally(() => { if (active) setLoading(false) })
    })
    return () => { active = false }
  }, [id])

  if (loading) return <main className="grid min-h-[65vh] place-items-center"><p role="status" className="text-sm text-white/45">Loading post…</p></main>
  if (error || !post) return <main className="mx-auto max-w-[1500px] px-5 py-28"><EmptyState title="Post unavailable" description={error} onAction={() => navigate('/showcase')} action="Back to showcase" /></main>

  const media = post.media?.[0]
  const saveKey = post.saveKey || `content:${post.id}`
  const ownerKey = post.ownerKey
  const isSaved = saved.includes(saveKey)
  const isFollowing = following.includes(ownerKey)
  const profilePath = post.author.type === 'BUSINESS' ? `/businesses/${post.author.id}` : `/creators/${post.author.id}`
  const requireLogin = (action) => {
    if (!isAuthenticated) navigate('/login', { state: { from: `/posts/${id}` } })
    else action()
  }
  const toggleLike = () => {
    const liked = post.liked
    setPost((value) => ({ ...value, liked: !liked, likeCount: Math.max(0, value.likeCount + (liked ? -1 : 1)) }))
    const request = liked ? contentApi.unlike(id) : contentApi.like(id)
    request.then((result) => setPost(result.post)).catch(() => setPost((value) => ({ ...value, liked, likeCount: Math.max(0, value.likeCount + (liked ? 1 : -1)) })))
  }
  const channelType = post.author.type.toLowerCase()
  const reportPost = async (event) => {
    event.preventDefault()
    try {
      await safetyApi.report({ targetType: 'content', targetId: post.id, reason: report.reason, details: report.details.trim() || undefined, evidence: [] })
      setReportOpen(false)
      toast('Report submitted for review.', { type: 'success' })
    } catch (requestError) {
      toast(requestError.response?.data?.error?.message || requestError.response?.data?.message || 'Report could not be submitted.', { type: 'error' })
    }
  }

  return <main onMouseEnter={() => isAuthenticated && markViewed(saveKey)} className="mx-auto max-w-[1320px] px-4 py-8 lg:px-8 lg:py-12">
    <div className="grid overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[.025] lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,.85fr)]">
      <div className="grid min-h-[32rem] place-items-center bg-black/45">
        {media?.mediaType === 'VIDEO'
          ? <video src={media.url} controls playsInline preload="metadata" className="max-h-[78vh] w-full object-contain" />
          : <img src={media?.url || post.author.coverUrl} alt={media?.altText || post.title || post.caption} loading="lazy" decoding="async" className="max-h-[78vh] w-full object-contain" />}
      </div>
      <aside className="flex flex-col p-5 sm:p-7">
        <button type="button" onClick={() => navigate(profilePath)} className="flex items-center gap-3 text-left">
          <Avatar src={post.author.avatarUrl} fallback={post.author.name} size="sm" />
          <span className="min-w-0"><strong className="flex items-center gap-1.5 text-sm"><span className="truncate">{post.author.name}</span>{post.author.verified && <CheckCircle2 size={13} className="text-mint" />}</strong><small className="mt-1 block text-[10px] text-white/35">{post.author.type === 'BUSINESS' ? 'Business channel' : 'Creator channel'}</small></span>
        </button>
        <p className="mt-7 text-[10px] font-bold uppercase tracking-[.14em] text-pink">{post.category || post.type.replaceAll('_', ' ')}</p>
        {post.title && <h1 className="mt-3 text-3xl font-bold tracking-[-.045em]">{post.title}</h1>}
        <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-white/60">{post.caption}</p>
        {post.paidPartnership && <p className="mt-4 rounded-xl border border-mint/20 bg-mint/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[.1em] text-mint">Paid partnership</p>}
        <div className="mt-auto grid grid-cols-2 gap-2 pt-8">
          <Button aria-label={post.liked ? 'Unlike post' : 'Like post'} aria-pressed={post.liked} variant={post.liked ? 'pink' : 'outline'} onClick={() => requireLogin(toggleLike)}><Heart size={15} fill={post.liked ? 'currentColor' : 'none'} />{post.likeCount || 0}</Button>
          <Button aria-pressed={isSaved} variant={isSaved ? 'mint' : 'outline'} onClick={() => requireLogin(() => toggleSaved(saveKey))}><Bookmark size={15} fill={isSaved ? 'currentColor' : 'none'} />{isSaved ? 'Saved' : 'Save'}</Button>
          <Button aria-pressed={isFollowing} variant="outline" onClick={() => requireLogin(() => toggleFollowing(ownerKey))}>{isFollowing ? 'Unfollow' : 'Follow'}</Button>
          <Button variant="outline" onClick={() => requireLogin(() => openCollection(saveKey))}><Layers3 size={15} />Collection</Button>
        </div>
        {isAuthenticated && <div className="mt-3 flex justify-end gap-3 text-[10px] text-white/35"><button onClick={() => safetyApi.mute(channelType, post.author.id).then(() => { toast('Channel muted.', { type: 'success' }); navigate('/showcase') })}>Mute</button><button onClick={() => setReportOpen(true)}>Report</button><button className="text-red-300" onClick={() => { if (window.confirm(`Block ${post.author.name}? Their posts will be hidden.`)) safetyApi.block(channelType, post.author.id).then(() => { toast('Channel blocked.', { type: 'success' }); navigate('/showcase') }) }}>Block</button></div>}
      </aside>
    </div>
    <Dialog dark open={reportOpen} onClose={() => setReportOpen(false)} title="Report this post" description="Your report is private and will be reviewed by the trust team."><form onSubmit={reportPost} className="space-y-4"><Select label="Reason" value={report.reason} onChange={(event) => setReport((value) => ({ ...value, reason: event.target.value }))} options={[{ label: 'Spam', value: 'SPAM' }, { label: 'Harassment', value: 'HARASSMENT' }, { label: 'Impersonation', value: 'IMPERSONATION' }, { label: 'Copyright', value: 'COPYRIGHT' }, { label: 'Unsafe content', value: 'UNSAFE_CONTENT' }, { label: 'Other', value: 'OTHER' }]} /><Textarea label="Details (optional)" value={report.details} onChange={(event) => setReport((value) => ({ ...value, details: event.target.value }))} /><div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setReportOpen(false)}>Cancel</Button><Button type="submit" variant="pink">Submit report</Button></div></form></Dialog>
  </main>
}

export function CollectionsPage() { const { collections, createEmptyCollection } = useMarketplace(); return <main><PageHero eyebrow="Curated references" title="COLLECT WHAT" script="inspires you." copy="Keep creators, businesses and standout work together for the moments that matter."><Button variant="pink" size="lg" onClick={createEmptyCollection}><FolderPlus size={16} /> New collection</Button></PageHero><div className="mx-auto max-w-[1500px] px-5 py-14 lg:px-8">{collections.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">{collections.map((item) => <CollectionCard key={item.id} collection={item} />)}</div> : <EmptyState title="No collections yet" onAction={createEmptyCollection} />}</div></main> }

export function CollectionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { collections, updateCollection, deleteCollection, removeCollectionItem, share } = useMarketplace()
  const collection = collections.find((item) => item.id === id)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [draft, setDraft] = useState({ name: '', description: '', cover: '', visibility: 'private' })
  if (!collection) return <main className="mx-auto max-w-[1500px] px-5 py-28"><EmptyState title="Collection not found" /></main>
  const openEdit = () => {
    setDraft({ name: collection.name, description: collection.description, cover: collection.cover, visibility: collection.visibility })
    setEditOpen(true)
  }
  const saveEdit = (event) => {
    event.preventDefault()
    if (!draft.name.trim()) return
    updateCollection(collection.id, { ...draft, name: draft.name.trim(), description: draft.description.trim() })
    setEditOpen(false)
    toast('Collection updated.', { type: 'success' })
  }
  const confirmDelete = () => {
    deleteCollection(collection.id)
    setDeleteOpen(false)
    toast('Collection deleted.', { type: 'success' })
    navigate('/collections', { replace: true })
  }
  return <main><section className="relative min-h-[26rem] overflow-hidden border-b border-white/10"><img src={collection.cover} alt="" decoding="async" className="absolute inset-0 size-full object-cover opacity-30" /><div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/30" /><div className="relative mx-auto max-w-[1500px] px-5 py-16 lg:px-8"><p className="eyebrow text-white/35">Collection · {collection.items.length} items · {collection.visibility}</p><h1 className="mt-5 max-w-4xl break-words text-4xl font-extrabold uppercase leading-[.86] tracking-[-.07em] md:text-5xl xl:text-6xl">{collection.name}</h1><p className="mt-6 max-w-xl text-sm leading-6 text-white/50">{collection.description}</p><div className="mt-8 flex flex-wrap gap-2"><Button variant="pink" onClick={() => navigate('/saved')}><Plus size={15} />Add from saved</Button><Button variant="outline" onClick={openEdit}><Edit3 size={15} />Edit</Button><Button variant="outline" onClick={() => share(collection.name, window.location.href)}><Share2 size={15} />Share</Button><Button variant="ghost" onClick={() => setDeleteOpen(true)}><Trash2 size={15} />Delete</Button></div></div></section><div className="mx-auto max-w-[1500px] px-5 py-14 lg:px-8">{collection.items.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{collection.items.map((key) => <div key={key} className="relative"><MarketplaceItem itemKey={key} /><button type="button" aria-label="Remove from collection" onClick={() => { removeCollectionItem(collection.id, key); toast('Removed from collection.', { type: 'success' }) }} className="absolute right-3 top-3 z-20 grid size-9 place-items-center rounded-full border border-white/15 bg-black/70 text-white transition hover:bg-pink hover:text-black"><X size={14} /></button></div>)}</div> : <EmptyState title="This collection is empty" description="Open Saved items, then choose Add to collection on a creator, business or showcase." onAction={() => navigate('/saved')} action="Browse saved items" />}</div>
    <Dialog dark open={editOpen} onClose={() => setEditOpen(false)} title="Edit collection" description="Update how this collection appears and who can access it."><form onSubmit={saveEdit} className="space-y-4"><Input label="Collection name" value={draft.name} onChange={(event) => setDraft((value) => ({ ...value, name: event.target.value }))} required /><Textarea label="Description" value={draft.description} onChange={(event) => setDraft((value) => ({ ...value, description: event.target.value }))} /><Input label="Cover image URL" type="url" value={draft.cover} onChange={(event) => setDraft((value) => ({ ...value, cover: event.target.value }))} /><Select label="Visibility" value={draft.visibility} onChange={(event) => setDraft((value) => ({ ...value, visibility: event.target.value }))} options={[{ label: 'Private — only you', value: 'private' }, { label: 'Shareable — anyone with link', value: 'shareable' }, { label: 'Public — visible on profile', value: 'public' }]} /><div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button><Button type="submit" variant="pink">Save changes</Button></div></form></Dialog>
    <Dialog dark open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete this collection?" description="The collection will be removed from this browser. Saved items themselves will stay saved."><div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button><Button variant="pink" onClick={confirmDelete}><Trash2 size={15} />Delete collection</Button></div></Dialog>
  </main>
}

export function SavedPage() {
  const { saved, collections, openCollection, createEmptyCollection } = useMarketplace()
  return <main>
    <PageHero eyebrow="Your private library" title="SAVED FOR" script="later." copy="Everything you bookmarked, with optional folders when you want more structure.">
      <Button variant="outline" onClick={createEmptyCollection}><FolderPlus size={14} />New folder</Button>
    </PageHero>
    <div className="mx-auto max-w-[1500px] space-y-10 px-5 py-10 lg:px-8">
      {collections.length > 0 && <section><SectionHeader eyebrow={`${collections.length} folders`} title="Your folders" /><div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">{collections.map((item) => <CollectionCard key={item.id} collection={item} />)}</div></section>}
      <section><SectionHeader eyebrow={`${saved.length} saved items`} title="All saves" />{saved.length ? <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">{saved.map((key) => <div key={key} className="space-y-2"><MarketplaceItem itemKey={key} compact /><Button size="sm" variant="outline" className="w-full" onClick={() => openCollection(key)}><FolderPlus size={13} />Add to folder</Button></div>)}</div> : <EmptyState title="Nothing saved yet" description="Use the bookmark action on creators, businesses and showcase work." />}</section>
    </div>
  </main>
}

export function FollowingPage() {
  const navigate = useNavigate()
  const { following, toggleFollowing } = useMarketplace()
  const [query, setQuery] = useState('')
  const [channels, setChannels] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.allSettled(following.map(async (key) => {
      const [type, id] = key.split(':')
      if (type === 'creator') return { ...toCreatorCard(await marketplaceApi.getCreator(id)), key, type }
      if (type === 'business') return { ...toBusinessCard(await marketplaceApi.getBusiness(id)), key, type }
      return null
    })).then((results) => {
      if (!active) return
      setChannels(results.flatMap((result) => result.status === 'fulfilled' && result.value ? [result.value] : []))
      setLoading(false)
    })
    return () => { active = false }
  }, [following])

  const search = query.trim().toLowerCase()
  const filtered = channels.filter((channel) => !search || [channel.name, channel.username, channel.niche, channel.industry, channel.location]
    .some((value) => String(value || '').toLowerCase().includes(search)))

  return <main className="grid min-h-[calc(100svh-76px)] place-items-start bg-[radial-gradient(circle_at_50%_5%,rgba(255,118,189,.07),transparent_34rem)] px-4 py-8 sm:py-12">
    <section className="mx-auto w-full max-w-2xl overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#191919] shadow-[0_28px_90px_rgba(0,0,0,.45)]">
      <header className="relative flex min-h-14 items-center justify-center border-b border-white/[.08] px-14">
        <h1 className="text-sm font-bold">Following</h1>
        <span className="ml-2 rounded-full bg-white/[.07] px-2 py-0.5 text-[9px] font-bold text-white/40">{following.length}</span>
        <button type="button" aria-label="Close following" onClick={() => navigate(-1)} className="absolute right-3 grid size-9 place-items-center rounded-full text-white/55 transition hover:bg-white/[.07] hover:text-white"><X size={18} /></button>
      </header>

      <div className="border-b border-white/[.07] p-3">
        <label className="relative block">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search followed channels" className="min-h-10 w-full rounded-xl border border-white/[.06] bg-white/[.06] pl-10 pr-4 text-xs text-white outline-none transition placeholder:text-white/30 focus:border-pink/35 focus:bg-white/[.08]" />
        </label>
      </div>

      <div className="max-h-[min(68svh,38rem)] overflow-y-auto p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {loading && <div className="space-y-1">{Array.from({ length: 5 }, (_, index) => <div key={index} className="flex animate-pulse items-center gap-3 rounded-xl px-3 py-2.5"><span className="size-11 rounded-full bg-white/[.07]" /><span className="flex-1"><span className="block h-3 w-32 rounded bg-white/[.07]" /><span className="mt-2 block h-2.5 w-20 rounded bg-white/[.05]" /></span><span className="h-8 w-20 rounded-lg bg-white/[.06]" /></div>)}</div>}
        {!loading && filtered.map((channel) => {
          const profilePath = channel.type === 'business' ? `/businesses/${channel.id}` : `/creators/${channel.id}`
          const image = channel.type === 'business' && /^https?:|^data:/.test(channel.logo || '') ? channel.logo : channel.avatar
          return <div key={channel.key} className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-white/[.045]">
            <button type="button" onClick={() => navigate(profilePath)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <Avatar src={image} fallback={channel.name} size="md" />
              <span className="min-w-0 flex-1"><strong className="flex items-center gap-1.5 truncate text-xs"><span className="truncate">{channel.username ? `@${String(channel.username).replace(/^@/, '')}` : channel.name}</span>{channel.verified && <CheckCircle2 size={12} className="shrink-0 text-mint" />}</strong><small className="mt-1 block truncate text-[10px] text-white/40">{channel.username ? channel.name : channel.niche || channel.industry || `${channel.type} channel`}</small></span>
            </button>
            <Button size="sm" variant="secondary" className="min-w-[5.5rem] text-[10px] group-hover:bg-white/[.1]" onClick={() => toggleFollowing(channel.key)}><UserCheck size={13} />Following</Button>
          </div>
        })}
        {!loading && !filtered.length && <div className="px-5 py-16 text-center"><strong className="block text-sm">{query ? 'No matching channels' : 'No followed channels yet'}</strong><p className="mt-2 text-xs text-white/35">{query ? 'Try another name or username.' : 'Channels you follow will appear here.'}</p></div>}
      </div>
    </section>
  </main>
}
